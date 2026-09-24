import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { publishWeatherUpdated } from "../../lib/redis.js";
import { startOfTomorrowBangkok } from "../../lib/bangkokTime.js";
import { checkAndSendAlert } from "../weatherAlerts.js";
import { checkForecastAlert } from "../forecastAlerts.js";
import { fetchOpenMeteoBatch, wmoToCondition, type OpenMeteoLocation } from "../openMeteoClient.js";

const CHUNK_SIZE = 40;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// One "virtual" station per province, backed by Open-Meteo instead of a physical TMD station.
// Writes into the same Station/WeatherReading/WeatherForecast tables the TMD path uses, so
// API/WebSocket/frontend don't care which source produced the data.
export async function runPullOpenMeteoWeather() {
  const provinces = await prisma.province.findMany();
  const tomorrow = startOfTomorrowBangkok();
  let readingsWritten = 0;
  let forecastsWritten = 0;

  for (const batch of chunk(provinces, CHUNK_SIZE)) {
    const locations: OpenMeteoLocation[] = batch.map((p) => ({ lat: p.lat, lng: p.lng }));
    const results = await fetchOpenMeteoBatch(locations);

    for (let i = 0; i < batch.length; i++) {
      const province = batch[i];
      const result = results[i];
      if (!result) continue;

      const station = await prisma.station.upsert({
        where: { tmdStationId: `om-${province.sourceId}` },
        create: {
          tmdStationId: `om-${province.sourceId}`,
          nameTh: province.nameTh,
          nameEn: province.nameEn,
          lat: province.lat,
          lng: province.lng,
          provinceId: province.id,
        },
        update: {
          nameTh: province.nameTh,
          nameEn: province.nameEn,
        },
      });

      const { current, daily } = result;
      const condition = wmoToCondition(current.weatherCode);

      await prisma.weatherReading.upsert({
        where: { stationId_observedAt: { stationId: station.id, observedAt: current.observedAt } },
        create: {
          stationId: station.id,
          observedAt: current.observedAt,
          temperature: current.temperature,
          feelsLike: current.feelsLike,
          humidity: current.humidity,
          rainfallMm: current.rainfallMm,
          windSpeed: current.windSpeed,
          windDirection: current.windDirection,
          pressure: current.pressure,
          uvIndex: current.uvIndex,
          condition,
          raw: current.raw as any,
        },
        update: {
          temperature: current.temperature,
          feelsLike: current.feelsLike,
          humidity: current.humidity,
          rainfallMm: current.rainfallMm,
          windSpeed: current.windSpeed,
          windDirection: current.windDirection,
          pressure: current.pressure,
          uvIndex: current.uvIndex,
          condition,
          raw: current.raw as any,
        },
      });
      readingsWritten += 1;

      await checkAndSendAlert(station, {
        condition,
        temperature: current.temperature,
        rainfallMm: current.rainfallMm,
      });

      for (const day of daily) {
        await prisma.weatherForecast.upsert({
          where: { stationId_forecastDate: { stationId: station.id, forecastDate: day.date } },
          create: {
            stationId: station.id,
            forecastDate: day.date,
            minTemp: day.minTemp,
            maxTemp: day.maxTemp,
            rainChance: day.rainChance,
            condition: wmoToCondition(day.weatherCode),
            raw: day.raw as any,
          },
          update: {
            minTemp: day.minTemp,
            maxTemp: day.maxTemp,
            rainChance: day.rainChance,
            condition: wmoToCondition(day.weatherCode),
            raw: day.raw as any,
          },
        });
        forecastsWritten += 1;

        if (day.date.getTime() === tomorrow.getTime()) {
          await checkForecastAlert(
            station,
            { condition: wmoToCondition(day.weatherCode), maxTemp: day.maxTemp, minTemp: day.minTemp, rainChance: day.rainChance },
            day.date
          );
        }
      }

      await publishWeatherUpdated({ provinceId: province.id, stationId: station.id, kind: "reading" });
    }
  }

  logger.info({ provinces: provinces.length, readingsWritten, forecastsWritten }, "pullOpenMeteoWeather complete");
  return { provinces: provinces.length, readingsWritten, forecastsWritten };
}
