import { prisma } from "../../lib/prisma.js";
import { haversineKm } from "../../lib/geoDistance.js";
import { logger } from "../../lib/logger.js";
import { reverseGeocode } from "../../lib/nominatim.js";

export async function findNearestProvince(lat: number, lng: number) {
  const provinces = await prisma.province.findMany();
  if (provinces.length === 0) return null;

  let nearest = provinces[0];
  let nearestDist = haversineKm(lat, lng, nearest.lat, nearest.lng);
  for (const p of provinces.slice(1)) {
    const dist = haversineKm(lat, lng, p.lat, p.lng);
    if (dist < nearestDist) {
      nearest = p;
      nearestDist = dist;
    }
  }
  return nearest;
}

// Strips both "Amphoe/Khet <Name>" (our naming) and "<Name> District/Subdistrict" (Nominatim's)
// down to the bare name so they compare equal.
function normalizeAdminName(name: string) {
  return name
    .replace(/^(Amphoe|King Amphoe|Khet)\s+/i, "")
    .replace(/\s+(District|Subdistrict)$/i, "")
    .trim()
    .toLowerCase();
}

async function matchDistrictByName(candidate: string, provinceId: string) {
  const target = normalizeAdminName(candidate);
  if (!target) return null;

  const districts = await prisma.district.findMany({ where: { provinceId } });
  return (
    districts.find((d) => {
      const normalized = normalizeAdminName(d.nameEn);
      return normalized === target || normalized.includes(target) || target.includes(normalized);
    }) ?? null
  );
}

// Districts have no coordinates (see prisma/seed.ts), so we reverse-geocode via Nominatim and
// text-match the admin name instead (`county` for most provinces, `suburb` for Bangkok's khet).
export async function resolveDistrictForPoint(lat: number, lng: number, provinceId: string) {
  let address;
  try {
    address = await reverseGeocode(lat, lng);
  } catch (err) {
    logger.warn({ err, lat, lng }, "resolveDistrictForPoint: reverse geocode request failed");
    return null;
  }
  if (!address) {
    logger.warn({ lat, lng }, "resolveDistrictForPoint: reverse geocode returned no address");
    return null;
  }

  const candidates = [address.county, address.suburb, address.city_district, address.district].filter(
    (v): v is string => !!v
  );

  for (const candidate of candidates) {
    const match = await matchDistrictByName(candidate, provinceId);
    if (match) return match;
  }

  logger.warn({ lat, lng, provinceId, address }, "resolveDistrictForPoint: no district matched candidates");
  return null;
}
