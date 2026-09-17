import { CalendarDays } from "lucide-react-native";
import { Text, View } from "react-native";
import type { WeatherForecast } from "../api/weather";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "../i18n/useTranslation";
import { formatTemp } from "../lib/temperature";
import { conditionToIcon } from "./conditionIcon";
import { GlassCard } from "./GlassCard";

// Compares by Bangkok calendar date, not array position — the backend already scopes the
// query to "today onward" in Bangkok time, but trusting index 0 here would silently mislabel
// a day if that ever drifts (as it did before the backend timezone fix).
function isSameBangkokDay(a: Date, b: Date) {
  const fmt = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  return fmt(a) === fmt(b);
}

function formatDay(dateStr: string, locale: string, todayLabel: string) {
  const date = new Date(dateStr);
  if (isSameBangkokDay(date, new Date())) return todayLabel;
  return date.toLocaleDateString(locale, { timeZone: "Asia/Bangkok", month: "short", day: "numeric" });
}

export function ForecastList({ forecasts }: { forecasts: WeatherForecast[] }) {
  const { unit } = useSettings();
  const { t, translateCondition, dateLocale } = useTranslation();

  if (forecasts.length === 0) {
    return (
      <GlassCard className="rounded-3xl p-5">
        <Text className="text-sm text-white/60">{t("forecast.empty")}</Text>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="rounded-3xl p-5">
      <View className="mb-3 flex-row items-center gap-2 opacity-80">
        <CalendarDays size={16} color="white" />
        <Text className="text-sm font-medium text-white">{t("forecast.nextDays", { n: forecasts.length })}</Text>
      </View>
      <View>
        {forecasts.map((f, index) => {
          const Icon = conditionToIcon(f.condition);
          return (
            <View
              key={f.id}
              className={`flex-row items-center justify-between py-3 ${index > 0 ? "border-t border-white/10" : ""}`}
            >
              <Text className="w-20 text-sm font-medium text-white">
                {formatDay(f.forecastDate, dateLocale, t("forecast.today"))}
              </Text>
              <View className="flex-1 items-center">
                <Icon size={24} color="rgba(255,255,255,0.9)" />
                {f.rainChance != null && (
                  <Text className="mt-0.5 text-xs text-sky-300">{Math.round(f.rainChance)}%</Text>
                )}
              </View>
              <Text className="w-28 text-center text-sm text-white/80">{translateCondition(f.condition)}</Text>
              <Text className="w-20 text-right text-sm text-white">
                {formatTemp(f.minTemp, unit)} / {formatTemp(f.maxTemp, unit)}
              </Text>
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
}
