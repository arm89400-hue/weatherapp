import { useRouter } from "expo-router";
import { History, LogOut, UserRound } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useUnreadAlertCount } from "../hooks/useUnreadAlertCount";
import { useTranslation } from "../i18n/useTranslation";
import { FadeInView } from "./Motion";
import { SettingsRow, SettingsSection } from "./SettingsList";
import { SignedInNotificationsRow } from "./SettingsPanel";

export function AccountPanel({
  onClose,
  onOpenNotifications,
  onOpenHistory,
}: {
  onClose: () => void;
  onOpenNotifications: () => void;
  onOpenHistory: () => void;
}) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const unread = useUnreadAlertCount();

  if (user) {
    const initial = user.email.charAt(0).toUpperCase();
    return (
      <View className="gap-5">
        <FadeInView index={0} baseDelay={60}>
          <View className="flex-row items-center gap-3 rounded-2xl bg-white/10 p-4">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-sky-400/30">
              <Text className="text-lg font-semibold text-white">{initial}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                {user.email}
              </Text>
              <Text className="text-xs text-white/50">{t("account.signedIn")}</Text>
            </View>
          </View>
        </FadeInView>

        <SettingsSection index={1} title={t("settings.sectionNotifications")}>
          <SignedInNotificationsRow onPress={onOpenNotifications} />
          <SettingsRow icon={History} label={t("history.title")} badge={unread} onPress={onOpenHistory} />
        </SettingsSection>

        <SettingsSection index={2}>
          <SettingsRow
            icon={LogOut}
            label={t("account.logOut")}
            destructive
            onPress={() => {
              logout();
              onClose();
            }}
            showChevron={false}
          />
        </SettingsSection>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <View className="items-center gap-3 rounded-2xl bg-white/10 px-4 py-5">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <UserRound size={22} color="white" />
        </View>
        <Text className="text-center text-sm text-white/70">{t("account.signInPrompt")}</Text>
      </View>
      <Pressable
        onPress={() => {
          onClose();
          router.push("/login");
        }}
        className="rounded-xl bg-sky-400/80 py-2.5"
      >
        <Text className="text-center text-sm font-medium text-slate-900">{t("account.signIn")}</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          onClose();
          router.push("/register");
        }}
        className="rounded-xl bg-white/10 py-2.5"
      >
        <Text className="text-center text-sm font-medium text-white">{t("account.createAccount")}</Text>
      </Pressable>
    </View>
  );
}
