import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { CircleUser, Droplets, List, MapPin, Settings as SettingsIcon, Wind as WindIcon } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchDistricts, fetchProvinces } from "../api/geo";
import { createSavedLocation } from "../api/savedLocations";
import { fetchCurrentWeather, fetchForecast } from "../api/weather";
import { AccountPanel } from "../components/AccountPanel";
import { AlertHistory } from "../components/AlertHistory";
import { ForecastList } from "../components/ForecastList";
import { GlassCard } from "../components/GlassCard";
import { LocationPicker } from "../components/LocationPicker";
import { LocationPrompt } from "../components/LocationPrompt";
import { FadeInView, PageTransition, PressableScale } from "../components/Motion";
import { NotificationSettings } from "../components/NotificationSettings";
import { SavedLocationsList } from "../components/SavedLocationsList";
import { ScreenBackground } from "../components/ScreenBackground";
import { Sheet } from "../components/Sheet";
import { UnreadBadge } from "../components/SettingsList";
import { SettingsPanel } from "../components/SettingsPanel";
import { StatTile } from "../components/StatTile";
import { SunArc } from "../components/SunArc";
import { WeatherHero } from "../components/WeatherHero";
import { useSettings } from "../context/SettingsContext";
import { useUnreadAlertCount } from "../hooks/useUnreadAlertCount";
import { useDeviceLocationProvince, type ResolvedLocation } from "../hooks/useDeviceLocationProvince";
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
  const [locationSheetView, setLocationSheetView] = useState<"list" | "add">("list");
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  // Both sheets can drill into the same Notifications sub-page — kept per-sheet (rather than
  // hopping between two Modals) because iOS can't present one Modal while another is dismissing.
  const [accountSheetView, setAccountSheetView] = useState<"main" | "notifications" | "history">("main");
  const unreadAlerts = useUnreadAlertCount();
  const [settingsSheetView, setSettingsSheetView] = useState<"main" | "notifications">("main");
  const router = useRouter();
  // Kept separate from provinceId/districtId so the pinned "current location" card still has
  // something to show after the user switches to a different saved location.
  const [deviceLocation, setDeviceLocation] = useState<ResolvedLocation | null>(null);
  const { language } = useSettings();
  const { t, translateRegion } = useTranslation();
  const queryClient = useQueryClient();
  // Skip the ask if we already know where they were last time.
  const [locationPromptAnswered, setLocationPromptAnswered] = useState(false);

  // AsyncStorage is async — state starts empty and fills in once this resolves. `hydrated` gates
  // the effects below so they don't fire (fallback-to-first-province, persisting null) before
  // the real stored value has loaded.
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
    setDeviceLocation(location);
    setProvinceId(location.provinceId);
    setDistrictId(location.districtId);
    setUsedDeviceLocation(true);
  });

  // Derived during render rather than via an effect (React's documented pattern for this); the
  // guard keeps it from firing more than once.
  if (locationStatus !== "idle" && locationStatus !== "locating" && !locationPromptAnswered) {
    setLocationPromptAnswered(true);
  }

  const { data: provinces = [] } = useQuery({ queryKey: ["geo", "provinces"], queryFn: fetchProvinces });
  const { data: districts = [] } = useQuery({
    queryKey: ["geo", "districts", provinceId],
    queryFn: () => fetchDistricts(provinceId as string),
    enabled: !!provinceId,
  });

  // Fall back to the first province once the list loads, but only after hydration and the
  // location prompt have settled with nothing selected. Done during render (guarded, like the
  // prompt check above) rather than in an effect, which would cost an extra render pass.
  if (hydrated && !provinceId && locationPromptAnswered && locationStatus !== "locating" && provinces.length > 0) {
    setProvinceId(provinces[0].id);
  }

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

  const addSavedLocationMutation = useMutation({
    mutationFn: createSavedLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedLocations"] });
      setLocationSheetView("list");
    },
  });

  function handleSelectLocation(newProvinceId: string, newDistrictId: string | null) {
    setProvinceId(newProvinceId);
    setDistrictId(newDistrictId);
    setUsedDeviceLocation(false);
    setLocationSheetOpen(false);
    setLocationSheetView("list");
  }

  function closeAccountSheet() {
    setAccountSheetOpen(false);
    setAccountSheetView("main");
  }

  function closeSettingsSheet() {
    setSettingsSheetOpen(false);
    setSettingsSheetView("main");
  }

  function signInFrom(closeSheet: () => void) {
    closeSheet();
    router.push("/login");
  }

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
              <PressableScale
                onPress={() => setLocationSheetOpen(true)}
                accessibilityLabel={t("header.changeLocation")}
                containerClassName="mt-1 self-start"
                className="opacity-60"
                scaleTo={0.85}
              >
                <MapPin size={16} color="white" />
              </PressableScale>
            </View>

            <GlassCard className="rounded-full p-1" contentClassName="flex-row items-center gap-1">
              <PressableScale
                onPress={() => setLocationSheetOpen(true)}
                accessibilityLabel={t("header.chooseLocation")}
                className="rounded-full p-2.5"
                scaleTo={0.88}
              >
                <List size={16} color="rgba(255,255,255,0.8)" />
              </PressableScale>
              <PressableScale
                onPress={() => setAccountSheetOpen(true)}
                accessibilityLabel={t("header.account")}
                className="rounded-full p-2.5"
                scaleTo={0.88}
              >
                <CircleUser size={16} color="rgba(255,255,255,0.8)" />
                {/* Unread alerts — cleared by opening Account → Alert history. */}
                <View pointerEvents="none" style={{ position: "absolute", top: -2, right: -4 }}>
                  <UnreadBadge
                    count={unreadAlerts}
                    accessibilityLabel={t("history.unreadBadge", { n: unreadAlerts })}
                  />
                </View>
              </PressableScale>
              <PressableScale
                onPress={() => setSettingsSheetOpen(true)}
                accessibilityLabel={t("header.settings")}
                className="rounded-full p-2.5"
                scaleTo={0.88}
              >
                <SettingsIcon size={16} color="rgba(255,255,255,0.8)" />
              </PressableScale>
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

              <FadeInView index={0}>
                <WeatherHero
                  data={currentQuery.data}
                  todayForecast={todayForecast}
                  isLoading={currentQuery.isLoading}
                />
              </FadeInView>

              <View className="gap-4 px-5">
                <FadeInView index={1}>
                  <ForecastList forecasts={forecastQuery.data?.forecasts ?? []} />
                </FadeInView>

                <FadeInView index={2}>
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
                </FadeInView>

                {currentQuery.data?.sun && (
                  <FadeInView index={3}>
                    <SunArc sunrise={currentQuery.data.sun.sunrise} sunset={currentQuery.data.sun.sunset} />
                  </FadeInView>
                )}
              </View>
            </>
          )}
        </ScrollView>

        <Sheet
          open={locationSheetOpen}
          onClose={() => {
            setLocationSheetOpen(false);
            setLocationSheetView("list");
          }}
          title={locationSheetView === "add" ? t("sheet.addLocation") : t("sheet.location")}
        >
          <PageTransition pageKey={locationSheetView} direction={locationSheetView === "add" ? "forward" : "back"}>
            {locationSheetView === "add" ? (
              <LocationPicker
                onSubmit={(newProvinceId, newDistrictId) =>
                  addSavedLocationMutation.mutate({ provinceId: newProvinceId, districtId: newDistrictId })
                }
                onBack={() => setLocationSheetView("list")}
              />
            ) : (
              <SavedLocationsList
                activeProvinceId={provinceId}
                activeDistrictId={districtId}
                onSelectLocation={handleSelectLocation}
                onAddNew={() => setLocationSheetView("add")}
                deviceLocation={deviceLocation}
                deviceLocationStatus={locationStatus}
                onRequestDeviceLocation={requestLocation}
              />
            )}
          </PageTransition>
        </Sheet>

        <Sheet
          open={accountSheetOpen}
          onClose={closeAccountSheet}
          title={
            accountSheetView === "notifications"
              ? t("notifications.title")
              : accountSheetView === "history"
                ? t("history.title")
                : t("sheet.account")
          }
          onBack={accountSheetView === "main" ? undefined : () => setAccountSheetView("main")}
        >
          <PageTransition pageKey={accountSheetView} direction={accountSheetView === "main" ? "back" : "forward"}>
            {accountSheetView === "notifications" && (
              <NotificationSettings onRequestSignIn={() => signInFrom(closeAccountSheet)} />
            )}
            {accountSheetView === "history" && <AlertHistory />}
            {accountSheetView === "main" && (
              <AccountPanel
                onClose={closeAccountSheet}
                onOpenNotifications={() => setAccountSheetView("notifications")}
                onOpenHistory={() => setAccountSheetView("history")}
              />
            )}
          </PageTransition>
        </Sheet>

        <Sheet
          open={settingsSheetOpen}
          onClose={closeSettingsSheet}
          title={settingsSheetView === "notifications" ? t("notifications.title") : t("sheet.settings")}
          onBack={settingsSheetView === "notifications" ? () => setSettingsSheetView("main") : undefined}
        >
          <PageTransition pageKey={settingsSheetView} direction={settingsSheetView === "main" ? "back" : "forward"}>
            {settingsSheetView === "notifications" ? (
              <NotificationSettings onRequestSignIn={() => signInFrom(closeSettingsSheet)} />
            ) : (
              <SettingsPanel onOpenNotifications={() => setSettingsSheetView("notifications")} />
            )}
          </PageTransition>
        </Sheet>
      </SafeAreaView>
    </ScreenBackground>
  );
}
