import { Sun as SunIcon, Sunrise } from "lucide-react-native";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { useTranslation } from "../i18n/useTranslation";
import { EASE_OUT } from "../lib/motion";
import { GlassCard } from "./GlassCard";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const CX = 100;
const CY = 88;
const R = 78;
const ARC_LENGTH = Math.PI * R;
const ARC_PATH = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
// Longer than the app's usual ≤350ms on purpose: this is a one-off data reveal (how far through
// the day we are), not UI feedback, and it plays after the card has already faded in.
const TRAVEL_MS = 1100;
const TRAVEL_DELAY_MS = 350;

function formatTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function SunArc({ sunrise, sunset }: { sunrise: string; sunset: string }) {
  const { t, dateLocale } = useTranslation();
  const sunriseMs = new Date(sunrise).getTime();
  const sunsetMs = new Date(sunset).getTime();
  // Intentionally reads wall-clock time on every render (display-only widget) — known false
  // positive for react-hooks/purity.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const progress = Math.min(1, Math.max(0, (now - sunriseMs) / (sunsetMs - sunriseMs)));
  const isDaytime = now >= sunriseMs && now <= sunsetMs;

  // The sun travels from sunrise to "now" along the arc, drawing the elapsed part of the day
  // behind it.
  const travel = useSharedValue(0);
  useEffect(() => {
    travel.set(withDelay(TRAVEL_DELAY_MS, withTiming(progress, { duration: TRAVEL_MS, easing: EASE_OUT })));
  }, [progress, travel]);

  const sunProps = useAnimatedProps(() => {
    const angle = Math.PI * (1 - travel.value);
    return { cx: CX + R * Math.cos(angle), cy: CY - R * Math.sin(angle) };
  });
  const trailProps = useAnimatedProps(() => ({ strokeDashoffset: ARC_LENGTH * (1 - travel.value) }));

  return (
    <GlassCard className="rounded-3xl p-5">
      <View className="mb-1 flex-row items-center gap-2 opacity-80">
        <Sunrise size={16} color="white" />
        <Text className="text-sm text-white">{t("sun.label")}</Text>
      </View>
      <View style={{ aspectRatio: 2, width: "100%" }}>
        <Svg viewBox="0 0 200 100" width="100%" height="100%">
          <Path d={ARC_PATH} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeDasharray="4 5" />
          <Line x1={CX - R - 8} y1={CY} x2={CX + R + 8} y2={CY} stroke="rgba(255,255,255,0.25)" />
          {isDaytime && (
            <>
              <AnimatedPath
                d={ARC_PATH}
                fill="none"
                stroke="#facc15"
                strokeOpacity={0.7}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={`${ARC_LENGTH} ${ARC_LENGTH}`}
                animatedProps={trailProps}
              />
              <AnimatedCircle r={13} fill="#facc15" fillOpacity={0.2} animatedProps={sunProps} />
              <AnimatedCircle r={7} fill="#facc15" stroke="#fff" strokeWidth={1.5} animatedProps={sunProps} />
            </>
          )}
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
