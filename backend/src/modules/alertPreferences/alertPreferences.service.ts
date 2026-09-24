import { prisma } from "../../lib/prisma.js";
import { DEFAULT_THRESHOLDS, type AlertThresholds } from "../../lib/alertThresholds.js";

export { DEFAULT_THRESHOLDS, type AlertThresholds };

const THRESHOLD_SELECT = {
  maxTempC: true,
  minTempC: true,
  rainfallMm: true,
  alertHeat: true,
  alertCold: true,
  alertRain: true,
  alertThunderstorm: true,
} as const;

// Falls back to defaults if the user's never saved any — doesn't create a row, since reading
// preferences shouldn't write.
export async function getAlertPreferences(userId: string): Promise<AlertThresholds> {
  const stored = await prisma.alertPreference.findUnique({
    where: { userId },
    select: THRESHOLD_SELECT,
  });
  return stored ?? { ...DEFAULT_THRESHOLDS };
}

export async function updateAlertPreferences(
  userId: string,
  thresholds: AlertThresholds
): Promise<AlertThresholds> {
  const saved = await prisma.alertPreference.upsert({
    where: { userId },
    create: { userId, ...thresholds },
    update: thresholds,
    select: THRESHOLD_SELECT,
  });
  return saved;
}

// Drops the row rather than writing the defaults back in as if they were a choice.
export async function resetAlertPreferences(userId: string): Promise<AlertThresholds> {
  await prisma.alertPreference.deleteMany({ where: { userId } });
  return { ...DEFAULT_THRESHOLDS };
}
