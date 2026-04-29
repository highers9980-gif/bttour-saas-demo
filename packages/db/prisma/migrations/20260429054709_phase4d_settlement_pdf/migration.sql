-- CreateEnum
CREATE TYPE "SettlementPdfStatus" AS ENUM ('GENERATING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "SettlementPdfType" AS ENUM ('GUIDE', 'PARTNER', 'VEHICLE', 'SHOPPING', 'RECEIVABLE');

-- CreateTable
CREATE TABLE "settlement_pdf_jobs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "SettlementPdfType" NOT NULL,
    "status" "SettlementPdfStatus" NOT NULL DEFAULT 'GENERATING',
    "guideId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSizeBytes" INTEGER,
    "pageCount" INTEGER,
    "errorMessage" TEXT,
    "latencyMs" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_pdf_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "settlement_pdf_jobs_workspaceId_type_createdAt_idx" ON "settlement_pdf_jobs"("workspaceId", "type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "settlement_pdf_jobs_workspaceId_guideId_idx" ON "settlement_pdf_jobs"("workspaceId", "guideId");

-- AddForeignKey
ALTER TABLE "settlement_pdf_jobs" ADD CONSTRAINT "settlement_pdf_jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_pdf_jobs" ADD CONSTRAINT "settlement_pdf_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
