import { Sun as SunIcon, Sunrise } from "lucide-react-native";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { useTranslation } from "../i18n/useTranslation";
import { GlassCard } from "./GlassCard";

function formatTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function SunArc({ sunrise, sunset }: { sunrise: string; sunset: string }) {
  const { t, dateLocale } = useTranslation();
  const sunriseMs = new Date(sunrise).getTime();
  const sunsetMs = new Date(sunset).getTime();
  // React's purity lint flags any Date.now() call during render (wrapping it in useMemo
  // doesn't satisfy it either, since the factory still runs during render) — this widget is
  // display-only and intentionally reflects wall-clock time whenever it renders, same as the
  // original web version, so the check is a known false positive here.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const progress = Math.min(1, Math.max(0, (now - sunriseMs) / (sunsetMs - sunriseMs)));
  const isDaytime = now >= sunriseMs && now <= sunsetMs;
  const cx = 100,
    cy = 88,
    r = 78;
  const angle = Math.PI * (1 - progress);
  const sunX = cx + r * Math.cos(angle);
  const sunY = cy - r * Math.sin(angle);

  return (
    <GlassCard className="rounded-3xl p-5">
      <View className="mb-1 flex-row items-center gap-2 opacity-80">
        <Sunrise size={16} color="white" />
        <Text className="text-sm text-white">{t("sun.label")}</Text>
      </View>
      <View style={{ aspectRatio: 2, width: "100%" }}>
        <Svg viewBox="0 0 200 100" width="100%" height="100%">
          <Path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={2}
            strokeDasharray="4 5"
          />
          <Line x1={cx - r - 8} y1={cy} x2={cx + r + 8} y2={cy} stroke="rgba(255,255,255,0.25)" />
          {isDaytime && <Circle cx={sunX} cy={sunY} r={7} fill="#facc15" stroke="#fff" strokeWidth={1.5} />}
        </Svg>
      </View>
      <View className="flex-row justify-between">
        <View>
          <Text className="text-sm font-semibold text-white">{formatTime(sunrise, dateLocale)}</Text>
          <Text className="text-xs text-white/60">{t("sun.am")}</Text>
        </View>
        <SunIcon size={20} color="rgba(255,255,255,0.7)" />
        <View className="items-end">
          <Text className="text-sm font-semibold text-white">{formatTime(sunset, dateLocale)}</Text>
          <Text className="text-xs text-white/60">{t("sun.pm")}</Text>
        </View>
      </View>
    </GlassCard>
  );
}
