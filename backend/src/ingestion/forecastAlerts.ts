import type { Station } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { sendPushToUser, type PushPayload } from "../modules/push/push.service.js";
import { provinceNameFor } from "./weatherAlerts.js";
import {
  DEFAULT_THRESHOLDS,
  isForecastAlertWorthy,
  type AlertableForecast,
  type AlertThresholds,
} from "../lib/alertThresholds.js";

function describeForecast(forecast: AlertableForecast): string {
  const parts: string[] = [];
  if (forecast.condition) parts.push(forecast.condition);
  if (forecast.maxTemp != null) parts.push(`${Math.round(forecast.maxTemp)}°C`);
  if (forecast.rainChance != null && forecast.rainChance > 0) parts.push(`${Math.round(forecast.rainChance)}% rain`);
  return parts.join(", ") || "Notable weather";
}

// Called once per station after pullForecast writes tomorrow's row. One push per user per day at
// most — UserForecastAlert only re-fires once `lastAlertDate` is behind the forecast it's for.
export async function checkForecastAlert(station: Station, forecast: AlertableForecast, forecastDate: Date) {
  if (!station.provinceId) return;

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
      forecastAlerts: {
        where: { stationId: station.id },
        select: { lastAlertDate: true },
      },
    },
  });
  if (users.length === 0) return;

  const provinceName = await provinceNameFor(station.provinceId);
  const body = `${station.nameEn}: ${describeForecast(forecast)}, tomorrow`;
  let notified = 0;

  await Promise.all(
    users.map(async (user) => {
      const thresholds: AlertThresholds = user.alertPreference ?? DEFAULT_THRESHOLDS;
      if (!isForecastAlertWorthy(forecast, thresholds)) return;

      const lastAlertDate = user.forecastAlerts[0]?.lastAlertDate;
      if (lastAlertDate && lastAlertDate.getTime() >= forecastDate.getTime()) return; // already warned for this date

      await prisma.userForecastAlert.upsert({
        where: { userId_stationId: { userId: user.id, stationId: station.id } },
        create: { userId: user.id, stationId: station.id, lastAlertDate: forecastDate },
        update: { lastAlertDate: forecastDate },
      });

      await sendPushToUser(user.id, {
        kind: "forecast",
        title: `${forecast.condition ?? "Severe weather"} expected tomorrow · ${provinceName}`,
        body,
        url: "/",
        provinceId: station.provinceId!,
      } satisfies PushPayload);
      notified += 1;
    })
  );

  if (notified > 0) {
    logger.info({ stationId: station.id, userCount: notified }, "Sent forecast heads-up push");
  }
}
