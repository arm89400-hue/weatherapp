-- Dedupe state for the new "tomorrow's forecast looks severe" heads-up push, kept separate from
-- UserStationAlert since it tracks a forecast date rather than a live-reading condition string.

-- CreateTable
CREATE TABLE "UserForecastAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "lastAlertDate" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserForecastAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserForecastAlert_userId_idx" ON "UserForecastAlert"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserForecastAlert_userId_stationId_key" ON "UserForecastAlert"("userId", "stationId");

-- AddForeignKey
ALTER TABLE "UserForecastAlert" ADD CONSTRAINT "UserForecastAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserForecastAlert" ADD CONSTRAINT "UserForecastAlert_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
