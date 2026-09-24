import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as Localization from "expo-localization";

export type TemperatureUnit = "C" | "F";
export type Language = "en" | "th";

type SettingsContextValue = {
  unit: TemperatureUnit;
  setUnit: (unit: TemperatureUnit) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  updateOnMobileData: boolean;
  setUpdateOnMobileData: (value: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

const KEYS = {
  unit: "weather:unit",
  language: "weather:language",
  updateOnMobileData: "weather:updateOnMobileData",
} as const;

function detectDefaultLanguage(): Language {
  return Localization.getLocales()[0]?.languageCode === "th" ? "th" : "en";
}

// Stored on-device only, no account needed. AsyncStorage is async, so state starts at a default
// and gets replaced once loaded; writes wait for `hydrated` so they can't clobber a stored value
// with the default before it's been read.
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<TemperatureUnit>("C");
  const [language, setLanguageState] = useState<Language>(detectDefaultLanguage);
  const [updateOnMobileData, setUpdateOnMobileDataState] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      const entries = await AsyncStorage.multiGet([KEYS.unit, KEYS.language, KEYS.updateOnMobileData]);
      const stored = Object.fromEntries(entries);
      if (stored[KEYS.unit]) setUnitState(stored[KEYS.unit] as TemperatureUnit);
      if (stored[KEYS.language]) setLanguageState(stored[KEYS.language] as Language);
      if (stored[KEYS.updateOnMobileData] != null) {
        setUpdateOnMobileDataState(stored[KEYS.updateOnMobileData] === "true");
      }
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(KEYS.unit, unit);
  }, [unit, hydrated]);
  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(KEYS.language, language);
  }, [language, hydrated]);
  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(KEYS.updateOnMobileData, String(updateOnMobileData));
  }, [updateOnMobileData, hydrated]);

  return (
    <SettingsContext.Provider
      value={{
        unit,
        setUnit: setUnitState,
        language,
        setLanguage: setLanguageState,
        updateOnMobileData,
        setUpdateOnMobileData: setUpdateOnMobileDataState,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
