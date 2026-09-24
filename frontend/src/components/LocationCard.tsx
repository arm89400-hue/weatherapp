import { BellOff, MapPin, Trash2 } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import type { TemperatureUnit } from "../context/SettingsContext";
import { formatTemp } from "../lib/temperature";
import { GlassCard } from "./GlassCard";
import { LoadingDots, PressableScale } from "./Motion";

type Props = {
  title: string;
  unit: TemperatureUnit;
  temperature?: number | null;
  condition?: string | null;
  minTemp?: number | null;
  maxTemp?: number | null;
  isCurrentLocation?: boolean;
  /** Shows a muted-bell icon — this province's alerts are switched off in Notifications. */
  alertsOffLabel?: string;
  loading?: boolean;
  onPress: () => void;
  onDelete?: () => void;
};

// One row in the saved-locations list — reused for both the pinned device-location card and
// every saved location below it.
export function LocationCard({
  title,
  unit,
  temperature,
  condition,
  minTemp,
  maxTemp,
  isCurrentLocation,
  alertsOffLabel,
  loading,
  onPress,
  onDelete,
}: Props) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.97}>
      <GlassCard className="rounded-3xl p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-1.5">
            {isCurrentLocation && <MapPin size={14} color="rgba(255,255,255,0.7)" />}
            <Text className="shrink text-sm font-medium text-white" numberOfLines={1}>
              {title}
            </Text>
            {alertsOffLabel && (
              <View accessible accessibilityLabel={alertsOffLabel}>
                <BellOff size={12} color="rgba(255,255,255,0.45)" />
              </View>
            )}
          </View>
          {onDelete && (
            <Pressable onPress={onDelete} hitSlop={8} className="mr-2 p-1">
              <Trash2 size={16} color="rgba(255,255,255,0.45)" />
            </Pressable>
          )}
          {loading ? (
            <View style={{ height: 36, justifyContent: "center" }}>
              <LoadingDots size={6} color="rgba(255,255,255,0.8)" />
            </View>
          ) : (
            <Text className="text-3xl font-semibold text-white">{formatTemp(temperature ?? null, unit)}</Text>
          )}
        </View>
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="text-xs text-white/60">{loading ? "" : (condition ?? "—")}</Text>
          <Text className="text-xs tabular-nums text-white/60">
            {loading ? "" : `${formatTemp(minTemp ?? null, unit)} / ${formatTemp(maxTemp ?? null, unit)}`}
          </Text>
        </View>
      </GlassCard>
    </PressableScale>
  );
}
