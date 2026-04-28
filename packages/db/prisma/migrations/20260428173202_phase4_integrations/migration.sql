-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('OPENAI', 'GEMINI', 'ANTHROPIC');

-- CreateEnum
CREATE TYPE "AiProviderRole" AS ENUM ('PRIMARY', 'FALLBACK');

-- CreateEnum
CREATE TYPE "ConnectionTestStatus" AS ENUM ('NOT_TESTED', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'CANCELLED_KEY_ROTATED');

-- CreateEnum
CREATE TYPE "MessagingProvider" AS ENUM ('KAKAO_ALIMTALK');

-- CreateEnum
CREATE TYPE "MessagingTemplateSyncStatus" AS ENUM ('DISABLED', 'READY', 'ERROR');

-- CreateEnum
CREATE TYPE "BackupExportFormat" AS ENUM ('XLSX', 'JSON');

-- CreateEnum
CREATE TYPE "BackupExportStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "BackupExportTrigger" AS ENUM ('MANUAL', 'CRON');

-- CreateTable
CREATE TABLE "workspace_ai_settings" (
    "workspaceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "enabledAt" TIMESTAMP(3),
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" "ConnectionTestStatus" NOT NULL DEFAULT 'NOT_TESTED',
    "lastTestProvider" "IntegrationProvider",
    "lastTestMessage" TEXT,
    "lastTestLatencyMs" INTEGER,
    "allowSystemCreditFallback" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_ai_settings_pkey" PRIMARY KEY ("workspaceId")
);

-- CreateTable
CREATE TABLE "workspace_ai_provider_configs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "AiProviderRole" NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "modelName" TEXT NOT NULL,
    "apiKeyCiphertext" BYTEA NOT NULL,
    "apiKeyIv" BYTEA NOT NULL,
    "apiKeyAuthTag" BYTEA NOT NULL,
    "encryptedDek" BYTEA NOT NULL,
    "dekKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "apiKeyMasked" TEXT NOT NULL,
    "apiKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "keyUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_ai_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_jobs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "agentKind" "AiAgentKind" NOT NULL,
    "providerSnapshot" "IntegrationProvider" NOT NULL,
    "modelSnapshot" TEXT NOT NULL,
    "apiKeyVersionSnapshot" INTEGER NOT NULL,
    "roleSnapshot" "AiProviderRole" NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "inputSummary" TEXT,
    "outputSummary" TEXT,
    "status" "AiJobStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "systemCreditUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_messaging_settings" (
    "workspaceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" "MessagingProvider" NOT NULL DEFAULT 'KAKAO_ALIMTALK',
    "senderProfileKeyCiphertext" BYTEA,
    "senderProfileKeyIv" BYTEA,
    "senderProfileKeyAuthTag" BYTEA,
    "senderProfileKeyEncryptedDek" BYTEA,
    "senderProfileKeyDekKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "senderProfileKeyMasked" TEXT,
    "senderPhone" TEXT,
    "senderName" TEXT,
    "templateSyncStatus" "MessagingTemplateSyncStatus" NOT NULL DEFAULT 'DISABLED',
    "templateSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_messaging_settings_pkey" PRIMARY KEY ("workspaceId")
);

-- CreateTable
CREATE TABLE "workspace_backup_settings" (
    "workspaceId" TEXT NOT NULL,
    "neonPitrEnabled" BOOLEAN NOT NULL DEFAULT true,
    "neonPitrRetentionDays" INTEGER NOT NULL DEFAULT 7,
    "dailyBlobExportEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyBlobExportTime" TEXT NOT NULL DEFAULT '03:00',
    "dailyBlobRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "lastManualExportAt" TIMESTAMP(3),
    "lastManualExportFormat" "BackupExportFormat",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_backup_settings_pkey" PRIMARY KEY ("workspaceId")
);

-- CreateTable
CREATE TABLE "backup_export_jobs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "trigger" "BackupExportTrigger" NOT NULL,
    "format" "BackupExportFormat" NOT NULL,
    "status" "BackupExportStatus" NOT NULL DEFAULT 'QUEUED',
    "scopeMasters" BOOLEAN NOT NULL DEFAULT true,
    "scopeOperations" BOOLEAN NOT NULL DEFAULT true,
    "scopeSettlements" BOOLEAN NOT NULL DEFAULT true,
    "scopeFinance" BOOLEAN NOT NULL DEFAULT true,
    "scopeAudit" BOOLEAN NOT NULL DEFAULT false,
    "fileName" TEXT,
    "fileSizeBytes" INTEGER,
    "storageUrl" TEXT,
    "downloadExpiresAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "requestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_ai_provider_configs_workspaceId_provider_idx" ON "workspace_ai_provider_configs"("workspaceId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_ai_provider_configs_workspaceId_role_key" ON "workspace_ai_provider_configs"("workspaceId", "role");

-- CreateIndex
CREATE INDEX "ai_jobs_workspaceId_agentKind_createdAt_idx" ON "ai_jobs"("workspaceId", "agentKind", "createdAt");

-- CreateIndex
CREATE INDEX "ai_jobs_workspaceId_status_createdAt_idx" ON "ai_jobs"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "backup_export_jobs_workspaceId_status_createdAt_idx" ON "backup_export_jobs"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "backup_export_jobs_workspaceId_trigger_createdAt_idx" ON "backup_export_jobs"("workspaceId", "trigger", "createdAt");

-- AddForeignKey
ALTER TABLE "workspace_ai_settings" ADD CONSTRAINT "workspace_ai_settings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_ai_provider_configs" ADD CONSTRAINT "workspace_ai_provider_configs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_messaging_settings" ADD CONSTRAINT "workspace_messaging_settings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_backup_settings" ADD CONSTRAINT "workspace_backup_settings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_export_jobs" ADD CONSTRAINT "backup_export_jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
