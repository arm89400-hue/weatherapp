import { apiClient } from "./client";

// Always Celsius/mm on the wire — unit conversion happens at display time (lib/temperature.ts).
export type AlertThresholds = {
  maxTempC: number;
  minTempC: number;
  rainfallMm: number;
  alertHeat: boolean;
  alertCold: boolean;
  alertRain: boolean;
  alertThunderstorm: boolean;
};

export type Sensitivity = "mild" | "moderate" | "strict";

// Mirrors backend/src/lib/alertThresholds.ts's SENSITIVITY_PRESETS — keep the two in sync.
export const SENSITIVITY_PRESETS: Record<Sensitivity, Pick<AlertThresholds, "maxTempC" | "minTempC" | "rainfallMm">> = {
  mild: { maxTempC: 42, minTempC: 8, rainfallMm: 20 },
  moderate: { maxTempC: 40, minTempC: 10, rainfallMm: 10 },
  strict: { maxTempC: 37, minTempC: 15, rainfallMm: 5 },
};

export async function fetchAlertPreferences() {
  const res = await apiClient.get<AlertThresholds>("/alert-preferences");
  return res.data;
}

export async function updateAlertPreferences(thresholds: AlertThresholds) {
  const res = await apiClient.put<AlertThresholds>("/alert-preferences", thresholds);
  return res.data;
}

export async function resetAlertPreferences() {
  const res = await apiClient.delete<AlertThresholds>("/alert-preferences");
  return res.data;
}
