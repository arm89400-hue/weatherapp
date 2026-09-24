import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { deleteSavedLocation, fetchSavedLocations } from "../api/savedLocations";
import { fetchBatchCurrentWeather } from "../api/weather";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import type { LocationStatus, ResolvedLocation } from "../hooks/useDeviceLocationProvince";
import { useTranslation } from "../i18n/useTranslation";
import { localizedName } from "../lib/localizedName";
import { LocationCard } from "./LocationCard";

type Props = {
  activeProvinceId: string | null;
  activeDistrictId: string | null;
  onSelectLocation: (provinceId: string, districtId: string | null) => void;
  onAddNew: () => void;
  deviceLocation: ResolvedLocation | null;
  deviceLocationStatus: LocationStatus;
  onRequestDeviceLocation: () => void;
};

// Default content of the location Sheet: device location pinned first, then saved locations,
// each with a live weather preview fetched in one batched request.
export function SavedLocationsList({
  activeProvinceId,
  activeDistrictId,
  onSelectLocation,
  onAddNew,
  deviceLocation,
  deviceLocationStatus,
  onRequestDeviceLocation,
}: Props) {
  const { user } = useAuth();
  const { language, unit } = useSettings();
  const { t, translateCondition } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: savedLocations = [] } = useQuery({
    queryKey: ["savedLocations"],
    queryFn: fetchSavedLocations,
    enabled: !!user,
  });

  const weatherTargets = useMemo(() => {
    const targets: { provinceId: string; districtId: string | null }[] = [];
    if (deviceLocation) {
      targets.push({ provinceId: deviceLocation.provinceId, districtId: deviceLocation.districtId });
    }
    for (const loc of savedLocations) {
      targets.push({ provinceId: loc.provinceId, districtId: loc.districtId });
    }
    return targets;
  }, [deviceLocation, savedLocations]);

  // Keyed off the actual locations so this cache-hits on reopen and refetches on add/remove.
  const locationsKey = weatherTargets.map((l) => `${l.provinceId}:${l.districtId ?? ""}`).join(",");

  const { data: batchWeather = [] } = useQuery({
    queryKey: ["weather", "batchCurrent", locationsKey],
    queryFn: () => fetchBatchCurrentWeather(weatherTargets),
    enabled: weatherTargets.length > 0,
  });

  function weatherFor(provinceId: string, districtId: string | null) {
    return batchWeather.find((w) => w.provinceId === provinceId && w.districtId === districtId);
  }

  const deleteMutation = useMutation({
    mutationFn: deleteSavedLocation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["savedLocations"] }),
  });

  const deviceWeather = deviceLocation ? weatherFor(deviceLocation.provinceId, deviceLocation.districtId) : undefined;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs uppercase tracking-wide text-white/50">{t("savedLocations.title")}</Text>
        <Pressable
          onPress={onAddNew}
          accessibilityLabel={t("savedLocations.add")}
          className="rounded-full bg-white/10 p-2"
        >
          <Plus size={16} color="white" />
        </Pressable>
      </View>

      <LocationCard
        title={
          deviceLocation
            ? localizedName(deviceLocation.district ?? deviceLocation.province, language)
            : t("savedLocations.currentLocation")
        }
        unit={unit}
        isCurrentLocation
        loading={deviceLocationStatus === "locating" || (!!deviceLocation && !deviceWeather)}
        temperature={deviceWeather?.temperature}
        condition={deviceWeather ? translateCondition(deviceWeather.condition) : undefined}
        minTemp={deviceWeather?.minTemp}
        maxTemp={deviceWeather?.maxTemp}
        onPress={() => {
          if (deviceLocation) {
            onSelectLocation(deviceLocation.provinceId, deviceLocation.districtId);
          } else {
            onRequestDeviceLocation();
          }
        }}
      />

      {!user && (
        <View className="gap-2 rounded-xl bg-white/10 p-3">
          <Text className="text-xs text-white/60">{t("savedLocations.signInPrompt")}</Text>
          <Pressable onPress={() => router.push("/login")}>
            <Text className="text-xs font-medium text-sky-300">{t("account.signIn")}</Text>
          </Pressable>
        </View>
      )}

      {user &&
        savedLocations.map((loc) => {
          const weather = weatherFor(loc.provinceId, loc.districtId);
          return (
            <LocationCard
              key={loc.id}
              title={localizedName(loc.district ?? loc.province, language)}
              unit={unit}
              temperature={weather?.temperature}
              condition={weather ? translateCondition(weather.condition) : undefined}
              minTemp={weather?.minTemp}
              maxTemp={weather?.maxTemp}
              loading={!weather}
              alertsOffLabel={loc.notify ? undefined : t("savedLocations.alertsOff")}
              onPress={() => onSelectLocation(loc.provinceId, loc.districtId)}
              onDelete={() => deleteMutation.mutate(loc.id)}
            />
          );
        })}
    </View>
  );
}
