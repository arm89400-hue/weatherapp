import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

export type PushRegistrationResult =
  { ok: true; token: string } | { ok: false; reason: "expo-go" | "not-a-device" | "permission-denied" | "error" };

// True inside Expo Go. `expo-notifications` crashes on import there on Android (SDK 53+ removed
// the native module) — this must be checked before that import ever runs. Dev/production builds
// (EAS build, `expo run:android`) are unaffected. See HOW-IT-WORKS.md.
export function isExpoGo() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

// Requests notification permission and returns this device's Expo push token, or a reason it
// couldn't. Safe to call from Expo Go — bails via `isExpoGo()` before the crashing import.
export async function registerForPushNotifications(): Promise<PushRegistrationResult> {
  if (isExpoGo()) return { ok: false, reason: "expo-go" };

  try {
    const [Notifications, Device] = await Promise.all([import("expo-notifications"), import("expo-device")]);

    if (!Device.isDevice) return { ok: false, reason: "not-a-device" };

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;
    if (finalStatus !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }
    if (finalStatus !== "granted") return { ok: false, reason: "permission-denied" };

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return { ok: true, token };
  } catch {
    return { ok: false, reason: "error" };
  }
}

// Without this, Expo swallows foreground notifications silently. Called once from RootLayout;
// safe in Expo Go (guarded by `isExpoGo()`).
export async function configureForegroundNotificationHandler() {
  if (isExpoGo()) return;
  try {
    const Notifications = await import("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // Best-effort — a device where even this fails just won't show foreground banners.
  }
}

// Calls `onReceive` whenever a push arrives while the app is open (e.g. to refresh the unread
// badge). Resolves to an unsubscribe function; a no-op in Expo Go, like everything here.
export async function onNotificationReceived(onReceive: () => void): Promise<() => void> {
  if (isExpoGo()) return () => {};
  try {
    const Notifications = await import("expo-notifications");
    const subscription = Notifications.addNotificationReceivedListener(() => onReceive());
    return () => subscription.remove();
  } catch {
    return () => {};
  }
}
