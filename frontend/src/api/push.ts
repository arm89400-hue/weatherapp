import { apiClient } from "./client";

export async function subscribePush(expoPushToken: string) {
  await apiClient.post("/push/subscribe", { expoPushToken });
}

export async function unsubscribePush(expoPushToken: string) {
  await apiClient.delete("/push/subscribe", { data: { expoPushToken } });
}

export async function sendTestPush() {
  await apiClient.post("/push/test");
}
