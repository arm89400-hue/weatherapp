// Open-Meteo (https://open-meteo.com) — free, no-API-key weather API, used as the live data
// source today. TMD (tmdClient.ts) stays wired up for whenever a TMD key is available; both
// write into the same tables so the rest of the app doesn't care which one produced the data.

const BASE_URL = "https://api.open-meteo.com/v1/forecast";
const BANGKOK_OFFSET = "+07:00"; // Thailand doesn't observe DST, so this is always correct.

const CURRENT_FIELDS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation",
  "weather_code",
  "wind_speed_10m",
  "wind_direction_10m",
  "surface_pressure",
  "uv_index",
].join(",");

const DAILY_FIELDS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_probability_max",
].join(",");

export type OpenMeteoLocation = { lat: number; lng: number };

export type OpenMeteoCurrent = {
  observedAt: Date;
  temperature?: number;
  humidity?: number;
  feelsLike?: number;
  rainfallMm?: number;
  weatherCode?: number;
  windSpeed?: number;
  windDirection?: number;
  pressure?: number;
  uvIndex?: number;
  raw: unknown;
};

export type OpenMeteoDay = {
  date: Date;
  weatherCode?: number;
  minTemp?: number;
  maxTemp?: number;
  rainChance?: number;
  raw: unknown;
};

export type OpenMeteoResult = { current: OpenMeteoCurrent; daily: OpenMeteoDay[] };

type RawResponse = {
  current?: Record<string, number | string>;
  daily?: { time: string[] } & Record<string, number[]>;
};

// Accepts comma-separated lat/lon lists, returns one result per location in the same order.
// Callers should chunk to a reasonable batch size to keep URLs from growing unwieldy.
export async function fetchOpenMeteoBatch(locations: OpenMeteoLocation[]): Promise<OpenMeteoResult[]> {
  if (locations.length === 0) return [];

  const url = new URL(BASE_URL);
  url.searchParams.set("latitude", locations.map((l) => l.lat).join(","));
  url.searchParams.set("longitude", locations.map((l) => l.lng).join(","));
  url.searchParams.set("current", CURRENT_FIELDS);
  url.searchParams.set("daily", DAILY_FIELDS);
  url.searchParams.set("timezone", "Asia/Bangkok");
  url.searchParams.set("forecast_days", "7");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo request failed: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as RawResponse | RawResponse[];
  const results = Array.isArray(body) ? body : [body];

  return results.map((r) => ({
    current: parseCurrent(r.current ?? {}),
    daily: parseDaily(r.daily),
  }));
}

function parseCurrent(current: Record<string, number | string>): OpenMeteoCurrent {
  return {
    observedAt: current.time ? new Date(`${current.time}${BANGKOK_OFFSET}`) : new Date(),
    temperature: numberOrUndefined(current.temperature_2m),
    humidity: numberOrUndefined(current.relative_humidity_2m),
    feelsLike: numberOrUndefined(current.apparent_temperature),
    rainfallMm: numberOrUndefined(current.precipitation),
    weatherCode: numberOrUndefined(current.weather_code),
    windSpeed: numberOrUndefined(current.wind_speed_10m),
    windDirection: numberOrUndefined(current.wind_direction_10m),
    pressure: numberOrUndefined(current.surface_pressure),
    uvIndex: numberOrUndefined(current.uv_index),
    raw: current,
  };
}

function parseDaily(daily: RawResponse["daily"]): OpenMeteoDay[] {
  if (!daily?.time) return [];

  return daily.time.map((dateStr, i) => ({
    date: new Date(`${dateStr}T00:00:00${BANGKOK_OFFSET}`),
    weatherCode: numberOrUndefined(daily.weather_code?.[i]),
    minTemp: numberOrUndefined(daily.temperature_2m_min?.[i]),
    maxTemp: numberOrUndefined(daily.temperature_2m_max?.[i]),
    rainChance: numberOrUndefined(daily.precipitation_probability_max?.[i]),
    raw: {
      date: dateStr,
      weatherCode: daily.weather_code?.[i],
      minTemp: daily.temperature_2m_min?.[i],
      maxTemp: daily.temperature_2m_max?.[i],
      rainChance: daily.precipitation_probability_max?.[i],
    },
  }));
}

function numberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

// WMO weather codes mapped to short condition text, chosen to match frontend/src/components/conditionIcon.tsx.
export function wmoToCondition(code?: number): string | undefined {
  if (code === undefined) return undefined;
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzling";
  if (code >= 61 && code <= 67) return "Raining";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain Showers";
  if (code >= 85 && code <= 86) return "Snow Showers";
  if (code >= 95) return "Thunderstorm";
  return undefined;
}
