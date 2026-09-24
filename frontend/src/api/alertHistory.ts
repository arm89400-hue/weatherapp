import { apiClient } from "./client";

export type AlertKind = "live" | "forecast" | "test";

export type AlertHistoryItem = {
  id: string;
  kind: AlertKind;
  title: string;
  body: string;
  provinceId: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function fetchAlertHistory() {
  const res = await apiClient.get<{ items: AlertHistoryItem[]; unreadCount: number }>("/alert-history");
  return res.data;
}

export async function fetchUnreadAlertCount() {
  const res = await apiClient.get<{ unreadCount: number }>("/alert-history/unread-count");
  return res.data.unreadCount;
}

export async function markAlertsRead() {
  await apiClient.post("/alert-history/read");
}
