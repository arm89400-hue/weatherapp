import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "../../lib/prisma.js";
import { expo } from "../../lib/expoPush.js";
import { logger } from "../../lib/logger.js";

export async function saveSubscription(userId: string, expoPushToken: string) {
  return prisma.pushSubscription.upsert({
    where: { expoPushToken },
    create: { userId, expoPushToken },
    update: { userId },
  });
}

export async function removeSubscription(userId: string, expoPushToken: string) {
  await prisma.pushSubscription.deleteMany({ where: { userId, expoPushToken } });
}

export type AlertKind = "live" | "forecast" | "test";

/** `provinceId` rides along in the push's data so the app can open that province when tapped.
 * `kind` labels the entry in the user's Alert history. */
export type PushPayload = { kind: AlertKind; title: string; body: string; url?: string; provinceId?: string };

function pushData({ url, provinceId }: PushPayload) {
  const data: Record<string, string> = {};
  if (url) data.url = url;
  if (provinceId) data.provinceId = provinceId;
  return Object.keys(data).length > 0 ? data : undefined;
}

/** Sends to every device a user has subscribed on; prunes tokens Expo reports as no longer
 * registered (app uninstalled, etc.) rather than retrying them. Returns how many devices it was
 * handed to Expo for (0 = user has no valid subscription). */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return 0;

  const messages: ExpoPushMessage[] = [];
  for (const sub of subscriptions) {
    if (!Expo.isExpoPushToken(sub.expoPushToken)) {
      // Stale/malformed token (e.g. left over from before a format change) — drop it rather
      // than let it fail every send forever.
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      continue;
    }
    messages.push({
      to: sub.expoPushToken,
      title: payload.title,
      body: payload.body,
      data: pushData(payload),
      sound: "default",
    });
  }
  if (messages.length === 0) return 0;

  // Recorded once per alert (not per device), and only when at least one device will get it — so
  // the app's Alert history and unread badge match what actually buzzed the user's phone.
  await prisma.alertHistory.create({
    data: {
      userId,
      kind: payload.kind,
      title: payload.title,
      body: payload.body,
      provinceId: payload.provinceId ?? null,
    },
  });

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      await Promise.all(
        tickets.map(async (ticket, i) => {
          if (ticket.status !== "error") return;
          const token = chunk[i].to as string;
          logger.error({ ticket, token }, "Expo push ticket error");
          if (ticket.details?.error === "DeviceNotRegistered") {
            await prisma.pushSubscription.deleteMany({ where: { expoPushToken: token } }).catch(() => {});
          }
        })
      );
    } catch (err) {
      logger.error({ err }, "Failed to send push notification chunk");
    }
  }
  return messages.length;
}
