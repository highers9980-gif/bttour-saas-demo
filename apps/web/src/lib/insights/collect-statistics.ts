import { prisma } from '@bttour/db';
import { computeReceivableBalance, type MonthlyInsightStatistics } from '@bttour/shared';

interface CollectStatisticsInput {
  workspaceId: string;
  periodYear: number;
  periodMonth: number;
}

function periodLabel(year: number, month: number) {
  return `${year}년 ${month}월`;
}

function previousPeriod(year: number, month: number) {
  if (month === 1) return { periodYear: year - 1, periodMonth: 12 };
  return { periodYear: year, periodMonth: month - 1 };
}

function monthRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

function pct(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function add(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

async function collectMonthCore({ periodMonth, periodYear, workspaceId }: CollectStatisticsInput) {
  const { start, end } = monthRange(periodYear, periodMonth);

  const [
    workspace,
    teamCount,
    shoppingCommissions,
    guideSettlements,
    vehicleSettlements,
    expenses,
    receivables,
  ] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId } }),
    prisma.tourTeam.count({
      where: { workspaceId, deletedAt: null, year: periodYear, month: periodMonth },
    }),
    prisma.shoppingCommission.findMany({
      where: { workspaceId, deletedAt: null, periodYear, periodMonth },
      include: { sale: { include: { team: { include: { partner: true } } } } },
    }),
    prisma.guideSettlement.findMany({
      where: { workspaceId, deletedAt: null, periodYear, periodMonth },
      include: { guide: true, team: true },
    }),
    prisma.vehicleSettlement.findMany({
      where: { workspaceId, deletedAt: null, periodYear, periodMonth },
    }),
    prisma.expense.findMany({
      where: { workspaceId, deletedAt: null, expenseDate: { gte: start, lte: end } },
    }),
    prisma.receivable.findMany({
      where: { workspaceId, deletedAt: null, periodYear, periodMonth },
      include: { payments: true },
    }),
  ]);

  const revenueTotal = shoppingCommissions.reduce(
    (sum, commission) => sum + commission.commissionWon,
    0,
  );

  const partnerMap = new Map<string, number>();
  shoppingCommissions.forEach((commission) => {
    const team = commission.sale?.team;
    const name = team?.partner?.name ?? team?.partnerNameSnapshot ?? team?.agentLabel ?? '미지정';
    add(partnerMap, name, commission.commissionWon);
  });

  const directExpenseTotal = expenses.reduce(
    (sum, expense) => sum + expense.amountMinor + expense.vatMinor,
    0,
  );
  const guideCost = guideSettlements.reduce((sum, settlement) => sum + settlement.totalWon, 0);
  const vehicleCost = vehicleSettlements.reduce(
    (sum, settlement) => sum + settlement.totalWithVatWon,
    0,
  );

  const categoryMap = new Map<string, number>();
  expenses.forEach((expense) => {
    add(categoryMap, expense.category ?? '미분류 비용', expense.amountMinor + expense.vatMinor);
  });
  if (guideCost > 0) add(categoryMap, '가이드 정산', guideCost);
  if (vehicleCost > 0) add(categoryMap, '차량비 정산', vehicleCost);

  const guideMap = new Map<string, { teamIds: Set<string>; settlementMinor: number }>();
  guideSettlements.forEach((settlement) => {
    const name = settlement.guide?.name ?? settlement.guideNameSnapshot;
    const current = guideMap.get(name) ?? { teamIds: new Set<string>(), settlementMinor: 0 };
    if (settlement.teamId) current.teamIds.add(settlement.teamId);
    current.settlementMinor += settlement.totalWon;
    guideMap.set(name, current);
  });

  const today = new Date();
  const totalOutstandingMinor = receivables
    .filter((receivable) => receivable.currencyCode === 'KRW')
    .reduce(
      (sum, receivable) =>
        sum +
        computeReceivableBalance({
          amountMinor: receivable.amountMinor,
          payments: receivable.payments,
        }),
      0,
    );
  const overdueCount = receivables.filter((receivable) => {
    if (!receivable.dueDate) return false;
    const balance = computeReceivableBalance({
      amountMinor: receivable.amountMinor,
      payments: receivable.payments,
    });
    return balance > 0 && receivable.dueDate < today;
  }).length;

  return {
    workspaceName: workspace?.bizName ?? workspace?.name ?? '워크스페이스',
    periodLabel: periodLabel(periodYear, periodMonth),
    revenue: {
      totalMinor: revenueTotal,
      teamCount,
      topPartners: Array.from(partnerMap.entries())
        .map(([name, amountMinor]) => ({ name, amountMinor }))
        .sort((a, b) => b.amountMinor - a.amountMinor)
        .slice(0, 5),
    },
    expense: {
      totalMinor: directExpenseTotal + guideCost + vehicleCost,
      topCategories: Array.from(categoryMap.entries())
        .map(([name, amountMinor]) => ({ name, amountMinor }))
        .sort((a, b) => b.amountMinor - a.amountMinor)
        .slice(0, 5),
    },
    guides: Array.from(guideMap.entries())
      .map(([name, value]) => ({
        name,
        teamCount: value.teamIds.size,
        settlementMinor: value.settlementMinor,
      }))
      .sort((a, b) => b.settlementMinor - a.settlementMinor)
      .slice(0, 10),
    receivables: { totalOutstandingMinor, overdueCount },
  };
}

export async function collectStatistics(
  input: CollectStatisticsInput,
): Promise<MonthlyInsightStatistics> {
  const current = await collectMonthCore(input);
  const previous = await collectMonthCore({
    workspaceId: input.workspaceId,
    ...previousPeriod(input.periodYear, input.periodMonth),
  });

  return {
    ...current,
    momChange: {
      revenueDeltaPct: pct(current.revenue.totalMinor, previous.revenue.totalMinor),
      expenseDeltaPct: pct(current.expense.totalMinor, previous.expense.totalMinor),
    },
  };
}
