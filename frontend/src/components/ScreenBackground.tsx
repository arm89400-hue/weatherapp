import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";

// LinearGradient takes `style`, not `className` — same reason as BlurView in GlassCard.
export function ScreenBackground({ children }: { children: ReactNode }) {
  return (
    <LinearGradient colors={["#4b5a72", "#232c3d"]} style={{ flex: 1 }}>
      {children}
    </LinearGradient>
  );
}
