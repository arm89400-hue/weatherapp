import { prisma } from "../../lib/prisma.js";

type SavedLocationInput = { provinceId: string; districtId?: string | null };

const include = {
  province: { select: { id: true, nameTh: true, nameEn: true } },
  district: { select: { id: true, nameTh: true, nameEn: true } },
} as const;

export async function listSavedLocations(userId: string) {
  return prisma.savedLocation.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include,
  });
}

/** Idempotent — re-adding the same province/district returns the existing row instead of
 * erroring, since a DB-level unique constraint can't reliably catch this (Postgres treats
 * NULL != NULL, so it wouldn't catch duplicate province-only saves, the common case). */
export async function createSavedLocation(userId: string, input: SavedLocationInput) {
  const districtId = input.districtId ?? null;

  const existing = await prisma.savedLocation.findFirst({
    where: { userId, provinceId: input.provinceId, districtId },
    include,
  });
  if (existing) return existing;

  return prisma.savedLocation.create({
    data: { userId, provinceId: input.provinceId, districtId },
    include,
  });
}

/** Scoping the delete to userId in the same query (rather than a separate ownership check)
 * means one user can never delete another's row, and a mismatch just reports "not found"
 * instead of leaking whether the id exists at all. */
export async function deleteSavedLocation(userId: string, id: string) {
  const result = await prisma.savedLocation.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
