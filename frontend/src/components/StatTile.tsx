import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { GlassCard } from "./GlassCard";

type Props = { icon: LucideIcon; label: string; value: ReactNode; unit?: string; subtitle?: string };

export function StatTile({ icon: Icon, label, value, unit, subtitle }: Props) {
  return (
    <GlassCard className="flex-1 flex-col rounded-3xl p-5">
      <View className="flex-row items-center gap-2 opacity-80">
        <Icon size={16} color="white" />
        <Text className="text-sm text-white">{label}</Text>
      </View>
      <View className="mt-3 flex-row items-baseline gap-1">
        <Text className="text-3xl font-semibold text-white">{value}</Text>
        {unit && <Text className="text-sm text-white/70">{unit}</Text>}
      </View>
      {subtitle && <Text className="mt-2 text-xs leading-snug text-white/60">{subtitle}</Text>}
    </GlassCard>
  );
}
