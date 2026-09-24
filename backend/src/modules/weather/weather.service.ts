import { prisma } from "../../lib/prisma.js";
import { startOfTodayBangkok } from "../../lib/bangkokTime.js";
import { getSunTimes } from "../../lib/sun.js";
import { beaufortScale, windDirectionLabel } from "../../lib/weatherMath.js";

type LocationQuery = { provinceId?: string; districtId?: string };

// TMD stations are matched to province level only (see geoMatch.ts) — try a station tied
// directly to the district first, then fall back to any station in its province.
async function resolveStation({ provinceId, districtId }: LocationQuery) {
  if (districtId) {
    const stationForDistrict = await prisma.station.findFirst({
      where: { districtId },
      orderBy: { id: "asc" },
    });
    if (stationForDistrict) return stationForDistrict;

    const district = await prisma.district.findUnique({ where: { id: districtId } });
    if (!district) return null;

    return prisma.station.findFirst({
      where: { provinceId: district.provinceId },
      orderBy: { id: "asc" },
    });
  }

  if (provinceId) {
    return prisma.station.findFirst({ where: { provinceId }, orderBy: { id: "asc" } });
  }

  return null;
}

export async function getCurrentWeather(query: LocationQuery) {
  const station = await resolveStation(query);
  if (!station) return null;

  const reading = await prisma.weatherReading.findFirst({
    where: { stationId: station.id },
    orderBy: { observedAt: "desc" },
  });

  const sun = getSunTimes(station.lat, station.lng);
  const wind = reading
    ? {
        directionLabel: windDirectionLabel(reading.windDirection ?? undefined),
        scale: beaufortScale(reading.windSpeed ?? undefined),
      }
    : null;

  return { station, reading, sun, wind };
}

export async function getForecast(query: LocationQuery) {
  const station = await resolveStation(query);
  if (!station) return null;

  const forecasts = await prisma.weatherForecast.findMany({
    where: { stationId: station.id, forecastDate: { gte: startOfTodayBangkok() } },
    orderBy: { forecastDate: "asc" },
    take: 7,
  });

  return { station, forecasts };
}

type BatchLocationQuery = { provinceId: string; districtId?: string | null };

// Batched resolveStation+getCurrentWeather+getForecast for the saved-locations list preview.
// Bounded at 4 queries total regardless of location count (no N+1) by using `distinct` to get
// one row per station instead of querying per station.
export async function getBatchCurrentWeather(locations: BatchLocationQuery[]) {
  const districtIds = [...new Set(locations.map((l) => l.districtId).filter((id): id is string => !!id))];

  const districtStations = districtIds.length
    ? await prisma.station.findMany({
        where: { districtId: { in: districtIds } },
        orderBy: { id: "asc" },
        distinct: ["districtId"],
      })
    : [];
  const stationByDistrictId = new Map(districtStations.map((s) => [s.districtId as string, s]));

  // Falls back to province for anything without a district match; each input already carries
  // its own provinceId so no extra lookup is needed (unlike the single-item resolveStation).
  const provinceIdsNeeded = [
    ...new Set(
      locations.filter((l) => !l.districtId || !stationByDistrictId.has(l.districtId)).map((l) => l.provinceId)
    ),
  ];

  const provinceStations = provinceIdsNeeded.length
    ? await prisma.station.findMany({
        where: { provinceId: { in: provinceIdsNeeded } },
        orderBy: { id: "asc" },
        distinct: ["provinceId"],
      })
    : [];
  const stationByProvinceId = new Map(provinceStations.map((s) => [s.provinceId as string, s]));

  function resolve(loc: BatchLocationQuery) {
    if (loc.districtId) {
      const byDistrict = stationByDistrictId.get(loc.districtId);
      if (byDistrict) return byDistrict;
    }
    return stationByProvinceId.get(loc.provinceId) ?? null;
  }

  const stationIds = [...new Set(locations.map((l) => resolve(l)?.id).filter((id): id is string => !!id))];

  const readings = stationIds.length
    ? await prisma.weatherReading.findMany({
        where: { stationId: { in: stationIds } },
        orderBy: { observedAt: "desc" },
        distinct: ["stationId"],
      })
    : [];
  const readingByStationId = new Map(readings.map((r) => [r.stationId, r]));

  const forecasts = stationIds.length
    ? await prisma.weatherForecast.findMany({
        where: { stationId: { in: stationIds }, forecastDate: { gte: startOfTodayBangkok() } },
        orderBy: { forecastDate: "asc" },
        distinct: ["stationId"],
      })
    : [];
  const forecastByStationId = new Map(forecasts.map((f) => [f.stationId, f]));

  return locations.map((loc) => {
    const station = resolve(loc);
    const reading = station ? readingByStationId.get(station.id) : undefined;
    const forecast = station ? forecastByStationId.get(station.id) : undefined;
    return {
      provinceId: loc.provinceId,
      districtId: loc.districtId ?? null,
      temperature: reading?.temperature ?? null,
      condition: reading?.condition ?? null,
      minTemp: forecast?.minTemp ?? null,
      maxTemp: forecast?.maxTemp ?? null,
    };
  });
}

export async function getHistory({
  stationId,
  from,
  to,
}: {
  stationId: string;
  from?: Date;
  to?: Date;
}) {
  return prisma.weatherReading.findMany({
    where: {
      stationId,
      observedAt: {
        gte: from,
        lte: to,
      },
    },
    orderBy: { observedAt: "asc" },
  });
}
