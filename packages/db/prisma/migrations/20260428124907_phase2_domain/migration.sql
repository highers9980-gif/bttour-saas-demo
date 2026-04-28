-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('STARTER', 'PRO', 'PRO_AI', 'BUSINESS_AI');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AiCreditEntryType" AS ENUM ('GRANT', 'DEBIT', 'REFUND', 'EXPIRE');

-- CreateEnum
CREATE TYPE "AiAgentKind" AS ENUM ('RECEIPT_OCR', 'SETTLEMENT_REPORT', 'RECEIVABLE_MESSAGE', 'MONTHLY_INSIGHT', 'SCHEDULE_CHANGE_DETECT');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('KO', 'EN', 'ZH');

-- CreateEnum
CREATE TYPE "PartnerKind" AS ENUM ('AGENCY', 'HOTEL_VENDOR', 'VEHICLE_VENDOR', 'SHOPPING_CENTER', 'CUSTOMER', 'OTHER');

-- CreateEnum
CREATE TYPE "TourTeamStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('TENTATIVE', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HotelStaySource" AS ENUM ('MANUAL', 'SCHEDULE_AUTO');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WalletKind" AS ENUM ('BANK', 'CARD', 'FX');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'CARD_USE', 'CARD_PAYMENT', 'FX_OUT', 'FX_IN', 'BALANCE_ADJUSTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReceivableStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'PAID', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "locale" "Locale" NOT NULL DEFAULT 'KO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "bizName" TEXT,
    "bizNumber" TEXT,
    "bizCeo" TEXT,
    "bizPhone" TEXT,
    "bizEmail" TEXT,
    "bizAddr" TEXT,
    "defaultLocale" "Locale" NOT NULL DEFAULT 'KO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT,
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "code" "PlanCode" NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyPriceKrw" INTEGER NOT NULL,
    "maxUsers" INTEGER NOT NULL,
    "maxTeamsPerMonth" INTEGER,
    "alimtalkQuota" INTEGER,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiCreditIncluded" INTEGER NOT NULL DEFAULT 0,
    "setupFeeKrw" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planCode" "PlanCode" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "externalCustomerId" TEXT,
    "externalBillingKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_credit_ledger" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "AiCreditEntryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "agent" "AiAgentKind",
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_credit_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PartnerKind" NOT NULL DEFAULT 'AGENCY',
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "region" TEXT,
    "memo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guides" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "language" TEXT,
    "colorKey" TEXT,
    "memo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "rank" INTEGER,
    "region" TEXT,
    "contactName" TEXT,
    "memo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "vehicleType" TEXT,
    "plateNumber" TEXT,
    "region" TEXT,
    "vendor" TEXT,
    "memo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "memo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_centers" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "region" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "memo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "shopping_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_teams" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "teamNo" INTEGER NOT NULL,
    "partnerId" TEXT,
    "partnerNameSnapshot" TEXT,
    "agentLabel" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "groupName" TEXT,
    "paxAdult" INTEGER NOT NULL DEFAULT 0,
    "paxChild" INTEGER NOT NULL DEFAULT 0,
    "paxInfant" INTEGER NOT NULL DEFAULT 0,
    "paxTc" INTEGER NOT NULL DEFAULT 0,
    "roomCount" INTEGER NOT NULL DEFAULT 0,
    "roomComposition" TEXT,
    "originCode" TEXT,
    "originLabel" TEXT,
    "flightIn" TEXT,
    "flightOut" TEXT,
    "tourType" TEXT,
    "starRating" INTEGER,
    "status" "TourTeamStatus" NOT NULL DEFAULT 'SCHEDULED',
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tour_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_guide_assignments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "guideId" TEXT,
    "guideNameSnapshot" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'LEAD',
    "status" "AssignmentStatus" NOT NULL DEFAULT 'TENTATIVE',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_guide_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_hotel_stays" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "hotelId" TEXT,
    "hotelNameSnapshot" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "roomCount" INTEGER NOT NULL DEFAULT 0,
    "reservationNo" TEXT,
    "source" "HotelStaySource" NOT NULL DEFAULT 'MANUAL',
    "status" "AssignmentStatus" NOT NULL DEFAULT 'TENTATIVE',
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_hotel_stays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_vehicle_assignments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "vehicleLabelSnapshot" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalWon" INTEGER NOT NULL DEFAULT 0,
    "vatWon" INTEGER NOT NULL DEFAULT 0,
    "totalWithVatWon" INTEGER NOT NULL DEFAULT 0,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'TENTATIVE',
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_vehicle_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_settlements" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "teamId" TEXT,
    "guideId" TEXT,
    "guideNameSnapshot" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "totalWon" INTEGER NOT NULL,
    "partnerId" TEXT,
    "partnerNameSnapshot" TEXT,
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "guide_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_settlement_payments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "amountWon" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_settlement_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_settlements" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "teamId" TEXT,
    "vehicleAssignmentId" TEXT,
    "vehicleId" TEXT,
    "vehicleLabelSnapshot" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "supplyAmountWon" INTEGER NOT NULL,
    "vatWon" INTEGER NOT NULL DEFAULT 0,
    "totalWithVatWon" INTEGER NOT NULL,
    "partnerId" TEXT,
    "partnerNameSnapshot" TEXT,
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vehicle_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_settlement_payments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "amountWon" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_settlement_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_sales" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "teamId" TEXT,
    "guideId" TEXT,
    "centerId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "paxCount" INTEGER NOT NULL DEFAULT 0,
    "buyerCount" INTEGER NOT NULL DEFAULT 0,
    "salesWon" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "shopping_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_commissions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "shoppingSaleId" TEXT,
    "centerId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "commissionWon" INTEGER NOT NULL,
    "vatWon" INTEGER NOT NULL DEFAULT 0,
    "totalWithVatWon" INTEGER NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAt" TIMESTAMP(3),
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "shopping_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_wallets" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" "WalletKind" NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT,
    "numberMasked" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'KRW',
    "isMainKrw" BOOLEAN NOT NULL DEFAULT false,
    "openingBalanceMinor" INTEGER NOT NULL DEFAULT 0,
    "billingDay" INTEGER,
    "creditLimitWon" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "finance_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_ledger_lines" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "lineDatetime" TIMESTAMP(3) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "note" TEXT,
    "transferGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "finance_ledger_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivables" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "teamId" TEXT,
    "partnerId" TEXT,
    "partnerNameSnapshot" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'KRW',
    "amountMinor" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "dueNote" TEXT,
    "status" "ReceivableStatus" NOT NULL DEFAULT 'OPEN',
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "receivables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivable_payments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receivable_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "teamId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'KRW',
    "amountMinor" INTEGER NOT NULL,
    "vatMinor" INTEGER NOT NULL DEFAULT 0,
    "vendorName" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_attachments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "ocrStatus" TEXT,
    "ocrJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "quoteCurrency" TEXT NOT NULL DEFAULT 'KRW',
    "rate" DOUBLE PRECISION NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspaces_deletedAt_idx" ON "workspaces"("deletedAt");

-- CreateIndex
CREATE INDEX "memberships_userId_idx" ON "memberships"("userId");

-- CreateIndex
CREATE INDEX "memberships_workspaceId_status_idx" ON "memberships"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_workspaceId_userId_key" ON "memberships"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_workspaceId_email_idx" ON "invitations"("workspaceId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_workspaceId_key" ON "subscriptions"("workspaceId");

-- CreateIndex
CREATE INDEX "subscriptions_status_currentPeriodEnd_idx" ON "subscriptions"("status", "currentPeriodEnd");

-- CreateIndex
CREATE INDEX "ai_credit_ledger_workspaceId_createdAt_idx" ON "ai_credit_ledger"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_workspaceId_createdAt_idx" ON "audit_logs"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "partners_workspaceId_active_kind_idx" ON "partners"("workspaceId", "active", "kind");

-- CreateIndex
CREATE INDEX "guides_workspaceId_active_idx" ON "guides"("workspaceId", "active");

-- CreateIndex
CREATE INDEX "hotels_workspaceId_active_idx" ON "hotels"("workspaceId", "active");

-- CreateIndex
CREATE INDEX "vehicles_workspaceId_active_idx" ON "vehicles"("workspaceId", "active");

-- CreateIndex
CREATE INDEX "drivers_workspaceId_active_idx" ON "drivers"("workspaceId", "active");

-- CreateIndex
CREATE INDEX "shopping_centers_workspaceId_active_idx" ON "shopping_centers"("workspaceId", "active");

-- CreateIndex
CREATE INDEX "tour_teams_workspaceId_status_startDate_idx" ON "tour_teams"("workspaceId", "status", "startDate");

-- CreateIndex
CREATE INDEX "tour_teams_workspaceId_deletedAt_idx" ON "tour_teams"("workspaceId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tour_teams_workspaceId_year_month_teamNo_key" ON "tour_teams"("workspaceId", "year", "month", "teamNo");

-- CreateIndex
CREATE INDEX "team_guide_assignments_workspaceId_teamId_idx" ON "team_guide_assignments"("workspaceId", "teamId");

-- CreateIndex
CREATE INDEX "team_guide_assignments_workspaceId_guideId_startDate_idx" ON "team_guide_assignments"("workspaceId", "guideId", "startDate");

-- CreateIndex
CREATE INDEX "team_hotel_stays_workspaceId_hotelId_checkIn_idx" ON "team_hotel_stays"("workspaceId", "hotelId", "checkIn");

-- CreateIndex
CREATE INDEX "team_hotel_stays_workspaceId_teamId_idx" ON "team_hotel_stays"("workspaceId", "teamId");

-- CreateIndex
CREATE INDEX "team_vehicle_assignments_workspaceId_vehicleId_startDate_idx" ON "team_vehicle_assignments"("workspaceId", "vehicleId", "startDate");

-- CreateIndex
CREATE INDEX "team_vehicle_assignments_workspaceId_teamId_idx" ON "team_vehicle_assignments"("workspaceId", "teamId");

-- CreateIndex
CREATE INDEX "guide_settlements_workspaceId_periodYear_periodMonth_idx" ON "guide_settlements"("workspaceId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "guide_settlements_workspaceId_guideId_idx" ON "guide_settlements"("workspaceId", "guideId");

-- CreateIndex
CREATE INDEX "guide_settlements_workspaceId_status_idx" ON "guide_settlements"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "guide_settlement_payments_workspaceId_settlementId_idx" ON "guide_settlement_payments"("workspaceId", "settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_settlements_vehicleAssignmentId_key" ON "vehicle_settlements"("vehicleAssignmentId");

-- CreateIndex
CREATE INDEX "vehicle_settlements_workspaceId_periodYear_periodMonth_idx" ON "vehicle_settlements"("workspaceId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "vehicle_settlements_workspaceId_vehicleId_idx" ON "vehicle_settlements"("workspaceId", "vehicleId");

-- CreateIndex
CREATE INDEX "vehicle_settlement_payments_workspaceId_settlementId_idx" ON "vehicle_settlement_payments"("workspaceId", "settlementId");

-- CreateIndex
CREATE INDEX "shopping_sales_workspaceId_centerId_visitDate_idx" ON "shopping_sales"("workspaceId", "centerId", "visitDate");

-- CreateIndex
CREATE INDEX "shopping_sales_workspaceId_guideId_visitDate_idx" ON "shopping_sales"("workspaceId", "guideId", "visitDate");

-- CreateIndex
CREATE INDEX "shopping_commissions_workspaceId_centerId_periodYear_period_idx" ON "shopping_commissions"("workspaceId", "centerId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "finance_wallets_workspaceId_kind_active_idx" ON "finance_wallets"("workspaceId", "kind", "active");

-- CreateIndex
CREATE INDEX "finance_ledger_lines_workspaceId_walletId_lineDatetime_idx" ON "finance_ledger_lines"("workspaceId", "walletId", "lineDatetime");

-- CreateIndex
CREATE INDEX "finance_ledger_lines_workspaceId_transferGroupId_idx" ON "finance_ledger_lines"("workspaceId", "transferGroupId");

-- CreateIndex
CREATE INDEX "receivables_workspaceId_status_dueDate_idx" ON "receivables"("workspaceId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "receivables_workspaceId_partnerId_idx" ON "receivables"("workspaceId", "partnerId");

-- CreateIndex
CREATE INDEX "receivables_workspaceId_periodYear_periodMonth_idx" ON "receivables"("workspaceId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "receivable_payments_workspaceId_receivableId_idx" ON "receivable_payments"("workspaceId", "receivableId");

-- CreateIndex
CREATE INDEX "expenses_workspaceId_status_expenseDate_idx" ON "expenses"("workspaceId", "status", "expenseDate");

-- CreateIndex
CREATE INDEX "expense_attachments_workspaceId_expenseId_idx" ON "expense_attachments"("workspaceId", "expenseId");

-- CreateIndex
CREATE INDEX "exchange_rates_workspaceId_baseCurrency_effectiveDate_idx" ON "exchange_rates"("workspaceId", "baseCurrency", "effectiveDate");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planCode_fkey" FOREIGN KEY ("planCode") REFERENCES "plans"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_credit_ledger" ADD CONSTRAINT "ai_credit_ledger_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_centers" ADD CONSTRAINT "shopping_centers_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_teams" ADD CONSTRAINT "tour_teams_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_teams" ADD CONSTRAINT "tour_teams_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_guide_assignments" ADD CONSTRAINT "team_guide_assignments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_guide_assignments" ADD CONSTRAINT "team_guide_assignments_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "tour_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_guide_assignments" ADD CONSTRAINT "team_guide_assignments_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "guides"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_hotel_stays" ADD CONSTRAINT "team_hotel_stays_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_hotel_stays" ADD CONSTRAINT "team_hotel_stays_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "tour_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_hotel_stays" ADD CONSTRAINT "team_hotel_stays_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_vehicle_assignments" ADD CONSTRAINT "team_vehicle_assignments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_vehicle_assignments" ADD CONSTRAINT "team_vehicle_assignments_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "tour_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_vehicle_assignments" ADD CONSTRAINT "team_vehicle_assignments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_vehicle_assignments" ADD CONSTRAINT "team_vehicle_assignments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_settlements" ADD CONSTRAINT "guide_settlements_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_settlements" ADD CONSTRAINT "guide_settlements_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "tour_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_settlements" ADD CONSTRAINT "guide_settlements_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "guides"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_settlements" ADD CONSTRAINT "guide_settlements_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_settlement_payments" ADD CONSTRAINT "guide_settlement_payments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_settlement_payments" ADD CONSTRAINT "guide_settlement_payments_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "guide_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_settlements" ADD CONSTRAINT "vehicle_settlements_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_settlements" ADD CONSTRAINT "vehicle_settlements_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "tour_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_settlements" ADD CONSTRAINT "vehicle_settlements_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_settlements" ADD CONSTRAINT "vehicle_settlements_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_settlements" ADD CONSTRAINT "vehicle_settlements_vehicleAssignmentId_fkey" FOREIGN KEY ("vehicleAssignmentId") REFERENCES "team_vehicle_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_settlement_payments" ADD CONSTRAINT "vehicle_settlement_payments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_settlement_payments" ADD CONSTRAINT "vehicle_settlement_payments_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "vehicle_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_sales" ADD CONSTRAINT "shopping_sales_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_sales" ADD CONSTRAINT "shopping_sales_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "tour_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_sales" ADD CONSTRAINT "shopping_sales_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "guides"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_sales" ADD CONSTRAINT "shopping_sales_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "shopping_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_commissions" ADD CONSTRAINT "shopping_commissions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_commissions" ADD CONSTRAINT "shopping_commissions_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "shopping_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_commissions" ADD CONSTRAINT "shopping_commissions_shoppingSaleId_fkey" FOREIGN KEY ("shoppingSaleId") REFERENCES "shopping_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_wallets" ADD CONSTRAINT "finance_wallets_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ledger_lines" ADD CONSTRAINT "finance_ledger_lines_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_ledger_lines" ADD CONSTRAINT "finance_ledger_lines_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "finance_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "tour_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "receivables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "tour_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_attachments" ADD CONSTRAINT "expense_attachments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_attachments" ADD CONSTRAINT "expense_attachments_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
