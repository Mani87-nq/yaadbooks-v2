-- CreateEnum
CREATE TYPE "IndustryModule" AS ENUM ('RETAIL', 'RESTAURANT', 'SALON');

-- AlterTable: Add tier lockdown fields to Company
ALTER TABLE "Company" ADD COLUMN "selectedModule" "IndustryModule";
ALTER TABLE "Company" ADD COLUMN "invoiceCountThisMonth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN "aiQuestionsThisMonth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN "billingCycleStart" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN "storageUsedMb" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN "paymentFailedAt" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN "gracePeriodNotified" BOOLEAN NOT NULL DEFAULT false;
