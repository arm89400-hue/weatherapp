import "../global.css";

import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../context/AuthContext";
import { SettingsProvider } from "../context/SettingsContext";
import { configureForegroundNotificationHandler, onNotificationReceived } from "../lib/pushNotifications";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

// React Native has no window "focus" event, so tell React Query when the app comes back to the
// foreground — stale queries (like the unread-alert badge) then refetch on return.
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener("change", (state) => handleFocus(state === "active"));
  return () => subscription.remove();
});

export default function RootLayout() {
  useEffect(() => {
    configureForegroundNotificationHandler();
  }, []);

  // A push landing while the app is open means a new Alert history entry — refresh the badge.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    onNotificationReceived(() => queryClient.invalidateQueries({ queryKey: ["alertHistory"] })).then((off) => {
      if (cancelled) off();
      else unsubscribe = off;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }} />
          </AuthProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
