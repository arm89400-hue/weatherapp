import type { Station } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { sendPushToUser, type PushPayload } from "../modules/push/push.service.js";
import {
  DEFAULT_THRESHOLDS,
  isAlertWorthy,
  type AlertableReading,
  type AlertThresholds,
} from "../lib/alertThresholds.js";

// Re-exported for backwards compat — the threshold rules used to live here, now in lib/alertThresholds.ts.
export { isAlertWorthy };

function describeReading(reading: AlertableReading): string {
  const parts: string[] = [];
  if (reading.condition) parts.push(reading.condition);
  if (reading.temperature != null) parts.push(`${Math.round(reading.temperature)}°C`);
  if (reading.rainfallMm != null && reading.rainfallMm > 0) parts.push(`${reading.rainfallMm}mm rain`);
  return parts.join(", ") || "Notable weather";
}

export async function provinceNameFor(provinceId: string) {
  const province = await prisma.province.findUnique({ where: { id: provinceId }, select: { nameEn: true } });
  return province?.nameEn ?? "your area";
}

// Called after every reading upsert during ingestion. Thresholds and the re-alert dedupe state
// (UserStationAlert) are both per-user, so an ongoing storm doesn't re-alert every ~20min cycle.
export async function checkAndSendAlert(station: Station, reading: AlertableReading) {
  if (!station.provinceId) return;

  // Empty for any province nobody's saved (the common case), so per-user work below only runs
  // for provinces with subscribers. Covers every province in a user's SavedLocations, not just one.
  const users = await prisma.user.findMany({
    where: {
      // Only provinces the user hasn't switched off in Settings → Notifications.
      savedLocations: { some: { provinceId: station.provinceId, notify: true } },
      pushSubscriptions: { some: {} },
    },
    select: {
      id: true,
      alertPreference: {
        select: {
          maxTempC: true,
          minTempC: true,
          rainfallMm: true,
          alertHeat: true,
          alertCold: true,
          alertRain: true,
          alertThunderstorm: true,
        },
      },
      stationAlerts: {
        where: { stationId: station.id },
        select: { lastAlertCondition: true },
      },
    },
  });
  if (users.length === 0) return;

  const condition = reading.condition ?? "Severe weather";
  // Users can follow several provinces, so the title names which one this is about.
  const provinceName = await provinceNameFor(station.provinceId);
  const body = `${station.nameEn}: ${describeReading(reading)}`;
  let notified = 0;

  await Promise.all(
    users.map(async (user) => {
      const thresholds: AlertThresholds = user.alertPreference ?? DEFAULT_THRESHOLDS;
      const lastCondition = user.stationAlerts[0]?.lastAlertCondition ?? null;

      if (!isAlertWorthy(reading, thresholds)) {
        // Calmed below threshold — clear state so a later recurrence alerts again. updateMany
        // is a no-op if the user has no row.
        if (lastCondition !== null) {
          await prisma.userStationAlert.updateMany({
            where: { userId: user.id, stationId: station.id },
            data: { lastAlertCondition: null, lastAlertAt: null },
          });
        }
        return;
      }

      if (condition === lastCondition) return; // already alerted for this ongoing condition

      await prisma.userStationAlert.upsert({
        where: { userId_stationId: { userId: user.id, stationId: station.id } },
        create: {
          userId: user.id,
          stationId: station.id,
          lastAlertCondition: condition,
          lastAlertAt: new Date(),
        },
        update: { lastAlertCondition: condition, lastAlertAt: new Date() },
      });

      await sendPushToUser(user.id, {
        kind: "live",
        title: `${condition} warning · ${provinceName}`,
        body,
        url: "/",
        provinceId: station.provinceId!,
      } satisfies PushPayload);
      notified += 1;
    })
  );

  if (notified > 0) {
    logger.info({ stationId: station.id, condition, userCount: notified }, "Sent weather alert push");
  }
}
