import type { ReactNode } from "react";
import { Pressable } from "react-native";

type Props = { onPress: () => void; children: ReactNode };

/** Shared by Sheet and SelectSheet — dims the screen behind the modal. A real blur here was
 * tried (a second BlurView layered behind GlassCard's own) but on-device testing showed nested
 * BlurViews conflicting on Android, breaking the solid-contrast fix inside GlassCard and making
 * the sheet's own text unreadable again. A plain scrim is the safe tradeoff. */
export function ModalBackdrop({ onPress, children }: Props) {
  return (
    <Pressable className="flex-1 justify-end bg-black/60" onPress={onPress}>
      {children}
    </Pressable>
  );
}
