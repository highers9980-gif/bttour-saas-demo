import { Badge, Card, DataTable, EmptyState, KpiCard, MobileCardList, todayIso } from '@bttour/ui';
import { computeReceivableBalance, formatWonDisplay } from '@bttour/shared';
import { prisma } from '@bttour/db';
import { requireWorkspace } from '@/lib/workspace-guard';

interface MonthMetric {
  key: string;
  label: string;
  year: number;
  month: number;
  revenueWon: number;
  costWon: number;
  profitWon: number;
  teamCount: number;
}

interface YearMetric {
  year: number;
  revenueWon: number;
  costWon: number;
  profitWon: number;
  teamCount: number;
}

interface GuidePerformanceRow {
  guideName: string;
  teamCount: number;
  paxCount: number;
  totalWon: number;
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parseYear(raw?: string) {
  const currentYear = Number(todayIso().slice(0, 4));
  const year = Number(raw ?? currentYear);
  return Number.isFinite(year) && year >= 2020 && year <= currentYear + 1 ? year : currentYear;
}

function addToMap(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function money(amount: number) {
  return `${formatWonDisplay(amount, { roundStep: 5000 })}원`;
}

function buildRecentMonths(selectedYear: number) {
  const current = todayIso();
  const currentYear = Number(current.slice(0, 4));
  const currentMonth = Number(current.slice(5, 7));
  const endMonth = selectedYear === currentYear ? currentMonth : 12;
  const months: MonthMetric[] = [];

  for (let index = 11; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(selectedYear, endMonth - 1 - index, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    months.push({
      key: monthKey(year, month),
      label: `${String(month).padStart(2, '0')}월`,
      year,
      month,
      revenueWon: 0,
      costWon: 0,
      profitWon: 0,
      teamCount: 0,
    });
  }

  return months;
}

function ProgressBar({
  max,
  tone = 'navy',
  value,
}: {
  max: number;
  tone?: 'navy' | 'orange' | 'green' | 'red';
  value: number;
}) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  const color =
    tone === 'orange'
      ? 'bg-orange-500'
      : tone === 'green'
        ? 'bg-green-500'
        : tone === 'red'
          ? 'bg-red-500'
          : 'bg-navy-900';

  return (
    <div className="h-2 rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export default async function RevenuePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { year?: string };
}) {
  const selectedYear = parseYear(searchParams?.year);
  const previousYear = selectedYear - 1;
  const currentMonth = Number(todayIso().slice(5, 7));
  const selectedMonth = selectedYear === Number(todayIso().slice(0, 4)) ? currentMonth : 12;
  const { workspace } = await requireWorkspace(params.slug, 'VIEWER');
  const recentMonths = buildRecentMonths(selectedYear);
  const years = Array.from(
    new Set([selectedYear, previousYear, ...recentMonths.map((item) => item.year)]),
  );
  const dateStart = new Date(Date.UTC(Math.min(...years), 0, 1));
  const dateEnd = new Date(Date.UTC(Math.max(...years), 11, 31, 23, 59, 59, 999));

  const [
    teamGroups,
    shoppingCommissions,
    guideSettlements,
    vehicleSettlements,
    expenses,
    currentReceivables,
    guideRows,
  ] = await Promise.all([
    prisma.tourTeam.groupBy({
      by: ['year', 'month'],
      where: { workspaceId: workspace.id, deletedAt: null, year: { in: years } },
      _count: { _all: true },
      _sum: { paxAdult: true, paxChild: true, paxInfant: true, paxTc: true },
    }),
    prisma.shoppingCommission.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, periodYear: { in: years } },
    }),
    prisma.guideSettlement.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, periodYear: { in: years } },
      include: { guide: true, team: true },
    }),
    prisma.vehicleSettlement.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, periodYear: { in: years } },
    }),
    prisma.expense.findMany({
      where: {
        workspaceId: workspace.id,
        deletedAt: null,
        expenseDate: { gte: dateStart, lte: dateEnd },
      },
    }),
    prisma.receivable.findMany({
      where: {
        workspaceId: workspace.id,
        deletedAt: null,
        periodYear: selectedYear,
        periodMonth: selectedMonth,
      },
      include: { payments: true },
    }),
    prisma.guideSettlement.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, periodYear: selectedYear },
      include: { guide: true, team: true },
    }),
  ]);

  const revenueByMonth = new Map<string, number>();
  const costByMonth = new Map<string, number>();
  const teamCountByMonth = new Map<string, number>();
  const paxByGuide = new Map<string, number>();

  teamGroups.forEach((group) => {
    teamCountByMonth.set(monthKey(group.year, group.month), group._count._all);
  });
  shoppingCommissions.forEach((commission) => {
    addToMap(
      revenueByMonth,
      monthKey(commission.periodYear, commission.periodMonth),
      commission.commissionWon,
    );
  });
  guideSettlements.forEach((settlement) => {
    addToMap(
      costByMonth,
      monthKey(settlement.periodYear, settlement.periodMonth),
      settlement.totalWon,
    );
  });
  vehicleSettlements.forEach((settlement) => {
    addToMap(
      costByMonth,
      monthKey(settlement.periodYear, settlement.periodMonth),
      settlement.totalWithVatWon,
    );
  });
  expenses.forEach((expense) => {
    addToMap(
      costByMonth,
      monthKey(expense.expenseDate.getUTCFullYear(), expense.expenseDate.getUTCMonth() + 1),
      expense.amountMinor + expense.vatMinor,
    );
  });

  const monthlyRows = recentMonths.map((month) => {
    const revenueWon = revenueByMonth.get(month.key) ?? 0;
    const costWon = costByMonth.get(month.key) ?? 0;
    return {
      ...month,
      revenueWon,
      costWon,
      profitWon: revenueWon - costWon,
      teamCount: teamCountByMonth.get(month.key) ?? 0,
    };
  });
  const maxRevenue = Math.max(...monthlyRows.map((item) => item.revenueWon), 1);
  const maxProfit = Math.max(...monthlyRows.map((item) => Math.abs(item.profitWon)), 1);
  const currentKey = monthKey(selectedYear, selectedMonth);
  const currentRevenue = revenueByMonth.get(currentKey) ?? 0;
  const currentCost = costByMonth.get(currentKey) ?? 0;
  const currentTeamCount = teamCountByMonth.get(currentKey) ?? 0;
  const receivableBalanceWon = currentReceivables.reduce(
    (sum, receivable) =>
      sum +
      computeReceivableBalance({
        amountMinor: receivable.amountMinor,
        payments: receivable.payments,
      }),
    0,
  );

  const yearMetrics: YearMetric[] = [previousYear, selectedYear].map((year) => {
    const keys = Array.from({ length: 12 }, (_, index) => monthKey(year, index + 1));
    const revenueWon = keys.reduce((sum, key) => sum + (revenueByMonth.get(key) ?? 0), 0);
    const costWon = keys.reduce((sum, key) => sum + (costByMonth.get(key) ?? 0), 0);
    const teamCount = keys.reduce((sum, key) => sum + (teamCountByMonth.get(key) ?? 0), 0);
    return { year, revenueWon, costWon, profitWon: revenueWon - costWon, teamCount };
  });
  const maxYearRevenue = Math.max(...yearMetrics.map((item) => item.revenueWon), 1);

  const guideSummary = new Map<string, GuidePerformanceRow>();
  guideRows.forEach((settlement) => {
    const name = settlement.guide?.name ?? settlement.guideNameSnapshot;
    const current = guideSummary.get(name) ?? {
      guideName: name,
      teamCount: 0,
      paxCount: 0,
      totalWon: 0,
    };
    const pax =
      (settlement.team?.paxAdult ?? 0) +
      (settlement.team?.paxChild ?? 0) +
      (settlement.team?.paxInfant ?? 0) +
      (settlement.team?.paxTc ?? 0);
    current.teamCount += settlement.teamId ? 1 : 0;
    current.paxCount += pax;
    current.totalWon += settlement.totalWon;
    guideSummary.set(name, current);
    paxByGuide.set(name, (paxByGuide.get(name) ?? 0) + pax);
  });
  const guidePerformance = Array.from(guideSummary.values())
    .sort((a, b) => b.totalWon - a.totalWon)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-navy-900">매출 · 이익 대시보드</h1>
          <p className="text-xs text-slate-500">
            {selectedYear}년 {selectedMonth}월 기준 · 차트 라이브러리 도입 전 텍스트 막대 뷰
          </p>
        </div>
        <Badge tone="slate">Phase 2E</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="이번달 매출"
          value={formatWonDisplay(currentRevenue, { roundStep: 5000 })}
          unit="원"
          emoji="💰"
        />
        <KpiCard
          label="이번달 이익"
          value={formatWonDisplay(currentRevenue - currentCost, { roundStep: 5000 })}
          unit="원"
          emoji="📈"
          highlight
          footer={`비용 ${money(currentCost)}`}
        />
        <KpiCard label="진행 팀" value={currentTeamCount} unit="팀" emoji="👥" />
        <KpiCard
          label="미수금"
          value={formatWonDisplay(receivableBalanceWon, { roundStep: 5000 })}
          unit="원"
          emoji="💳"
        />
      </div>

      <Card padding="lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-navy-900">최근 12개월 매출 / 이익</h2>
          <div className="flex gap-3 text-xs text-slate-500">
            <span>■ 매출</span>
            <span className="text-orange-600">■ 이익</span>
          </div>
        </div>
        <div className="overflow-x-auto md:overflow-visible">
          <div className="min-w-[600px] space-y-3 md:min-w-0">
            {monthlyRows.map((row) => (
              <div
                key={row.key}
                className="grid snap-start grid-cols-[56px_1fr_1fr_72px] items-center gap-2 text-sm md:grid-cols-[64px_1fr_1fr_92px]"
              >
                <div className="font-semibold text-slate-600">{row.label}</div>
                <ProgressBar max={maxRevenue} value={row.revenueWon} />
                <ProgressBar
                  max={maxProfit}
                  tone={row.profitWon >= 0 ? 'orange' : 'red'}
                  value={Math.abs(row.profitWon)}
                />
                <div className="text-right text-xs font-semibold text-slate-600">
                  {row.teamCount}팀
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="lg">
          <h2 className="mb-4 font-bold text-navy-900">연도별 비교</h2>
          <div className="space-y-4">
            {yearMetrics.map((row) => (
              <div key={row.year} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-navy-900">{row.year}년</span>
                  <span className="num-tabular text-slate-600">
                    매출 {money(row.revenueWon)} · 이익 {money(row.profitWon)}
                  </span>
                </div>
                <ProgressBar max={maxYearRevenue} value={row.revenueWon} />
              </div>
            ))}
          </div>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-navy-900">가이드별 실적 Top 5</h2>
          </div>
          <div className="hidden md:block">
            <DataTable
              rows={guidePerformance}
              rowKey={(row) => row.guideName}
              empty={<EmptyState title="가이드 정산 데이터가 없습니다" variant="inline" />}
              columns={[
                {
                  key: 'guideName',
                  header: '가이드',
                  cell: (row: GuidePerformanceRow) => <Badge tone="cyan">{row.guideName}</Badge>,
                },
                {
                  key: 'teamCount',
                  header: '팀',
                  align: 'right' as const,
                  cell: (row: GuidePerformanceRow) => row.teamCount,
                },
                {
                  key: 'paxCount',
                  header: '인원',
                  align: 'right' as const,
                  cell: (row: GuidePerformanceRow) => row.paxCount,
                },
                {
                  key: 'totalWon',
                  header: '정산액',
                  align: 'right' as const,
                  cell: (row: GuidePerformanceRow) => money(row.totalWon),
                },
              ]}
            />
          </div>
          <div className="p-4 md:hidden">
            <MobileCardList
              rows={guidePerformance}
              rowKey={(row) => row.guideName}
              empty={<EmptyState title="가이드 정산 데이터가 없습니다" variant="inline" />}
              renderCard={(row) => (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone="cyan">{row.guideName}</Badge>
                    <span className="text-sm font-bold text-navy-900">{money(row.totalWon)}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {row.teamCount}팀 · {row.paxCount}명
                  </div>
                </div>
              )}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
