import { MapPin } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import type { LocationStatus } from "../hooks/useDeviceLocationProvince";
import { useTranslation } from "../i18n/useTranslation";
import { GlassCard } from "./GlassCard";

type Props = {
  status: LocationStatus;
  onAllow: () => void;
  onDismiss: () => void;
};

export function LocationPrompt({ status, onAllow, onDismiss }: Props) {
  const { t } = useTranslation();

  return (
    <View className="px-5 pt-4">
      <GlassCard className="items-center gap-3 rounded-3xl p-6">
        <MapPin size={32} color="rgba(255,255,255,0.8)" />
        <View className="items-center">
          <Text className="text-center font-medium text-white">{t("locationPrompt.title")}</Text>
          <Text className="mt-1 text-center text-sm text-white/70">{t("locationPrompt.body")}</Text>
        </View>
        <View className="mt-1 w-full flex-row gap-3">
          <Pressable onPress={onDismiss} className="flex-1 rounded-xl bg-white/10 py-2">
            <Text className="text-center text-sm font-medium text-white">{t("locationPrompt.chooseManually")}</Text>
          </Pressable>
          <Pressable
            onPress={onAllow}
            disabled={status === "locating"}
            className="flex-1 rounded-xl bg-sky-400/80 py-2 disabled:opacity-60"
          >
            <Text className="text-center text-sm font-medium text-slate-900">
              {status === "locating" ? t("locationPrompt.locating") : t("locationPrompt.useMyLocation")}
            </Text>
          </Pressable>
        </View>
      </GlassCard>
    </View>
  );
}
