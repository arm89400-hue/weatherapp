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

// Idempotent — re-adding the same province/district returns the existing row. Can't rely on a
// DB unique constraint here since Postgres treats NULL != NULL (would miss province-only dupes).
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

// Alerts are matched per province (a station belongs to a province, not a district), so the
// switch is per province too: flipping it updates every saved location the user has there.
// Returns how many rows changed — 0 means the user has nothing saved in that province.
export async function setProvinceNotify(userId: string, provinceId: string, notify: boolean) {
  const result = await prisma.savedLocation.updateMany({ where: { userId, provinceId }, data: { notify } });
  return result.count;
}

// Scoping to userId in the query itself (not a separate ownership check) means a mismatch just
// reports "not found" instead of leaking whether the id exists.
export async function deleteSavedLocation(userId: string, id: string) {
  const result = await prisma.savedLocation.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
