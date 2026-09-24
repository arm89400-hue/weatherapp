import { ChevronLeft, X } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { useTranslation } from "../i18n/useTranslation";
import { DURATION, EASE_IN, EASE_OUT } from "../lib/motion";
import { GlassCard } from "./GlassCard";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Shows a back chevron before the title, for sub-pages like Settings → Notifications. */
  onBack?: () => void;
  children: ReactNode;
};

// The Modal's own animationType="slide" moved the dim backdrop up along with the panel. Instead
// the Modal appears instantly and we animate the two layers separately: the scrim fades, the
// panel slides. Closing plays the same in reverse (a bit faster, per the usual "exits are
// quicker than entrances" rule) and only then unmounts the Modal.
export function Sheet({ open, onClose, title, onBack, children }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  // Stays true through the closing animation, so the Modal isn't yanked away mid-slide.
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  const progress = useSharedValue(0);
  const panelHeight = useSharedValue(height);

  useEffect(() => {
    if (!mounted) return;
    if (open) {
      progress.set(withTiming(1, { duration: DURATION.slow, easing: EASE_OUT }));
    } else {
      progress.set(
        withTiming(0, { duration: DURATION.base, easing: EASE_IN }, (finished) => {
          // Re-opened before the close finished → `finished` is false and we stay mounted.
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [open, mounted, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * panelHeight.value }],
  }));

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      // No-op rather than onClose: the X button below is the only way to close this sheet, so
      // Android's hardware back button doesn't dismiss it out from under an in-progress edit.
      onRequestClose={() => {}}
      statusBarTranslucent
    >
      <View style={styles.fill}>
        {/* Plain scrim rather than a second blur — see ModalBackdrop.tsx for why. Not
            pressable-to-dismiss, so a stray tap can't lose an in-progress edit. */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, backdropStyle]} />
        <Animated.View
          style={panelStyle}
          onLayout={(e) => {
            panelHeight.set(e.nativeEvent.layout.height);
          }}
        >
          <GlassCard className="w-full rounded-t-3xl p-5" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center gap-1">
                {onBack && (
                  <Pressable
                    onPress={onBack}
                    accessibilityLabel={t("common.back")}
                    hitSlop={8}
                    className="-ml-1 rounded-full p-1"
                  >
                    <ChevronLeft size={20} color="white" />
                  </Pressable>
                )}
                <Text className="text-base font-semibold text-white">{title}</Text>
              </View>
              <Pressable onPress={onClose} accessibilityLabel={t("common.close")} className="rounded-full p-1.5">
                <X size={16} color="white" />
              </Pressable>
            </View>
            {/* Capped so tall content (e.g. Notifications) scrolls instead of pushing the header
                off-screen on small phones. */}
            <ScrollView style={{ maxHeight: height * 0.75 }} keyboardShouldPersistTaps="handled" bounces={false}>
              {children}
            </ScrollView>
          </GlassCard>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "flex-end" },
  scrim: { backgroundColor: "rgba(0,0,0,0.6)" },
});
