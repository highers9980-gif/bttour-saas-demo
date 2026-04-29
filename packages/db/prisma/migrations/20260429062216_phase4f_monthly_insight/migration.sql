-- CreateEnum
CREATE TYPE "MonthlyInsightStatus" AS ENUM ('GENERATING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "monthly_insights" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "status" "MonthlyInsightStatus" NOT NULL DEFAULT 'GENERATING',
    "statisticsJson" JSONB,
    "summaryMarkdown" TEXT,
    "provider" "IntegrationProvider",
    "modelName" TEXT,
    "keyVersion" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "latencyMs" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monthly_insights_workspaceId_periodYear_periodMonth_idx" ON "monthly_insights"("workspaceId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "monthly_insights_workspaceId_createdAt_idx" ON "monthly_insights"("workspaceId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "monthly_insights" ADD CONSTRAINT "monthly_insights_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_insights" ADD CONSTRAINT "monthly_insights_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
