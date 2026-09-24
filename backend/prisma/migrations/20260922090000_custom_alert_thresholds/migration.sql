-- Per-user severe-weather thresholds, plus the per-user dedupe state they force.
--
-- The dropped Station columns were alert bookkeeping, not weather data: they recorded which
-- condition a station last alerted on. That state is regenerated on the next ingestion cycle,
-- so dropping it costs at most one duplicate alert for a storm that is ongoing right now.

-- CreateTable
CREATE TABLE "AlertPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maxTempC" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "minTempC" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "rainfallMm" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStationAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "lastAlertCondition" TEXT,
    "lastAlertAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStationAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlertPreference_userId_key" ON "AlertPreference"("userId");

-- CreateIndex
CREATE INDEX "UserStationAlert_userId_idx" ON "UserStationAlert"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserStationAlert_userId_stationId_key" ON "UserStationAlert"("userId", "stationId");

-- AddForeignKey
ALTER TABLE "AlertPreference" ADD CONSTRAINT "AlertPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStationAlert" ADD CONSTRAINT "UserStationAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStationAlert" ADD CONSTRAINT "UserStationAlert_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Station" DROP COLUMN "lastAlertCondition",
DROP COLUMN "lastAlertAt";
