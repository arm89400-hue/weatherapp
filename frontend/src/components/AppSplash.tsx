import { useEffect } from "react";
import { Image, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "../i18n/useTranslation";
import { DURATION, EASE_OUT } from "../lib/motion";
import { LoadingText } from "./Motion";

const FLOAT_PX = 8;
const FLOAT_MS = 1300;

// Shown while the app opens — until saved settings are read and the first weather data is in
// (see `booted` in DashboardScreen). The icon drifts up and down like a cloud; it's a loading
// indicator, so looping is the point. Fades out into the dashboard's own staggered entrance.
export function AppSplash() {
  const { t } = useTranslation();
  const lift = useSharedValue(0);

  useEffect(() => {
    const ease = Easing.inOut(Easing.sin);
    lift.set(
      withRepeat(
        withSequence(
          withTiming(-FLOAT_PX, { duration: FLOAT_MS, easing: ease }),
          withTiming(0, { duration: FLOAT_MS, easing: ease }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(lift);
  }, [lift]);

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  // The shadow shrinks as the icon rises, which sells the "floating" without extra motion.
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + (lift.value / FLOAT_PX) * 0.15,
    transform: [{ scaleX: 1 + (lift.value / FLOAT_PX) * 0.2 }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(DURATION.base).easing(EASE_OUT)}
      exiting={FadeOut.duration(DURATION.base)}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View style={floatStyle}>
        <Image
          source={require("../../assets/images/weather-icon.png")}
          style={{ width: 128, height: 128 }}
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
      <Animated.View
        style={[{ width: 64, height: 8, borderRadius: 4, backgroundColor: "black", marginTop: -6 }, shadowStyle]}
      />
      <View style={{ marginTop: 20 }}>
        <LoadingText center text={t("splash.loading")} className="text-sm font-medium text-white/70" />
      </View>
    </Animated.View>
  );
}
