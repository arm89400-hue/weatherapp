import type { TemperatureUnit } from "../context/SettingsContext";

// Backend/API values are always Celsius — conversion happens only at display time so nothing
// upstream (ingestion, alerts, storage) needs to know about the user's unit preference.
export function convertTemp(celsius: number, unit: TemperatureUnit): number {
  return unit === "F" ? (celsius * 9) / 5 + 32 : celsius;
}

export function formatTemp(celsius: number | null | undefined, unit: TemperatureUnit): string {
  if (celsius == null) return "—";
  return `${Math.round(convertTemp(celsius, unit))}°`;
}
