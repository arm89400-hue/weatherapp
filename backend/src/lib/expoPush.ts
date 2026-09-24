import { Expo } from "expo-server-sdk";
import { env } from "../config/env.js";

// No VAPID/keys needed — just this client and each device's Expo push token (collected via
// Notifications.getExpoPushTokenAsync(), see frontend/src/lib/pushNotifications.ts).
export const expo = new Expo(
  env.EXPO_ACCESS_TOKEN ? { accessToken: env.EXPO_ACCESS_TOKEN } : {}
);
