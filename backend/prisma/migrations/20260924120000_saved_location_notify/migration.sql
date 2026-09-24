-- Per-province alert opt-out. Defaults to true so every existing saved location keeps alerting
-- exactly as before until the user switches a province off in Settings → Notifications.

-- AlterTable
ALTER TABLE "SavedLocation" ADD COLUMN "notify" BOOLEAN NOT NULL DEFAULT true;
