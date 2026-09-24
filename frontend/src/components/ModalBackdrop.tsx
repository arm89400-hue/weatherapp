import type { ReactNode } from "react";
import { View } from "react-native";

type Props = { children: ReactNode };

// Plain scrim rather than a second blur — nested BlurViews conflicted on Android and broke
// GlassCard's contrast fix. Not pressable-to-dismiss on purpose, so a stray tap outside the
// panel can't lose an in-progress selection.
export function ModalBackdrop({ children }: Props) {
  return <View className="flex-1 justify-end bg-black/60">{children}</View>;
}
