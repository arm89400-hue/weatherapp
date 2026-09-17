import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { LogOut } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { fetchProvinces } from "../api/geo";
import { updateFavoriteProvince } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "../i18n/useTranslation";
import { localizedName } from "../lib/localizedName";
import { SelectSheet } from "./SelectSheet";

export function AccountPanel({ onClose }: { onClose: () => void }) {
  const { user, logout, setUser } = useAuth();
  const { language } = useSettings();
  const { t } = useTranslation();
  const router = useRouter();
  const [savingProvince, setSavingProvince] = useState(false);
  const [provinceSheetOpen, setProvinceSheetOpen] = useState(false);
  const { data: provinces = [] } = useQuery({
    queryKey: ["geo", "provinces"],
    queryFn: fetchProvinces,
    enabled: !!user,
  });

  if (user) {
    const selectedProvince = provinces.find((p) => p.id === user.favoriteProvinceId);

    return (
      <View className="gap-4">
        <Text className="text-sm text-white/70">{t("account.signedInAs", { email: user.email })}</Text>

        <View>
          <Text className="mb-1 text-xs text-white/60">{t("account.alertMeIn")}</Text>
          <Pressable
            disabled={savingProvince}
            onPress={() => setProvinceSheetOpen(true)}
            className="rounded-xl bg-white/10 px-3 py-2.5 disabled:opacity-50"
          >
            <Text className="text-sm text-white">
              {selectedProvince ? localizedName(selectedProvince, language) : t("account.notSet")}
            </Text>
          </Pressable>
        </View>

        {/* Push notifications are deferred — the old Web Push/VAPID flow has no RN equivalent.
         * A future pass swaps this for expo-notifications and re-enables the toggle. */}
        <View className="rounded-xl bg-white/10 px-4 py-3">
          <Text className="text-sm font-medium text-white/50">{t("account.notify")}</Text>
          <Text className="mt-1 text-xs text-white/40">{t("account.comingSoon")}</Text>
        </View>

        <Pressable
          onPress={() => {
            logout();
            onClose();
          }}
          className="flex-row items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5"
        >
          <LogOut size={16} color="white" />
          <Text className="text-sm font-medium text-white">{t("account.logOut")}</Text>
        </Pressable>

        <SelectSheet
          open={provinceSheetOpen}
          onClose={() => setProvinceSheetOpen(false)}
          title={t("account.alertMeIn")}
          options={provinces.map((p) => ({ value: p.id, label: localizedName(p, language) }))}
          value={user.favoriteProvinceId}
          onChange={async (favoriteProvinceId) => {
            setSavingProvince(true);
            try {
              const updated = await updateFavoriteProvince(favoriteProvinceId);
              setUser(updated);
            } finally {
              setSavingProvince(false);
            }
          }}
          nullable
          nullLabel={t("account.notSet")}
        />
      </View>
    );
  }

  return (
    <View className="gap-3">
      <Text className="text-sm text-white/70">{t("account.signInPrompt")}</Text>
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
