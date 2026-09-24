import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { subscribePush, unsubscribePush } from "../api/push";
import { isExpoGo, registerForPushNotifications } from "../lib/pushNotifications";

const STORED_TOKEN_KEY = "weather:pushToken";

export type PushSubscriptionStatus =
  | "loading"
  | "subscribed"
  | "unsubscribed"
  | "expo-go"
  | "denied"
  | "error";

// Drives the severe-weather-alert toggle in AccountPanel. Backend endpoints require a session,
// so callers should only mount this while `user` is set.
export function usePushSubscription() {
  const [status, setStatus] = useState<PushSubscriptionStatus>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (isExpoGo()) {
        setStatus("expo-go");
        return;
      }
      const stored = await AsyncStorage.getItem(STORED_TOKEN_KEY);
      setStatus(stored ? "subscribed" : "unsubscribed");
    })();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const result = await registerForPushNotifications();
      if (!result.ok) {
        setStatus(result.reason === "expo-go" ? "expo-go" : result.reason === "permission-denied" ? "denied" : "error");
        return;
      }
      await subscribePush(result.token);
      await AsyncStorage.setItem(STORED_TOKEN_KEY, result.token);
      setStatus("subscribed");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const stored = await AsyncStorage.getItem(STORED_TOKEN_KEY);
      if (stored) await unsubscribePush(stored).catch(() => {});
      await AsyncStorage.removeItem(STORED_TOKEN_KEY);
      setStatus("unsubscribed");
    } finally {
      setBusy(false);
    }
  }

  return { status, busy, enable, disable };
}
