import { Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import type { CurrentWeatherResponse, WeatherForecast } from "../api/weather";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "../i18n/useTranslation";
import { DURATION, EASE_OUT } from "../lib/motion";
import { formatTemp } from "../lib/temperature";
import { conditionToIcon } from "./conditionIcon";
import { Pulse } from "./Motion";

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
        <Pulse>
          <View className="h-24 w-40 rounded-2xl bg-white/10" />
        </Pulse>
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

  // Fades in each time real data replaces the loading placeholder (first load, or switching
  // location), so the swap doesn't read as a hard cut.
  return (
    <Animated.View entering={FadeIn.duration(DURATION.slow).easing(EASE_OUT)}>
      <View className="px-5 pb-6 pt-8">
        <View className="flex-row items-center justify-center gap-3">
          {/* conditionToIcon picks from a fixed set of existing icons — known false positive for
            react-hooks/static-components. */}
          {/* eslint-disable-next-line react-hooks/static-components */}
          <Icon size={48} color="rgba(255,255,255,0.9)" />
          <Text className="text-8xl font-light text-white">{formatTemp(reading.temperature, unit)}</Text>
        </View>

        <Text className="mt-3 text-center text-2xl font-medium text-white">
          {translateCondition(reading.condition)}
          {minMax && <Text className="text-xl text-white/80"> {minMax}</Text>}
        </Text>

        {windParts.length > 0 && (
          <Text className="mt-1.5 text-center text-sm text-white/60">{windParts.join(", ")}</Text>
        )}
      </View>
    </Animated.View>
  );
}
