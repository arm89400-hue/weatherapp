// Free of Prisma/IO on purpose so both the ingestion path and the preferences API can share it
// and it's unit-testable without a database.

export type AlertThresholds = {
  maxTempC: number; // alert at or above (°C)
  minTempC: number; // alert at or below (°C)
  rainfallMm: number; // alert at or above (mm)
  alertHeat: boolean;
  alertCold: boolean;
  alertRain: boolean;
  alertThunderstorm: boolean;
};

// Mirrors the AlertPreference column defaults, so a user who never opens the controls gets the
// same behavior weatherAlerts.ts used to hardcode.
export const DEFAULT_THRESHOLDS: AlertThresholds = {
  maxTempC: 40,
  minTempC: 10,
  rainfallMm: 10,
  alertHeat: true,
  alertCold: true,
  alertRain: true,
  alertThunderstorm: true,
};

export type AlertableReading = {
  condition?: string | null;
  temperature?: number | null;
  rainfallMm?: number | null;
};

// Missing fields never trigger — a station with no temperature reading shouldn't read as 0°C
// and fire a cold alert.
export function isAlertWorthy(reading: AlertableReading, thresholds: AlertThresholds): boolean {
  if (reading.condition === "Thunderstorm") return thresholds.alertThunderstorm;
  if (
    thresholds.alertRain &&
    reading.rainfallMm != null &&
    reading.rainfallMm >= thresholds.rainfallMm
  ) {
    return true;
  }
  if (reading.temperature != null) {
    if (thresholds.alertHeat && reading.temperature >= thresholds.maxTempC) return true;
    if (thresholds.alertCold && reading.temperature <= thresholds.minTempC) return true;
  }
  return false;
}

// Lets the app offer three one-tap presets instead of raw °C/mm steppers. "moderate" matches
// DEFAULT_THRESHOLDS so picking it is a no-op for anyone already on the defaults.
export type Sensitivity = "mild" | "moderate" | "strict";

export const SENSITIVITY_PRESETS: Record<
  Sensitivity,
  Pick<AlertThresholds, "maxTempC" | "minTempC" | "rainfallMm">
> = {
  mild: { maxTempC: 42, minTempC: 8, rainfallMm: 20 },
  moderate: { maxTempC: 40, minTempC: 10, rainfallMm: 10 },
  strict: { maxTempC: 37, minTempC: 15, rainfallMm: 5 },
};

export type AlertableForecast = {
  condition?: string | null;
  maxTemp?: number | null;
  minTemp?: number | null;
  /** Percent chance of rain (0-100), not a measured mm amount — forecasts don't give one. */
  rainChance?: number | null;
};

// Forecasts give a rain probability, not an mm reading, so rainfallMm doesn't apply here — a
// fixed "likely enough to mention" bar stands in for it instead, still gated by alertRain.
const FORECAST_RAIN_CHANCE_THRESHOLD = 70;

export function isForecastAlertWorthy(forecast: AlertableForecast, thresholds: AlertThresholds): boolean {
  if (forecast.condition === "Thunderstorm") return thresholds.alertThunderstorm;
  if (
    thresholds.alertRain &&
    forecast.rainChance != null &&
    forecast.rainChance >= FORECAST_RAIN_CHANCE_THRESHOLD
  ) {
    return true;
  }
  if (thresholds.alertHeat && forecast.maxTemp != null && forecast.maxTemp >= thresholds.maxTempC) {
    return true;
  }
  if (thresholds.alertCold && forecast.minTemp != null && forecast.minTemp <= thresholds.minTempC) {
    return true;
  }
  return false;
}
