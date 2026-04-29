-- CreateEnum
CREATE TYPE "HermesWorkflow" AS ENUM ('MONTHLY_INSIGHT_AUTO', 'SCHEDULE_CHANGE_NOTIFY', 'RECEIVABLE_REMINDER_AUTO');

-- CreateEnum
CREATE TYPE "HermesJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "hermes_jobs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "workflow" "HermesWorkflow" NOT NULL,
    "status" "HermesJobStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hermes_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_automation_settings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "monthlyInsightAutoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleChangeNotifyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "receivableReminderAutoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_automation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_change_logs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "beforeData" JSONB,
    "afterData" JSONB,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hermes_jobs_workspaceId_workflow_scheduledAt_idx" ON "hermes_jobs"("workspaceId", "workflow", "scheduledAt" DESC);

-- CreateIndex
CREATE INDEX "hermes_jobs_status_scheduledAt_idx" ON "hermes_jobs"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_automation_settings_workspaceId_key" ON "workspace_automation_settings"("workspaceId");

-- CreateIndex
CREATE INDEX "schedule_change_logs_workspaceId_changedAt_idx" ON "schedule_change_logs"("workspaceId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "schedule_change_logs_scheduleId_idx" ON "schedule_change_logs"("scheduleId");

-- AddForeignKey
ALTER TABLE "hermes_jobs" ADD CONSTRAINT "hermes_jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_automation_settings" ADD CONSTRAINT "workspace_automation_settings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_change_logs" ADD CONSTRAINT "schedule_change_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_change_logs" ADD CONSTRAINT "schedule_change_logs_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
