import { Easing, FadeInDown, FadeInLeft, FadeInRight } from "react-native-reanimated";

// One place for the app's motion language, so every animation shares the same feel.
//
// Rules this follows (Apple HIG "Motion" + Material motion guidance):
//  - Every animation has a job: feedback on touch, showing a state change, or showing where
//    you navigated. Nothing moves just for decoration; the only loops are loading indicators
//    (AppSplash, LoadingDots, Pulse), and they stop the moment the data arrives.
//  - Short: 150–350ms. Entering content eases *out* (fast start, gentle stop).
//  - Things the user directly manipulates (switches, segmented pickers, presses) use springs,
//    so they feel physical and can be interrupted mid-flight.
//  - Only transform + opacity are animated — cheap on the UI thread, no layout thrash.
//  - Reanimated defaults to ReduceMotion.System, so users with "Reduce motion" on get instant
//    changes everywhere with no extra code.
//
// NativeWind gotcha: never put `className` on a Reanimated `Animated.*` view — NativeWind v4's
// css-interop and Reanimated fight over the style object (classes silently dropped, or a
// "frozen object" crash with transforms). Animated views take `style` only; wrap a normal
// className'd View inside them instead.

export const DURATION = {
  fast: 160,
  base: 240,
  slow: 350,
} as const;

export const EASE_OUT = Easing.out(Easing.cubic);
export const EASE_IN = Easing.in(Easing.cubic);

/** Snappy, barely-overshooting spring for switches, pills and press feedback. */
export const SPRING_SNAPPY = { damping: 18, stiffness: 260, mass: 0.8 } as const;

/** Gap between items in a staggered entrance. Capped so long lists don't take forever. */
const STAGGER_MS = 55;
const MAX_STAGGER_STEPS = 6;

export function staggerDelay(index: number, baseDelay = 0) {
  return baseDelay + Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS;
}

/** Fade + short rise, used for sections and cards appearing on screen. */
export function enterUp(index = 0, baseDelay = 0) {
  return FadeInDown.duration(DURATION.slow).easing(EASE_OUT).delay(staggerDelay(index, baseDelay));
}

/** Sub-page transition inside a sheet: forward pages come from the right, going back from the left. */
export function enterPage(direction: "forward" | "back") {
  const base = direction === "forward" ? FadeInRight : FadeInLeft;
  return base.duration(DURATION.base).easing(EASE_OUT);
}
