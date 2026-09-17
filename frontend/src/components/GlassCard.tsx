import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

type Props = ViewProps & { className?: string; children?: ReactNode };

/** Replaces the old web app's `.glass-card` CSS class (background + border +
 * backdrop-filter: blur(20px)) — RN has no backdrop-filter, so this composites an
 * `expo-blur` BlurView behind plain content instead. BlurView is styled via `style`, not
 * `className`, since it isn't a core RN component NativeWind auto-registers for class interop.
 *
 * Android's blur renders far weaker than iOS's (varies by device/GPU), which on a real device
 * let scrolled-behind content show through strongly enough to collide with the card's own
 * text. The dark tint layer below guarantees legible contrast on its own regardless of how
 * well the blur renders — the blur is a bonus texture on top of that, not the only thing
 * darkening the content behind it. */
export function GlassCard({ className = "", children, style, ...props }: Props) {
  return (
    <View className={`overflow-hidden border border-glass-border ${className}`} style={style} {...props}>
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(30, 38, 53, 0.8)" }]} />
      <View>{children}</View>
    </View>
  );
}
