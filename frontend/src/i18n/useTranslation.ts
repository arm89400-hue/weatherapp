import { useSettings } from "../context/SettingsContext";
import { translations, type TranslationKey } from "./translations";

// Maps the backend's condition strings (see wmoToCondition in openMeteoClient.ts) to a
// translation key, falling back to the raw string for anything unrecognized.
const CONDITION_KEY_MAP: Record<string, TranslationKey> = {
  Clear: "condition.clear",
  "Partly Cloudy": "condition.partlyCloudy",
  Overcast: "condition.overcast",
  Fog: "condition.fog",
  Drizzling: "condition.drizzling",
  Raining: "condition.raining",
  Snow: "condition.snow",
  "Rain Showers": "condition.rainShowers",
  "Snow Showers": "condition.snowShowers",
  Thunderstorm: "condition.thunderstorm",
};

const REGION_KEY_MAP: Record<string, TranslationKey> = {
  Northern: "region.northern",
  Central: "region.central",
  Northeastern: "region.northeastern",
  Western: "region.western",
  Eastern: "region.eastern",
  Southern: "region.southern",
};

export function useTranslation() {
  const { language } = useSettings();
  const dict = translations[language];

  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    let str: string = dict[key] ?? translations.en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  }

  function translateCondition(condition?: string | null): string {
    if (!condition) return t("common.dash");
    const key = CONDITION_KEY_MAP[condition];
    return key ? t(key) : condition;
  }

  function translateRegion(region?: string | null): string | null {
    if (!region) return null;
    const key = REGION_KEY_MAP[region];
    return key ? t(key) : region;
  }

  // "en-US" keeps Gregorian months in English; "th-TH" gives Thai month names via Intl.
  const dateLocale = language === "th" ? "th-TH" : "en-US";

  return { t, translateCondition, translateRegion, language, dateLocale };
}
