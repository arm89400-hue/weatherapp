-- Alerts now cover every one of a user's SavedLocation provinces instead of a single
-- favourite one, and each condition type can be muted independently of its numeric threshold.

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_favoriteProvinceId_fkey";

-- DropIndex
DROP INDEX "User_favoriteProvinceId_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "favoriteProvinceId";

-- AlterTable
ALTER TABLE "AlertPreference"
ADD COLUMN     "alertHeat" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "alertCold" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "alertRain" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "alertThunderstorm" BOOLEAN NOT NULL DEFAULT true;
