import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellRing,
  CloudLightning,
  CloudRain,
  MapPin,
  Snowflake,
  ThermometerSun,
  type LucideIcon,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  fetchAlertPreferences,
  resetAlertPreferences,
  updateAlertPreferences,
  SENSITIVITY_PRESETS,
  type AlertThresholds as Thresholds,
  type Sensitivity,
} from "../api/alertPreferences";
import { sendTestPush } from "../api/push";
import { fetchSavedLocations, setProvinceNotify, type SavedLocation } from "../api/savedLocations";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { usePushSubscription, type PushSubscriptionStatus } from "../hooks/usePushSubscription";
import { useTranslation } from "../i18n/useTranslation";
import type { TranslationKey } from "../i18n/translations";
import { localizedName } from "../lib/localizedName";
import { SegmentedControl, SettingsRow, SettingsSection, Toggle } from "./SettingsList";

type ConditionKey = "alertHeat" | "alertCold" | "alertRain" | "alertThunderstorm";

const CONDITIONS: { key: ConditionKey; label: TranslationKey; icon: LucideIcon; tint: string }[] = [
  { key: "alertHeat", label: "alerts.heat", icon: ThermometerSun, tint: "#fdba74" },
  { key: "alertCold", label: "alerts.cold", icon: Snowflake, tint: "#7dd3fc" },
  { key: "alertRain", label: "alerts.rain", icon: CloudRain, tint: "#93c5fd" },
  { key: "alertThunderstorm", label: "alerts.thunderstorm", icon: CloudLightning, tint: "#fde047" },
];

const SENSITIVITY_DESC: Record<Sensitivity, TranslationKey> = {
  mild: "alerts.mildDesc",
  moderate: "alerts.moderateDesc",
  strict: "alerts.strictDesc",
};

function matchingSensitivity(draft: Thresholds): Sensitivity | null {
  const match = (
    Object.entries(SENSITIVITY_PRESETS) as [Sensitivity, (typeof SENSITIVITY_PRESETS)[Sensitivity]][]
  ).find(
    ([, preset]) =>
      preset.maxTempC === draft.maxTempC &&
      preset.minTempC === draft.minTempC &&
      preset.rainfallMm === draft.rainfallMm,
  );
  return match?.[0] ?? null;
}

// Short status for a "Notifications ›" row in the Settings/Account menus.
export function pushStatusLabelKey(status: PushSubscriptionStatus): TranslationKey | null {
  switch (status) {
    case "subscribed":
      return "notifications.on";
    case "unsubscribed":
    case "error":
      return "notifications.off";
    case "denied":
      return "notifications.blocked";
    case "expo-go":
      return "notifications.unavailable";
    default:
      return null;
  }
}

function pushStatusMessageKey(status: PushSubscriptionStatus): TranslationKey | undefined {
  if (status === "denied") return "account.notifyBlocked";
  if (status === "error") return "account.notifyError";
  return undefined;
}

type ProvinceGroup = {
  provinceId: string;
  province: SavedLocation["province"];
  districts: NonNullable<SavedLocation["district"]>[];
  notify: boolean;
};

// Saved locations can be districts, but alerts are matched per province — so group them and show
// one switch per province (a province alerts if any of its rows is on, mirroring the backend).
function groupByProvince(locations: SavedLocation[]): ProvinceGroup[] {
  const groups = new Map<string, ProvinceGroup>();
  for (const loc of locations) {
    const group = groups.get(loc.provinceId) ?? {
      provinceId: loc.provinceId,
      province: loc.province,
      districts: [],
      notify: false,
    };
    if (loc.district) group.districts.push(loc.district);
    group.notify ||= loc.notify;
    groups.set(loc.provinceId, group);
  }
  return [...groups.values()];
}

// One switch per saved province. Optimistic: the switch flips instantly and the cached saved
// locations are patched in place; a failed save refetches to put the real value back.
function ProvinceAlertsSection() {
  const { t } = useTranslation();
  const { language } = useSettings();
  const queryClient = useQueryClient();

  const { data: savedLocations, isLoading } = useQuery({
    queryKey: ["savedLocations"],
    queryFn: fetchSavedLocations,
  });
  const provinces = useMemo(() => groupByProvince(savedLocations ?? []), [savedLocations]);

  const toggle = useMutation({
    mutationFn: ({ provinceId, notify }: { provinceId: string; notify: boolean }) =>
      setProvinceNotify(provinceId, notify),
    onMutate: ({ provinceId, notify }) => {
      queryClient.setQueryData<SavedLocation[]>(["savedLocations"], (prev) =>
        prev?.map((loc) => (loc.provinceId === provinceId ? { ...loc, notify } : loc)),
      );
    },
    onError: () => queryClient.invalidateQueries({ queryKey: ["savedLocations"] }),
  });

  if (isLoading) {
    return <Text className="px-1 text-xs text-white/40">{t("alerts.loading")}</Text>;
  }

  // Only speaks up when there's something to act on — no standing caption.
  let footer: string | undefined;
  if (provinces.length === 0) footer = t("notifications.provincesEmptyHint");
  else if (toggle.isError) footer = t("alerts.saveFailed");

  return (
    <SettingsSection index={1} title={t("notifications.provincesTitle")} footer={footer}>
      {provinces.length === 0 ? (
        <SettingsRow icon={MapPin} label={t("notifications.noProvinces")} disabled />
      ) : (
        provinces.map((group) => {
          const name = localizedName(group.province, language);
          const flip = () => toggle.mutate({ provinceId: group.provinceId, notify: !group.notify });
          return (
            <SettingsRow
              key={group.provinceId}
              icon={MapPin}
              iconTint={group.notify ? "#38bdf8" : undefined}
              label={name}
              sublabel={
                group.districts.length > 0
                  ? group.districts.map((d) => localizedName(d, language)).join(", ")
                  : undefined
              }
              onPress={flip}
              trailing={<Toggle on={group.notify} accessibilityLabel={name} onToggle={flip} />}
            />
          );
        })
      )}
    </SettingsSection>
  );
}

// Sensitivity and condition toggles both save immediately on tap — each press is already a
// discrete choice, so there's nothing to debounce.
function AlertPreferencesSections() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["alertPreferences"],
    queryFn: fetchAlertPreferences,
  });

  // Local edits win once there are any — falling back to `data` on every render would let a
  // just-completed save overwrite a newer in-flight tap.
  const [localDraft, setDraft] = useState<Thresholds | null>(null);
  const draft = localDraft ?? data ?? null;

  const save = useMutation({
    mutationFn: updateAlertPreferences,
    onSuccess: (saved) => queryClient.setQueryData(["alertPreferences"], saved),
  });

  const reset = useMutation({
    mutationFn: resetAlertPreferences,
    onSuccess: (defaults) => {
      queryClient.setQueryData(["alertPreferences"], defaults);
      setDraft(defaults);
    },
  });

  function apply(next: Thresholds) {
    setDraft(next);
    save.mutate(next);
  }

  if (isLoading || !draft) {
    return <Text className="px-1 text-xs text-white/40">{t("alerts.loading")}</Text>;
  }

  const busy = reset.isPending;
  const sensitivity = matchingSensitivity(draft);
  let statusText = "";
  if (save.isError || reset.isError) statusText = t("alerts.saveFailed");
  else if (save.isPending) statusText = t("alerts.saving");

  return (
    <>
      <SettingsSection index={2} title={t("alerts.thresholdsTitle")}>
        {CONDITIONS.map(({ key, label, icon, tint }) => (
          <SettingsRow
            key={key}
            icon={icon}
            iconTint={tint}
            label={t(label)}
            onPress={() => apply({ ...draft, [key]: !draft[key] })}
            disabled={busy}
            trailing={
              <Toggle
                on={draft[key]}
                disabled={busy}
                accessibilityLabel={t(label)}
                onToggle={() => apply({ ...draft, [key]: !draft[key] })}
              />
            }
          />
        ))}
      </SettingsSection>

      <SettingsSection
        index={3}
        title={t("alerts.sensitivityTitle")}
        footer={sensitivity ? t(SENSITIVITY_DESC[sensitivity]) : undefined}
      >
        <View className="p-2">
          <SegmentedControl
            fill
            disabled={busy}
            value={sensitivity}
            onChange={(level) => apply({ ...draft, ...SENSITIVITY_PRESETS[level] })}
            options={[
              { value: "mild", label: t("alerts.mild") },
              { value: "moderate", label: t("alerts.moderate") },
              { value: "strict", label: t("alerts.strict") },
            ]}
          />
        </View>
      </SettingsSection>

      <View className="flex-row items-center justify-between px-1">
        <Text className="flex-1 text-xs text-white/40">{statusText}</Text>
        <Pressable onPress={() => reset.mutate()} disabled={busy} hitSlop={6}>
          <Text className="text-xs text-sky-300 disabled:opacity-40">{t("alerts.reset")}</Text>
        </Pressable>
      </View>
    </>
  );
}

// The Notifications sub-page, reachable from both the Settings and Account sheets.
export function NotificationSettings({ onRequestSignIn }: { onRequestSignIn: () => void }) {
  const { user } = useAuth();
  const { t } = useTranslation();

  if (!user) {
    return (
      <View className="gap-3">
        <SettingsSection footer={t("account.signInPrompt")}>
          <SettingsRow
            icon={Bell}
            label={t("notifications.weatherAlerts")}
            disabled
            trailing={<Toggle on={false} disabled onToggle={() => {}} />}
          />
        </SettingsSection>
        <Pressable onPress={onRequestSignIn} className="rounded-xl bg-sky-400/80 py-2.5">
          <Text className="text-center text-sm font-medium text-slate-900">{t("account.signIn")}</Text>
        </Pressable>
      </View>
    );
  }

  return <SignedInNotificationSettings />;
}

// Split out so usePushSubscription only mounts with a session (its endpoints need one).
function SignedInNotificationSettings() {
  const { t } = useTranslation();
  const push = usePushSubscription();
  const unavailable = push.status === "expo-go";
  const subscribed = push.status === "subscribed";
  const messageKey = pushStatusMessageKey(push.status);
  const togglePush = () => (subscribed ? push.disable() : push.enable());
  const testPush = useMutation({ mutationFn: sendTestPush });

  let footer = messageKey ? t(messageKey) : undefined;
  if (testPush.isSuccess) footer = t("notifications.testSent");
  else if (testPush.isError) footer = t("notifications.testFailed");

  return (
    <View className="gap-5">
      <SettingsSection footer={footer}>
        <SettingsRow
          icon={Bell}
          iconTint={subscribed ? "#38bdf8" : undefined}
          label={t("notifications.weatherAlerts")}
          sublabel={t("account.notify")}
          disabled={unavailable}
          onPress={unavailable || push.busy || push.status === "loading" ? undefined : togglePush}
          trailing={
            unavailable ? null : (
              <Toggle
                on={subscribed}
                disabled={push.busy || push.status === "loading"}
                accessibilityLabel={t("notifications.weatherAlerts")}
                onToggle={togglePush}
              />
            )
          }
        />
        {subscribed && (
          <SettingsRow
            icon={BellRing}
            label={testPush.isPending ? t("notifications.testSending") : t("notifications.sendTest")}
            disabled={testPush.isPending}
            onPress={() => testPush.mutate()}
            showChevron={false}
          />
        )}
      </SettingsSection>

      {/* Shown even when push is off or unavailable (Expo Go) so preferences can be set ahead of time. */}
      <ProvinceAlertsSection />
      <AlertPreferencesSections />
    </View>
  );
}
