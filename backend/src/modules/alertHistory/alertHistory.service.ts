import { prisma } from "../../lib/prisma.js";

// Enough to scroll back a few weeks of storms without paging; older rows stay in the table but
// aren't sent to the app.
const HISTORY_LIMIT = 50;

export async function getUnreadCount(userId: string) {
  return prisma.alertHistory.count({ where: { userId, readAt: null } });
}

export async function listAlertHistory(userId: string) {
  const [items, unreadCount] = await Promise.all([
    prisma.alertHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
      select: { id: true, kind: true, title: true, body: true, provinceId: true, readAt: true, createdAt: true },
    }),
    getUnreadCount(userId),
  ]);
  return { items, unreadCount };
}

// Opening Alert history in the app counts as reading everything in it.
export async function markAllRead(userId: string) {
  await prisma.alertHistory.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
