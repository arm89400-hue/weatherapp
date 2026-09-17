import { Text, View } from "react-native";
import type { CurrentWeatherResponse, WeatherForecast } from "../api/weather";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "../i18n/useTranslation";
import { formatTemp } from "../lib/temperature";
import { conditionToIcon } from "./conditionIcon";

type Props = {
  data: CurrentWeatherResponse | undefined;
  todayForecast: WeatherForecast | undefined;
  isLoading: boolean;
};

export function WeatherHero({ data, todayForecast, isLoading }: Props) {
  const { unit } = useSettings();
  const { t, translateCondition } = useTranslation();
  const reading = data?.reading;
  const Icon = conditionToIcon(reading?.condition);

  if (isLoading) {
    return (
      <View className="items-center px-5 pb-6 pt-10">
        <View className="h-24 w-40 rounded-2xl bg-white/10" />
      </View>
    );
  }

  if (reading?.temperature == null) {
    return (
      <View className="px-5 pb-6 pt-10">
        <Text className="text-center text-sm text-white/60">{t("hero.noReading")}</Text>
      </View>
    );
  }

  const minMax =
    todayForecast?.minTemp != null && todayForecast?.maxTemp != null
      ? `${formatTemp(todayForecast.minTemp, unit)}/${formatTemp(todayForecast.maxTemp, unit)}`
      : null;

  const windParts = [
    data?.wind?.directionLabel ? `${data.wind.directionLabel} wind` : null,
    data?.wind?.scale != null ? `scale ${data.wind.scale}` : null,
  ].filter(Boolean);

  return (
    <View className="px-5 pb-6 pt-8">
      <View className="flex-row items-center justify-center gap-3">
        {/* conditionToIcon always returns one of a fixed set of already-defined icon
         * components, never a genuinely new one — react-hooks/static-components can't tell
         * that apart from actually creating a component during render, so this is a known
         * false positive for the "pick an icon by condition string" pattern. */}
        {/* eslint-disable-next-line react-hooks/static-components */}
        <Icon size={48} color="rgba(255,255,255,0.9)" />
        <Text className="text-8xl font-light text-white">{formatTemp(reading.temperature, unit)}</Text>
      </View>

      <Text className="mt-3 text-center text-base font-medium text-white">
        {translateCondition(reading.condition)}
        {minMax && <Text className="text-white/80"> {minMax}</Text>}
      </Text>

      {(reading.feelsLike != null || windParts.length > 0) && (
        <Text className="mt-1 text-center text-sm text-white/60">
          {reading.feelsLike != null && t("hero.feelsLike", { temp: formatTemp(reading.feelsLike, unit) })}
          {reading.feelsLike != null && windParts.length > 0 && "  "}
          {windParts.join(", ")}
        </Text>
      )}
    </View>
  );
}
