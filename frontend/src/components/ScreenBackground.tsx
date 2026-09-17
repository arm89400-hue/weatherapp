import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";

// Replaces the old web app's `body { background: linear-gradient(...) }` — LinearGradient is
// styled via `style`, not `className`, for the same reason as BlurView in GlassCard: it isn't a
// core RN component NativeWind auto-registers for class interop.
export function ScreenBackground({ children }: { children: ReactNode }) {
  return (
    <LinearGradient colors={["#4b5a72", "#232c3d"]} style={{ flex: 1 }}>
      {children}
    </LinearGradient>
  );
}
