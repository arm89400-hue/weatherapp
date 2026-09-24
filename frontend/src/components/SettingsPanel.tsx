import Constants from "expo-constants";
import { Bell, Bug, ExternalLink, Info, Languages, Signal, Thermometer } from "lucide-react-native";
import { Linking, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { usePushSubscription } from "../hooks/usePushSubscription";
import { useTranslation } from "../i18n/useTranslation";
import { pushStatusLabelKey } from "./NotificationSettings";
import { SegmentedControl, SettingsRow, SettingsSection, Toggle } from "./SettingsList";

// "1.0.0 (02)" — the number in brackets is the build number `npm run apk` bumps and puts in the
// APK's file name (ThaiWeather-test-02.apk), so you can tell which build is installed.
function appVersionLabel() {
  const version = Constants.expoConfig?.version ?? "—";
  const build = Constants.expoConfig?.android?.versionCode;
  return build ? `${version} (${String(build).padStart(2, "0")})` : version;
}

const REPORT_ISSUE_URL = "https://github.com/arm89400-hue/weather/issues/new";

function NotificationsRow({ value, onPress }: { value?: string; onPress: () => void }) {
  const { t } = useTranslation();
  return <SettingsRow icon={Bell} label={t("notifications.weatherAlerts")} value={value} onPress={onPress} />;
}

// Split out so usePushSubscription only mounts with a session (its endpoints need one).
export function SignedInNotificationsRow({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { status } = usePushSubscription();
  const key = pushStatusLabelKey(status);
  return <NotificationsRow value={key ? t(key) : undefined} onPress={onPress} />;
}

export function SettingsPanel({ onOpenNotifications }: { onOpenNotifications: () => void }) {
  const { unit, setUnit, language, setLanguage, updateOnMobileData, setUpdateOnMobileData } = useSettings();
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <View className="gap-5">
      <SettingsSection index={0} title={t("settings.sectionGeneral")}>
        <SettingsRow
          icon={Thermometer}
          label={t("settings.temperatureUnit")}
          trailing={
            <SegmentedControl
              value={unit}
              onChange={setUnit}
              options={[
                { value: "C", label: "°C" },
                { value: "F", label: "°F" },
              ]}
            />
          }
        />
        <SettingsRow
          icon={Languages}
          label={t("settings.language")}
          trailing={
            <SegmentedControl
              value={language}
              onChange={setLanguage}
              options={[
                { value: "en", label: "EN" },
                { value: "th", label: "ไทย" },
              ]}
            />
          }
        />
        <SettingsRow
          icon={Signal}
          label={t("settings.updateMobileData")}
          sublabel={t("settings.updateMobileDataDesc")}
          onPress={() => setUpdateOnMobileData(!updateOnMobileData)}
          trailing={
            <Toggle
              on={updateOnMobileData}
              accessibilityLabel={t("settings.updateMobileData")}
              onToggle={() => setUpdateOnMobileData(!updateOnMobileData)}
            />
          }
        />
      </SettingsSection>

      <SettingsSection index={1} title={t("settings.sectionNotifications")}>
        {user ? (
          <SignedInNotificationsRow onPress={onOpenNotifications} />
        ) : (
          <NotificationsRow value={t("account.signIn")} onPress={onOpenNotifications} />
        )}
      </SettingsSection>

      <SettingsSection index={2} title={t("settings.sectionAbout")}>
        <SettingsRow
          icon={Bug}
          label={t("settings.reportIssue")}
          onPress={() => Linking.openURL(REPORT_ISSUE_URL)}
          trailing={<ExternalLink size={14} color="rgba(255,255,255,0.6)" />}
        />
        <SettingsRow icon={Info} label={t("settings.version")} value={appVersionLabel()} />
      </SettingsSection>
    </View>
  );
}
