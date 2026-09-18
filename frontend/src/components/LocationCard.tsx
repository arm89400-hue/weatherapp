import { MapPin, Trash2 } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import type { TemperatureUnit } from "../context/SettingsContext";
import { formatTemp } from "../lib/temperature";
import { GlassCard } from "./GlassCard";

type Props = {
  title: string;
  unit: TemperatureUnit;
  temperature?: number | null;
  condition?: string | null;
  minTemp?: number | null;
  maxTemp?: number | null;
  isCurrentLocation?: boolean;
  loading?: boolean;
  onPress: () => void;
  onDelete?: () => void;
};

/** One row in the saved-locations list — reused for both the pinned device-location card and
 * every saved location below it. */
export function LocationCard({
  title,
  unit,
  temperature,
  condition,
  minTemp,
  maxTemp,
  isCurrentLocation,
  loading,
  onPress,
  onDelete,
}: Props) {
  return (
    <Pressable onPress={onPress}>
      <GlassCard className="rounded-3xl p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-1.5">
            {isCurrentLocation && <MapPin size={14} color="rgba(255,255,255,0.7)" />}
            <Text className="flex-1 text-sm font-medium text-white" numberOfLines={1}>
              {title}
            </Text>
          </View>
          {onDelete && (
            <Pressable onPress={onDelete} hitSlop={8} className="mr-2 p-1">
              <Trash2 size={16} color="rgba(255,255,255,0.45)" />
            </Pressable>
          )}
          <Text className="text-3xl font-semibold text-white">
            {loading ? "···" : formatTemp(temperature ?? null, unit)}
          </Text>
        </View>
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="text-xs text-white/60">{loading ? "" : (condition ?? "—")}</Text>
          <Text className="text-xs tabular-nums text-white/60">
            {loading ? "" : `${formatTemp(minTemp ?? null, unit)} / ${formatTemp(maxTemp ?? null, unit)}`}
          </Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}
