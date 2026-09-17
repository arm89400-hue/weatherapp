import { X } from "lucide-react-native";
import type { ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../i18n/useTranslation";
import { GlassCard } from "./GlassCard";
import { ModalBackdrop } from "./ModalBackdrop";

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode };

export function Sheet({ open, onClose, title, children }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <ModalBackdrop onPress={onClose}>
        {/* Not a Pressable: RN's touch responder system doesn't bubble taps from a nested
         * View to an ancestor Pressable the way DOM clicks bubble, so no stopPropagation
         * equivalent is needed here to keep taps on the panel from closing the sheet. */}
        <GlassCard
          className="w-full rounded-t-3xl p-5"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-white">{title}</Text>
            <Pressable onPress={onClose} accessibilityLabel={t("common.close")} className="rounded-full p-1.5">
              <X size={16} color="white" />
            </Pressable>
          </View>
          {children}
        </GlassCard>
      </ModalBackdrop>
    </Modal>
  );
}
