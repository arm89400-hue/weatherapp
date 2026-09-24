-- Replaces the dormant Web Push (VAPID) subscription shape with a single Expo push token per
-- device. The old push feature was never live in the Expo app (see HOW-IT-WORKS.md), so this
-- assumes the table is empty; if you've already collected real subscriptions on production,
-- back them up before running this and re-collect Expo tokens from the app instead.

-- DropIndex
DROP INDEX "PushSubscription_endpoint_key";

-- AlterTable
ALTER TABLE "PushSubscription"
  DROP COLUMN "endpoint",
  DROP COLUMN "p256dh",
  DROP COLUMN "auth",
  ADD COLUMN "expoPushToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_expoPushToken_key" ON "PushSubscription"("expoPushToken");
