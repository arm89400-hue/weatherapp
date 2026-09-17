import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { CircleUser, Droplets, List, MapPin, Settings as SettingsIcon, Wind as WindIcon } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchDistricts, fetchProvinces } from "../api/geo";
import { fetchCurrentWeather, fetchForecast } from "../api/weather";
import { AccountPanel } from "../components/AccountPanel";
import { ForecastList } from "../components/ForecastList";
import { GlassCard } from "../components/GlassCard";
import { LocationPicker } from "../components/LocationPicker";
import { LocationPrompt } from "../components/LocationPrompt";
import { ScreenBackground } from "../components/ScreenBackground";
import { Sheet } from "../components/Sheet";
import { SettingsPanel } from "../components/SettingsPanel";
import { StatTile } from "../components/StatTile";
import { SunArc } from "../components/SunArc";
import { WeatherHero } from "../components/WeatherHero";
import { useSettings } from "../context/SettingsContext";
import { useDeviceLocationProvince } from "../hooks/useDeviceLocationProvince";
import { useWeatherSocket } from "../hooks/useWeatherSocket";
import { useTranslation } from "../i18n/useTranslation";
import { localizedName } from "../lib/localizedName";

const LAST_PROVINCE_KEY = "weather:lastProvinceId";
const LAST_DISTRICT_KEY = "weather:lastDistrictId";

export function DashboardScreen() {
  const [hydrated, setHydrated] = useState(false);
  const [provinceId, setProvinceId] = useState<string | null>(null);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [usedDeviceLocation, setUsedDeviceLocation] = useState(false);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const { language } = useSettings();
  const { t, translateRegion } = useTranslation();
  // Skip the ask if we already know where they were last time.
  const [locationPromptAnswered, setLocationPromptAnswered] = useState(false);

  // Unlike the old web app's synchronous localStorage read, AsyncStorage is async — state
  // starts empty and is filled in once this resolves, gated by `hydrated` so the effects below
  // don't fire (fallback-to-first-province, persisting null back over a value not yet loaded)
  // before the real stored value has had a chance to load.
  useEffect(() => {
    (async () => {
      const entries = await AsyncStorage.multiGet([LAST_PROVINCE_KEY, LAST_DISTRICT_KEY]);
      const stored = Object.fromEntries(entries);
      if (stored[LAST_PROVINCE_KEY]) {
        setProvinceId(stored[LAST_PROVINCE_KEY]);
        setLocationPromptAnswered(true);
      }
      if (stored[LAST_DISTRICT_KEY]) setDistrictId(stored[LAST_DISTRICT_KEY]);
      setHydrated(true);
    })();
  }, []);

  const { status: locationStatus, request: requestLocation } = useDeviceLocationProvince((location) => {
    setProvinceId(location.provinceId);
    setDistrictId(location.districtId);
    setUsedDeviceLocation(true);
  });

  // Once geolocation settles either way, the prompt has done its job.
  useEffect(() => {
    if (locationStatus !== "idle" && locationStatus !== "locating") {
      setLocationPromptAnswered(true);
    }
  }, [locationStatus]);

  const { data: provinces = [] } = useQuery({ queryKey: ["geo", "provinces"], queryFn: fetchProvinces });
  const { data: districts = [] } = useQuery({
    queryKey: ["geo", "districts", provinceId],
    queryFn: () => fetchDistricts(provinceId as string),
    enabled: !!provinceId,
  });

  // Fall back to the first province once the list loads, but only after hydration and the
  // location prompt have both settled, and nothing got selected.
  useEffect(() => {
    if (hydrated && !provinceId && locationPromptAnswered && locationStatus !== "locating" && provinces.length > 0) {
      setProvinceId(provinces[0].id);
    }
  }, [hydrated, provinceId, locationPromptAnswered, locationStatus, provinces]);

  useEffect(() => {
    if (!hydrated) return;
    if (provinceId) AsyncStorage.setItem(LAST_PROVINCE_KEY, provinceId);
  }, [provinceId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (districtId) AsyncStorage.setItem(LAST_DISTRICT_KEY, districtId);
    else AsyncStorage.removeItem(LAST_DISTRICT_KEY);
  }, [districtId, hydrated]);

  useWeatherSocket(provinceId);

  const locationParams = { provinceId: provinceId ?? undefined, districtId: districtId ?? undefined };

  const currentQuery = useQuery({
    queryKey: ["weather", "current", provinceId, districtId],
    queryFn: () => fetchCurrentWeather(locationParams),
    enabled: !!provinceId,
  });

  const forecastQuery = useQuery({
    queryKey: ["weather", "forecast", provinceId, districtId],
    queryFn: () => fetchForecast(locationParams),
    enabled: !!provinceId,
  });

  if (!hydrated) {
    return (
      <ScreenBackground>
        <SafeAreaView className="flex-1" />
      </ScreenBackground>
    );
  }

  const province = provinces.find((p) => p.id === provinceId);
  const district = districts.find((d) => d.id === districtId);
  const locationName = localizedName(district, language) || localizedName(province, language) || t("common.dash");
  const reading = currentQuery.data?.reading ?? null;
  const todayForecast = forecastQuery.data?.forecasts?.[0];
  const showLocationPrompt = !provinceId && !locationPromptAnswered;

  return (
    <ScreenBackground>
    <SafeAreaView className="flex-1">
      <ScrollView contentContainerClassName="pb-10">
        <View className="flex-row items-start justify-between px-5 pt-4">
          <View>
            <Text className="text-lg font-semibold leading-tight text-white">{locationName}</Text>
            {province?.region && (
              <Text className="text-xs text-white/60">
                {t("region.suffix", { region: translateRegion(province.region) ?? "" })}
              </Text>
            )}
            <Pressable
              onPress={() => setLocationSheetOpen(true)}
              accessibilityLabel={t("header.changeLocation")}
              className="mt-1 self-start opacity-60"
            >
              <MapPin size={16} color="white" />
            </Pressable>
          </View>

          <GlassCard className="flex-row items-center gap-1 rounded-full p-1">
            <Pressable
              onPress={() => setLocationSheetOpen(true)}
              accessibilityLabel={t("header.chooseLocation")}
              className="rounded-full p-2.5"
            >
              <List size={16} color="rgba(255,255,255,0.8)" />
            </Pressable>
            <Pressable
              onPress={() => setAccountSheetOpen(true)}
              accessibilityLabel={t("header.account")}
              className="rounded-full p-2.5"
            >
              <CircleUser size={16} color="rgba(255,255,255,0.8)" />
            </Pressable>
            <Pressable
              onPress={() => setSettingsSheetOpen(true)}
              accessibilityLabel={t("header.settings")}
              className="rounded-full p-2.5"
            >
              <SettingsIcon size={16} color="rgba(255,255,255,0.8)" />
            </Pressable>
          </GlassCard>
        </View>

        {showLocationPrompt ? (
          <LocationPrompt
            status={locationStatus}
            onAllow={requestLocation}
            onDismiss={() => setLocationPromptAnswered(true)}
          />
        ) : (
          <>
            {locationStatus === "denied" && (
              <Text className="px-5 pt-2 text-center text-xs text-white/60">
                {t("location.deniedNotice", { name: localizedName(province, language) || locationName })}
              </Text>
            )}
            {usedDeviceLocation && locationStatus === "resolved" && (
              <Text className="px-5 pt-2 text-center text-xs text-white/60">{t("location.deviceNotice")}</Text>
            )}

            <WeatherHero data={currentQuery.data} todayForecast={todayForecast} isLoading={currentQuery.isLoading} />

            <View className="gap-4 px-5">
              <ForecastList forecasts={forecastQuery.data?.forecasts ?? []} />

              <View className="gap-4">
                <View className="flex-row gap-4">
                  <StatTile
                    icon={Droplets}
                    label={t("stat.precipitation")}
                    value={reading?.rainfallMm != null ? reading.rainfallMm.toFixed(1) : t("common.dash")}
                    unit="mm"
                    subtitle={t("stat.precipitationSubtitle")}
                  />
                  <StatTile
                    icon={WindIcon}
                    label={t("stat.wind")}
                    value={reading?.windSpeed != null ? Math.round(reading.windSpeed) : t("common.dash")}
                    unit="km/h"
                    subtitle={
                      currentQuery.data?.wind?.directionLabel
                        ? t("stat.windSubtitle", {
                            dir: currentQuery.data.wind.directionLabel,
                            scale: currentQuery.data.wind.scale ?? t("common.dash"),
                          })
                        : undefined
                    }
                  />
                </View>
                <StatTile
                  icon={Droplets}
                  label={t("stat.humidity")}
                  value={reading?.humidity != null ? Math.round(reading.humidity) : t("common.dash")}
                  unit="%"
                />
              </View>

              {currentQuery.data?.sun && (
                <SunArc sunrise={currentQuery.data.sun.sunrise} sunset={currentQuery.data.sun.sunset} />
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Sheet open={locationSheetOpen} onClose={() => setLocationSheetOpen(false)} title={t("sheet.location")}>
        <LocationPicker
          provinceId={provinceId}
          districtId={districtId}
          onChangeProvince={(id) => {
            setProvinceId(id);
            setUsedDeviceLocation(false);
          }}
          onChangeDistrict={setDistrictId}
          locationStatus={locationStatus}
          onUseMyLocation={() => {
            setUsedDeviceLocation(false);
            requestLocation();
            setLocationSheetOpen(false);
          }}
        />
      </Sheet>

      <Sheet open={accountSheetOpen} onClose={() => setAccountSheetOpen(false)} title={t("sheet.account")}>
        <AccountPanel onClose={() => setAccountSheetOpen(false)} />
      </Sheet>

      <Sheet open={settingsSheetOpen} onClose={() => setSettingsSheetOpen(false)} title={t("sheet.settings")}>
        <SettingsPanel />
      </Sheet>
    </SafeAreaView>
    </ScreenBackground>
  );
}
