import { ChevronRight } from "lucide-react-native";
import { Linking, Pressable, Text, View } from "react-native";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "../i18n/useTranslation";

const REPORT_ISSUE_URL = "https://github.com/arm89400-hue/weather/issues/new";

function Toggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`h-5 w-9 rounded-full ${on ? "bg-sky-400" : "bg-white/20"}`}>
      <View className={`h-5 w-5 rounded-full bg-white ${on ? "translate-x-4" : ""}`} />
    </Pressable>
  );
}

function Row({
  label,
  value,
  onPress,
  href,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  href?: string;
}) {
  return (
    <Pressable
      onPress={href ? () => Linking.openURL(href) : onPress}
      className="flex-row items-center justify-between rounded-xl bg-white/10 px-4 py-3.5"
    >
      <Text className="text-sm font-medium text-white">{label}</Text>
      <View className="flex-row items-center gap-1.5">
        {value && <Text className="text-sm text-white/60">{value}</Text>}
        <ChevronRight size={16} color="rgba(255,255,255,0.6)" />
      </View>
    </Pressable>
  );
}

function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <View className="flex-row items-center justify-between rounded-xl bg-white/10 px-4 py-3.5">
      <Text className="text-sm font-medium text-white">{label}</Text>
      <Toggle on={on} onPress={onToggle} />
    </View>
  );
}

export function SettingsPanel() {
  const { unit, setUnit, language, setLanguage, updateOnMobileData, setUpdateOnMobileData } = useSettings();
  const { t } = useTranslation();

  return (
    <View className="gap-2.5">
      <Row
        label={t("settings.temperatureUnit")}
        value={unit === "C" ? `${t("settings.celsius")} °C` : `${t("settings.fahrenheit")} °F`}
        onPress={() => setUnit(unit === "C" ? "F" : "C")}
      />
      <Row
        label={t("settings.language")}
        value={language === "en" ? `${t("settings.languageEnglish")} (EN)` : `${t("settings.languageThai")} (TH)`}
        onPress={() => setLanguage(language === "en" ? "th" : "en")}
      />
      <ToggleRow
        label={t("settings.updateMobileData")}
        on={updateOnMobileData}
        onToggle={() => setUpdateOnMobileData(!updateOnMobileData)}
      />
      <View className="mt-1">
        <Row label={t("settings.reportIssue")} href={REPORT_ISSUE_URL} />
      </View>
    </View>
  );
}
