-- AlterTable
ALTER TABLE "shopping_centers" ADD COLUMN     "defaultCommissionRatePercent" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "shopping_commissions" ADD COLUMN     "commissionRatePercent" DOUBLE PRECISION;
