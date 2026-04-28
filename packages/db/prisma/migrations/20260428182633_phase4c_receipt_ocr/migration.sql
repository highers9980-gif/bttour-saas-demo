-- CreateEnum
CREATE TYPE "ReceiptOcrJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "receipt_ocr_jobs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "imageMimeType" TEXT NOT NULL,
    "imageBase64" TEXT NOT NULL,
    "imageBytes" INTEGER NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "modelName" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "status" "ReceiptOcrJobStatus" NOT NULL DEFAULT 'PENDING',
    "extractedData" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "latencyMs" INTEGER,
    "expenseId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_ocr_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "receipt_ocr_jobs_workspaceId_status_idx" ON "receipt_ocr_jobs"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "receipt_ocr_jobs_workspaceId_createdAt_idx" ON "receipt_ocr_jobs"("workspaceId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "receipt_ocr_jobs" ADD CONSTRAINT "receipt_ocr_jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_ocr_jobs" ADD CONSTRAINT "receipt_ocr_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
