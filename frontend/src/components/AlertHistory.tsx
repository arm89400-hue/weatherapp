import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CalendarClock, Inbox, TriangleAlert, type LucideIcon } from "lucide-react-native";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { fetchAlertHistory, markAlertsRead, type AlertKind } from "../api/alertHistory";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/useTranslation";
import { LoadingText } from "./Motion";
import { SettingsSection } from "./SettingsList";

const KIND_STYLE: Record<AlertKind, { icon: LucideIcon; tint: string }> = {
  live: { icon: TriangleAlert, tint: "#fbbf24" }, // amber-400 — happening now
  forecast: { icon: CalendarClock, tint: "#7dd3fc" }, // sky-300 — tomorrow
  test: { icon: BellRing, tint: "rgba(255,255,255,0.7)" },
};

// Account → Alert history. Opening it marks everything read (clearing the red badge), but the list
// keeps the "new" dots from when it was fetched, so you can still see what just came in.
export function AlertHistory() {
  const { t, dateLocale } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["alertHistory", "list", user?.id],
    queryFn: fetchAlertHistory,
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: markAlertsRead,
    onSuccess: () => queryClient.setQueryData(["alertHistory", "unread", user?.id], 0),
  });

  const unread = data?.unreadCount ?? 0;
  const { mutate } = markRead;
  useEffect(() => {
    if (unread > 0) mutate();
  }, [unread, mutate]);

  if (isLoading) {
    return (
      <View className="px-1">
        <LoadingText
          text={t("history.loading")}
          className="text-xs text-white/40"
          dotColor="rgba(255,255,255,0.4)"
          dotSize={3}
        />
      </View>
    );
  }

  if (isError) {
    return <Text className="px-1 text-xs text-white/40">{t("history.loadFailed")}</Text>;
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <View className="items-center gap-2 rounded-2xl bg-white/10 px-4 py-8">
        <Inbox size={28} color="rgba(255,255,255,0.5)" />
        <Text className="text-sm font-medium text-white">{t("history.emptyTitle")}</Text>
        <Text className="text-center text-xs text-white/50">{t("history.emptyBody")}</Text>
      </View>
    );
  }

  return (
    <SettingsSection footer={t("history.footer", { n: items.length })}>
      {items.map((item) => {
        const { icon: Icon, tint } = KIND_STYLE[item.kind] ?? KIND_STYLE.test;
        const isNew = item.readAt == null;
        return (
          <View key={item.id} className="flex-row gap-3 px-3 py-3">
            <View className="h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <Icon size={16} color={tint} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                {isNew && (
                  <View accessible accessibilityLabel={t("history.new")} className="h-2 w-2 rounded-full bg-red-500" />
                )}
                <Text className="flex-1 text-sm font-medium text-white" numberOfLines={2}>
                  {item.title}
                </Text>
              </View>
              <Text className="mt-0.5 text-xs leading-4 text-white/60">{item.body}</Text>
              <Text className="mt-1 text-[11px] text-white/40">
                {new Date(item.createdAt).toLocaleString(dateLocale, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>
        );
      })}
    </SettingsSection>
  );
}
