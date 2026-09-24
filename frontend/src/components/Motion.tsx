import { useEffect, useState, type ReactNode } from "react";
import { Pressable, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { enterPage, enterUp, SPRING_SNAPPY } from "../lib/motion";

// Reusable animated wrappers. See lib/motion.ts for the timing rules and the reason none of
// these put `className` on an Animated view.

/** Fades + rises its children into place on mount; `index` staggers siblings. */
export function FadeInView({
  index = 0,
  baseDelay = 0,
  style,
  children,
}: {
  index?: number;
  baseDelay?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <Animated.View entering={enterUp(index, baseDelay)} style={style}>
      {children}
    </Animated.View>
  );
}

/**
 * A Pressable whose content shrinks slightly while held — the standard "I felt that tap" cue.
 * `className` styles the inner content (so backgrounds/rounding scale with it); use
 * `containerClassName` for the outer hit area's layout (e.g. flex-1, self-start).
 */
export function PressableScale({
  className,
  containerClassName,
  scaleTo = 0.96,
  children,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, "children" | "style"> & {
  className?: string;
  containerClassName?: string;
  scaleTo?: number;
  children: ReactNode;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      {...props}
      className={containerClassName}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, SPRING_SNAPPY));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, SPRING_SNAPPY));
        onPressOut?.(e);
      }}
    >
      <Animated.View style={animatedStyle}>
        <View className={className}>{children}</View>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Plays a directional slide whenever `pageKey` changes — for swapping sub-pages inside a sheet
 * (Settings → Notifications). Not on the first page shown, which already gets the sheet's own
 * slide-up. Enter-only on purpose: an exiting page would overlap the entering one inside the
 * sheet's ScrollView and make its height jump.
 */
export function PageTransition({
  pageKey,
  direction,
  children,
}: {
  pageKey: string;
  direction: "forward" | "back";
  children: ReactNode;
}) {
  const [initialKey] = useState(pageKey);
  const [navigated, setNavigated] = useState(false);
  if (pageKey !== initialKey && !navigated) setNavigated(true);

  return (
    <Animated.View key={pageKey} entering={navigated ? enterPage(direction) : undefined}>
      {children}
    </Animated.View>
  );
}

/** Gentle opacity breathing for loading placeholders, so an empty box reads as "loading". */
export function Pulse({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.5, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

// Loading dots: three dots hop one after another, left → right, on repeat until the parent
// unmounts them (i.e. the data arrived). Same period for every dot, offset start — that's what
// makes the wave travel.
const DOT_HOP_MS = 220;
const DOT_STAGGER_MS = 140;
const DOT_REST_MS = 460; // period = 2 × hop + rest = 900ms

function BouncingDot({ index, size, color }: { index: number; size: number; color: string }) {
  const y = useSharedValue(0);

  useEffect(() => {
    y.set(
      withDelay(
        index * DOT_STAGGER_MS,
        withRepeat(
          withSequence(
            withTiming(-size * 1.3, { duration: DOT_HOP_MS, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: DOT_HOP_MS, easing: Easing.in(Easing.quad) }),
            withTiming(0, { duration: DOT_REST_MS }),
          ),
          -1,
        ),
      ),
    );
    return () => cancelAnimation(y);
  }, [index, size, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />
  );
}

export function LoadingDots({ size = 4, color = "rgba(255,255,255,0.6)" }: { size?: number; color?: string }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row", alignItems: "flex-end", gap: size * 0.7, height: size * 2.6 }}
    >
      {[0, 1, 2].map((i) => (
        <BouncingDot key={i} index={i} size={size} color={color} />
      ))}
    </View>
  );
}

/**
 * A loading message whose trailing "..." (as written in translations.ts) is swapped for animated
 * LoadingDots — e.g. "Saving..." → "Saving" + hopping dots. Screen readers still get the full text.
 */
export function LoadingText({
  text,
  className = "",
  dotColor,
  dotSize,
  center,
}: {
  text: string;
  className?: string;
  dotColor?: string;
  dotSize?: number;
  center?: boolean;
}) {
  const label = text.replace(/\s*(\.{3}|…)$/, "");
  return (
    <View
      accessible
      accessibilityLabel={text}
      style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: center ? "center" : "flex-start" }}
    >
      <Text className={className}>{label}</Text>
      <View style={{ marginLeft: 3, marginBottom: (dotSize ?? 4) * 0.9 }}>
        <LoadingDots size={dotSize} color={dotColor} />
      </View>
    </View>
  );
}
