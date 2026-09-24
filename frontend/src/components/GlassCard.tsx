import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

type Props = ViewProps & { className?: string; contentClassName?: string; children?: ReactNode };

// expo-blur BlurView behind a dark tint layer, since RN has no backdrop-filter. The tint alone
// guarantees legible contrast — Android's blur is much weaker than iOS's and can't be relied on
// by itself. BlurView takes `style`, not `className` (not a core RN component NativeWind hooks).
//
// `className` sizes/shapes the outer view (rounding, border, padding). It does NOT reach
// `children` — RN views default to column layout regardless of the ancestor's flex-direction, so
// use `contentClassName` for anything that arranges the children (flex-row, items-center, etc).
export function GlassCard({ className = "", contentClassName = "", children, style, ...props }: Props) {
  return (
    <View className={`overflow-hidden border border-glass-border ${className}`} style={style} {...props}>
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(30, 38, 53, 0.8)" }]} />
      <View className={contentClassName}>{children}</View>
    </View>
  );
}
