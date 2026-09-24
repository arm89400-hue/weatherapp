import { XMLParser } from "fast-xml-parser";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

// Thin client over the TMD open data XML API (data.tmd.go.th/api).
// IMPORTANT: XML tag names below are unverified (no API key while writing this) — `raw` keeps
// the full payload, so once credentials exist, log it and fix the mapping if tags differ.

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function requireCredentials() {
  if (!env.TMD_API_UID || !env.TMD_API_UKEY) {
    throw new Error(
      "TMD_API_UID / TMD_API_UKEY are not set. Register at https://data.tmd.go.th to obtain them."
    );
  }
  return { uid: env.TMD_API_UID, ukey: env.TMD_API_UKEY };
}

async function fetchTmdXml(path: string, params: Record<string, string> = {}) {
  const { uid, ukey } = requireCredentials();
  const url = new URL(`${env.TMD_API_BASE_URL}/${path}`);
  url.searchParams.set("uid", uid);
  url.searchParams.set("ukey", ukey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TMD API request failed: ${res.status} ${res.statusText} (${path})`);
  }

  const xml = await res.text();
  return parser.parse(xml);
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export type TmdStation = {
  tmdStationId: string;
  nameTh: string;
  nameEn: string;
  lat: number;
  lng: number;
  province: string;
};

export async function fetchStations(): Promise<TmdStation[]> {
  const parsed = await fetchTmdXml("Station/v1/");
  const rows = asArray<any>(parsed?.Data?.Station);
  if (rows.length === 0) {
    logger.warn({ parsed }, "fetchStations: no stations parsed, verify TMD XML shape");
  }

  return rows.map((row) => ({
    tmdStationId: String(row.WMOStationNumber ?? row.StationNumber ?? row.id),
    nameTh: String(row.StationNameThai ?? row.NameThai ?? ""),
    nameEn: String(row.StationNameEnglish ?? row.NameEnglish ?? ""),
    lat: Number(row.Latitude ?? row.Lat),
    lng: Number(row.Longitude ?? row.Lng),
    province: String(row.Province ?? ""),
  }));
}

export type TmdCurrentReading = {
  tmdStationId: string;
  observedAt: Date;
  temperature?: number;
  humidity?: number;
  rainfallMm?: number;
  windSpeed?: number;
  windDirection?: number;
  pressure?: number;
  condition?: string;
  raw: unknown;
};

export async function fetchCurrentWeather(): Promise<TmdCurrentReading[]> {
  const parsed = await fetchTmdXml("WeatherToday/V2/");
  const rows = asArray<any>(parsed?.Data?.Station);
  if (rows.length === 0) {
    logger.warn({ parsed }, "fetchCurrentWeather: no readings parsed, verify TMD XML shape");
  }

  return rows.map((row) => {
    const obs = row.Observation ?? row;
    return {
      tmdStationId: String(row.WMOStationNumber ?? row.StationNumber ?? row.id),
      observedAt: new Date(obs.DateTime ?? obs.ObsTime ?? Date.now()),
      temperature: numberOrUndefined(obs.Temperature),
      humidity: numberOrUndefined(obs.RelativeHumidity ?? obs.Humidity),
      rainfallMm: numberOrUndefined(obs.Rainfall),
      windSpeed: numberOrUndefined(obs.WindSpeed),
      windDirection: numberOrUndefined(obs.WindDirection),
      pressure: numberOrUndefined(obs.Pressure ?? obs.StationPressure),
      condition: obs.CloudAmount ?? obs.Condition ?? undefined,
      raw: row,
    };
  });
}

export type TmdForecastDay = {
  tmdStationId: string;
  forecastDate: Date;
  minTemp?: number;
  maxTemp?: number;
  condition?: string;
  rainChance?: number;
  raw: unknown;
};

export async function fetchSevenDayForecast(): Promise<TmdForecastDay[]> {
  const parsed = await fetchTmdXml("WeatherForecast7Days/V2/");
  const stations = asArray<any>(parsed?.Data?.Forecasts?.Station ?? parsed?.Data?.Station);
  if (stations.length === 0) {
    logger.warn({ parsed }, "fetchSevenDayForecast: no forecasts parsed, verify TMD XML shape");
  }

  const result: TmdForecastDay[] = [];
  for (const station of stations) {
    const stationId = String(station.WMOStationNumber ?? station.StationNumber ?? station.id);
    const days = asArray<any>(station.Forecasts?.Forecast ?? station.Forecast);
    for (const day of days) {
      result.push({
        tmdStationId: stationId,
        forecastDate: new Date(day.Date ?? day.ForecastDate),
        minTemp: numberOrUndefined(day.MinTemperature ?? day.MinTemp),
        maxTemp: numberOrUndefined(day.MaxTemperature ?? day.MaxTemp),
        condition: day.Weather ?? day.Condition ?? undefined,
        rainChance: numberOrUndefined(day.RainfallProbability ?? day.PoP),
        raw: day,
      });
    }
  }
  return result;
}

function numberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}
