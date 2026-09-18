import { apiClient } from "./client";

export type Station = {
  id: string;
  tmdStationId: string;
  nameTh: string;
  nameEn: string;
  lat: number;
  lng: number;
  provinceId: string | null;
  districtId: string | null;
};

export type WeatherReading = {
  id: string;
  stationId: string;
  observedAt: string;
  temperature: number | null;
  feelsLike: number | null;
  humidity: number | null;
  rainfallMm: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  pressure: number | null;
  condition: string | null;
  uvIndex: number | null;
  airQualityIndex: number | null;
};

export type WeatherForecast = {
  id: string;
  stationId: string;
  forecastDate: string;
  minTemp: number | null;
  maxTemp: number | null;
  condition: string | null;
  rainChance: number | null;
};

export type CurrentWeatherResponse = {
  station: Station;
  reading: WeatherReading | null;
  sun: { sunrise: string; sunset: string };
  wind: { directionLabel?: string; scale?: number } | null;
};

export type ForecastResponse = {
  station: Station;
  forecasts: WeatherForecast[];
};

type LocationParams = { provinceId?: string; districtId?: string };

export async function fetchCurrentWeather(params: LocationParams) {
  const res = await apiClient.get<CurrentWeatherResponse>("/weather/current", { params });
  return res.data;
}

export async function fetchForecast(params: LocationParams) {
  const res = await apiClient.get<ForecastResponse>("/weather/forecast", { params });
  return res.data;
}

export async function fetchHistory(stationId: string, from?: Date, to?: Date) {
  const res = await apiClient.get<WeatherReading[]>("/weather/history", {
    params: { stationId, from: from?.toISOString(), to: to?.toISOString() },
  });
  return res.data;
}

export type BatchWeatherResult = {
  provinceId: string;
  districtId: string | null;
  temperature: number | null;
  condition: string | null;
  minTemp: number | null;
  maxTemp: number | null;
};

export async function fetchBatchCurrentWeather(locations: { provinceId: string; districtId?: string | null }[]) {
  const res = await apiClient.post<BatchWeatherResult[]>("/weather/batch", { locations });
  return res.data;
}
