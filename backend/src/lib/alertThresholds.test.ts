import { describe, expect, it } from "vitest";
import {
  DEFAULT_THRESHOLDS,
  isAlertWorthy,
  isForecastAlertWorthy,
  SENSITIVITY_PRESETS,
  type AlertThresholds,
} from "./alertThresholds.js";

const custom: AlertThresholds = {
  maxTempC: 35,
  minTempC: 18,
  rainfallMm: 4,
  alertHeat: true,
  alertCold: true,
  alertRain: true,
  alertThunderstorm: true,
};

describe("isAlertWorthy", () => {
  it("always alerts on thunderstorms regardless of thresholds", () => {
    expect(isAlertWorthy({ condition: "Thunderstorm", temperature: 25 }, DEFAULT_THRESHOLDS)).toBe(true);
    expect(isAlertWorthy({ condition: "Thunderstorm" }, { ...custom, maxTempC: 55, minTempC: -10, rainfallMm: 100 })).toBe(
      true
    );
  });

  it("ignores calm readings", () => {
    expect(isAlertWorthy({ condition: "Clear", temperature: 28, rainfallMm: 0 }, DEFAULT_THRESHOLDS)).toBe(false);
  });

  it("treats thresholds as inclusive at the boundary", () => {
    expect(isAlertWorthy({ temperature: 40 }, DEFAULT_THRESHOLDS)).toBe(true);
    expect(isAlertWorthy({ temperature: 10 }, DEFAULT_THRESHOLDS)).toBe(true);
    expect(isAlertWorthy({ rainfallMm: 10 }, DEFAULT_THRESHOLDS)).toBe(true);
    expect(isAlertWorthy({ temperature: 39.9 }, DEFAULT_THRESHOLDS)).toBe(false);
    expect(isAlertWorthy({ temperature: 10.1 }, DEFAULT_THRESHOLDS)).toBe(false);
    expect(isAlertWorthy({ rainfallMm: 9.9 }, DEFAULT_THRESHOLDS)).toBe(false);
  });

  it("honours a stricter user's thresholds where the defaults would stay quiet", () => {
    const reading = { condition: "Raining", temperature: 36, rainfallMm: 5 };
    expect(isAlertWorthy(reading, DEFAULT_THRESHOLDS)).toBe(false);
    expect(isAlertWorthy(reading, custom)).toBe(true);
  });

  it("honours a more relaxed user's thresholds where the defaults would alert", () => {
    const relaxed: AlertThresholds = { ...custom, maxTempC: 50, minTempC: 0, rainfallMm: 50 };
    expect(isAlertWorthy({ temperature: 41 }, DEFAULT_THRESHOLDS)).toBe(true);
    expect(isAlertWorthy({ temperature: 41 }, relaxed)).toBe(false);
  });

  it("does not read missing fields as zero", () => {
    expect(isAlertWorthy({ condition: "Clear" }, DEFAULT_THRESHOLDS)).toBe(false);
    expect(isAlertWorthy({ temperature: null, rainfallMm: null }, DEFAULT_THRESHOLDS)).toBe(false);
  });

  it("alerts on cold for a user who raised the cold threshold", () => {
    expect(isAlertWorthy({ temperature: 17 }, DEFAULT_THRESHOLDS)).toBe(false);
    expect(isAlertWorthy({ temperature: 17 }, custom)).toBe(true); // minTempC 18
  });

  it("respects each condition's toggle independently of its threshold", () => {
    expect(isAlertWorthy({ condition: "Thunderstorm" }, { ...custom, alertThunderstorm: false })).toBe(
      false
    );
    expect(isAlertWorthy({ rainfallMm: 10 }, { ...custom, alertRain: false })).toBe(false);
    expect(isAlertWorthy({ temperature: 45 }, { ...custom, alertHeat: false })).toBe(false);
    expect(isAlertWorthy({ temperature: -5 }, { ...custom, alertCold: false })).toBe(false);
  });

  it("still checks other enabled conditions when one is toggled off", () => {
    const heatOff = { ...custom, alertHeat: false };
    expect(isAlertWorthy({ temperature: 45 }, heatOff)).toBe(false);
    expect(isAlertWorthy({ temperature: -5 }, heatOff)).toBe(true); // cold still on
    expect(isAlertWorthy({ rainfallMm: 10 }, heatOff)).toBe(true); // rain still on
  });
});

describe("SENSITIVITY_PRESETS", () => {
  it("keeps moderate identical to DEFAULT_THRESHOLDS so picking it never changes a default user", () => {
    expect(SENSITIVITY_PRESETS.moderate).toEqual({
      maxTempC: DEFAULT_THRESHOLDS.maxTempC,
      minTempC: DEFAULT_THRESHOLDS.minTempC,
      rainfallMm: DEFAULT_THRESHOLDS.rainfallMm,
    });
  });

  it("orders mild < moderate < strict on every axis", () => {
    const { mild, moderate, strict } = SENSITIVITY_PRESETS;
    expect(mild.maxTempC).toBeGreaterThan(moderate.maxTempC);
    expect(moderate.maxTempC).toBeGreaterThan(strict.maxTempC);
    expect(mild.minTempC).toBeLessThan(moderate.minTempC);
    expect(moderate.minTempC).toBeLessThan(strict.minTempC);
    expect(mild.rainfallMm).toBeGreaterThan(moderate.rainfallMm);
    expect(moderate.rainfallMm).toBeGreaterThan(strict.rainfallMm);
  });
});

describe("isForecastAlertWorthy", () => {
  it("always alerts on a thunderstorm forecast when the toggle is on", () => {
    expect(isForecastAlertWorthy({ condition: "Thunderstorm" }, DEFAULT_THRESHOLDS)).toBe(true);
    expect(isForecastAlertWorthy({ condition: "Thunderstorm" }, { ...custom, alertThunderstorm: false })).toBe(
      false
    );
  });

  it("alerts on a high rain chance but not a low one", () => {
    expect(isForecastAlertWorthy({ rainChance: 70 }, DEFAULT_THRESHOLDS)).toBe(true);
    expect(isForecastAlertWorthy({ rainChance: 69 }, DEFAULT_THRESHOLDS)).toBe(false);
  });

  it("compares forecast min/max temps against the same thresholds as live readings", () => {
    expect(isForecastAlertWorthy({ maxTemp: 41 }, DEFAULT_THRESHOLDS)).toBe(true);
    expect(isForecastAlertWorthy({ maxTemp: 39 }, DEFAULT_THRESHOLDS)).toBe(false);
    expect(isForecastAlertWorthy({ minTemp: 9 }, DEFAULT_THRESHOLDS)).toBe(true);
    expect(isForecastAlertWorthy({ minTemp: 11 }, DEFAULT_THRESHOLDS)).toBe(false);
  });

  it("respects the rain toggle independently of the temperature toggles", () => {
    expect(isForecastAlertWorthy({ rainChance: 90 }, { ...custom, alertRain: false })).toBe(false);
  });

  it("does not read missing fields as zero", () => {
    expect(isForecastAlertWorthy({ condition: "Clear" }, DEFAULT_THRESHOLDS)).toBe(false);
    expect(isForecastAlertWorthy({ maxTemp: null, minTemp: null, rainChance: null }, DEFAULT_THRESHOLDS)).toBe(
      false
    );
  });
});
