import { Badge, Card, DataTable, EmptyState, KpiCard, MobileCardList } from '@bttour/ui';
import { formatWonDisplay } from '@bttour/shared';
import { prisma } from '@bttour/db';
import Link from 'next/link';
import { requireWorkspace } from '@/lib/workspace-guard';

type StatisticsTab = 'guides' | 'agents' | 'hotels' | 'origins';

interface GuideStatsRow {
  guideName: string;
  assignmentCount: number;
  paxCount: number;
  settlementWon: number;
}

interface AgentStatsRow {
  agentName: string;
  teamCount: number;
  paxCount: number;
  revenueWon: number;
  shareLabel: string;
}

interface HotelStatsRow {
  hotelName: string;
  stayCount: number;
  roomNights: number;
  estimatedRevenueWon: number;
}

interface OriginStatsRow {
  originCode: string;
  originLabel: string;
  teamCount: number;
  paxCount: number;
  shareLabel: string;
}

function parseTab(raw?: string): StatisticsTab {
  if (raw === 'agents' || raw === 'hotels' || raw === 'origins') return raw;
  return 'guides';
}

function currentYear() {
  return new Date().getFullYear();
}

function money(amount: number) {
  return `${formatWonDisplay(amount, { roundStep: 5000 })}원`;
}

function paxOf(
  team?: { paxAdult: number; paxChild: number; paxInfant: number; paxTc: number } | null,
) {
  if (!team) return 0;
  return team.paxAdult + team.paxChild + team.paxInfant + team.paxTc;
}

function stayNights(checkIn: Date, checkOut: Date) {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

function ProgressLine({ label, percent }: { label: string; percent: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-bold text-navy-900 num-tabular">{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-navy-900"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}

export default async function StatisticsPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { tab?: string; year?: string };
}) {
  const activeTab = parseTab(searchParams?.tab);
  const year = Number(searchParams?.year ?? currentYear());
  const { workspace } = await requireWorkspace(params.slug, 'VIEWER');
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const [teams, assignments, guideSettlements, shoppingCommissions, hotelStays, guides, agents] =
    await Promise.all([
      prisma.tourTeam.findMany({
        where: { workspaceId: workspace.id, deletedAt: null, year },
        include: { partner: true },
      }),
      prisma.teamGuideAssignment.findMany({
        where: {
          workspaceId: workspace.id,
          team: { year, deletedAt: null },
          status: { not: 'CANCELLED' },
        },
        include: { guide: true, team: true },
      }),
      prisma.guideSettlement.findMany({
        where: { workspaceId: workspace.id, deletedAt: null, periodYear: year },
        include: { guide: true },
      }),
      prisma.shoppingCommission.findMany({
        where: { workspaceId: workspace.id, deletedAt: null, periodYear: year },
        include: { sale: { include: { team: { include: { partner: true } } } } },
      }),
      prisma.teamHotelStay.findMany({
        where: {
          workspaceId: workspace.id,
          checkIn: { gte: yearStart, lte: yearEnd },
          status: { not: 'CANCELLED' },
        },
        include: { hotel: true, team: true },
      }),
      prisma.guide.findMany({
        where: { workspaceId: workspace.id, deletedAt: null, active: true },
      }),
      prisma.partner.findMany({
        where: { workspaceId: workspace.id, deletedAt: null, active: true, kind: 'AGENCY' },
      }),
    ]);

  const totalPax = teams.reduce((sum, team) => sum + paxOf(team), 0);
  const totalRevenue = shoppingCommissions.reduce(
    (sum, commission) => sum + commission.commissionWon,
    0,
  );

  const guideMap = new Map<string, GuideStatsRow>();
  assignments.forEach((assignment) => {
    const name = assignment.guide?.name ?? assignment.guideNameSnapshot;
    const current = guideMap.get(name) ?? {
      guideName: name,
      assignmentCount: 0,
      paxCount: 0,
      settlementWon: 0,
    };
    current.assignmentCount += 1;
    current.paxCount += paxOf(assignment.team);
    guideMap.set(name, current);
  });
  guideSettlements.forEach((settlement) => {
    const name = settlement.guide?.name ?? settlement.guideNameSnapshot;
    const current = guideMap.get(name) ?? {
      guideName: name,
      assignmentCount: 0,
      paxCount: 0,
      settlementWon: 0,
    };
    current.settlementWon += settlement.totalWon;
    guideMap.set(name, current);
  });
  const guideRows = Array.from(guideMap.values()).sort((a, b) => b.settlementWon - a.settlementWon);

  const agentMap = new Map<string, Omit<AgentStatsRow, 'shareLabel'>>();
  teams.forEach((team) => {
    const name = team.partner?.name ?? team.partnerNameSnapshot ?? team.agentLabel ?? '미지정';
    const current = agentMap.get(name) ?? {
      agentName: name,
      teamCount: 0,
      paxCount: 0,
      revenueWon: 0,
    };
    current.teamCount += 1;
    current.paxCount += paxOf(team);
    agentMap.set(name, current);
  });
  shoppingCommissions.forEach((commission) => {
    const team = commission.sale?.team;
    const name = team?.partner?.name ?? team?.partnerNameSnapshot ?? team?.agentLabel ?? '미지정';
    const current = agentMap.get(name) ?? {
      agentName: name,
      teamCount: 0,
      paxCount: 0,
      revenueWon: 0,
    };
    current.revenueWon += commission.commissionWon;
    agentMap.set(name, current);
  });
  const agentRows: AgentStatsRow[] = Array.from(agentMap.values())
    .map((row) => ({
      ...row,
      shareLabel: totalRevenue > 0 ? `${Math.round((row.revenueWon / totalRevenue) * 100)}%` : '-',
    }))
    .sort((a, b) => b.revenueWon - a.revenueWon);

  const hotelMap = new Map<string, HotelStatsRow>();
  hotelStays.forEach((stay) => {
    const name = stay.hotel?.name ?? stay.hotelNameSnapshot;
    const current = hotelMap.get(name) ?? {
      hotelName: name,
      stayCount: 0,
      roomNights: 0,
      estimatedRevenueWon: 0,
    };
    const roomNights = stayNights(stay.checkIn, stay.checkOut) * Math.max(1, stay.roomCount);
    current.stayCount += 1;
    current.roomNights += roomNights;
    current.estimatedRevenueWon += roomNights * 100_000;
    hotelMap.set(name, current);
  });
  const hotelRows = Array.from(hotelMap.values()).sort((a, b) => b.roomNights - a.roomNights);

  const originMap = new Map<string, Omit<OriginStatsRow, 'shareLabel'>>();
  teams.forEach((team) => {
    const key = team.originCode ?? 'UNKNOWN';
    const current = originMap.get(key) ?? {
      originCode: key,
      originLabel: team.originLabel ?? '미지정',
      teamCount: 0,
      paxCount: 0,
    };
    current.teamCount += 1;
    current.paxCount += paxOf(team);
    originMap.set(key, current);
  });
  const originRows: OriginStatsRow[] = Array.from(originMap.values())
    .map((row) => ({
      ...row,
      shareLabel: teams.length > 0 ? `${Math.round((row.teamCount / teams.length) * 100)}%` : '-',
    }))
    .sort((a, b) => b.teamCount - a.teamCount);

  const tabs: Array<{ key: StatisticsTab; label: string }> = [
    { key: 'guides', label: '가이드' },
    { key: 'agents', label: '에이전트' },
    { key: 'hotels', label: '호텔' },
    { key: 'origins', label: '출발지' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-navy-900">통합 통계</h1>
          <p className="text-xs text-slate-500">{year}년 · 가이드·에이전트·호텔·출발지 분석</p>
        </div>
        <Badge tone="slate">실 DB 집계</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="총 팀 수" value={teams.length} unit="팀" />
        <KpiCard
          label="총 인원"
          value={totalPax}
          unit="명"
          footer={`팀당 평균 ${teams.length ? Math.round(totalPax / teams.length) : 0}명`}
        />
        <KpiCard label="활성 가이드" value={guides.length} unit="명" />
        <KpiCard label="거래 에이전트" value={agents.length} unit="곳" />
      </div>

      <div className="flex overflow-x-auto border-b border-slate-200">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/w/${params.slug}/statistics?tab=${tab.key}&year=${year}`}
            className={
              tab.key === activeTab
                ? 'border-b-2 border-navy-900 px-5 py-3 text-sm font-semibold text-navy-900'
                : 'border-b-2 border-transparent px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-700'
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {activeTab === 'guides' && (
        <Card padding="none" className="overflow-hidden">
          <div className="hidden md:block">
            <DataTable
              rows={guideRows}
              rowKey={(row) => row.guideName}
              empty={<EmptyState title="가이드 통계 데이터가 없습니다" />}
              columns={[
                {
                  key: 'guideName',
                  header: '가이드',
                  cell: (row: GuideStatsRow) => <Badge tone="cyan">{row.guideName}</Badge>,
                },
                {
                  key: 'assignmentCount',
                  header: '배정',
                  align: 'right' as const,
                  cell: (row: GuideStatsRow) => row.assignmentCount,
                },
                {
                  key: 'paxCount',
                  header: '인원',
                  align: 'right' as const,
                  cell: (row: GuideStatsRow) => row.paxCount,
                },
                {
                  key: 'settlementWon',
                  header: '정산액',
                  align: 'right' as const,
                  cell: (row: GuideStatsRow) => money(row.settlementWon),
                },
              ]}
            />
          </div>
          <div className="p-4 md:hidden">
            <MobileCardList
              rows={guideRows}
              rowKey={(row) => row.guideName}
              empty={<EmptyState title="가이드 통계 데이터가 없습니다" variant="inline" />}
              renderCard={(row) => (
                <div className="space-y-2">
                  <div className="flex justify-between gap-3">
                    <Badge tone="cyan">{row.guideName}</Badge>
                    <span className="font-bold text-navy-900">{money(row.settlementWon)}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    배정 {row.assignmentCount}건 · 인원 {row.paxCount}명
                  </div>
                </div>
              )}
            />
          </div>
        </Card>
      )}

      {activeTab === 'agents' && (
        <Card padding="none" className="overflow-hidden">
          <div className="hidden md:block">
            <DataTable
              rows={agentRows}
              rowKey={(row) => row.agentName}
              empty={<EmptyState title="에이전트 통계 데이터가 없습니다" />}
              columns={[
                { key: 'agentName', header: '에이전트', cell: (row: AgentStatsRow) => row.agentName },
                {
                  key: 'teamCount',
                  header: '팀',
                  align: 'right' as const,
                  cell: (row: AgentStatsRow) => row.teamCount,
                },
                {
                  key: 'paxCount',
                  header: '인원',
                  align: 'right' as const,
                  cell: (row: AgentStatsRow) => row.paxCount,
                },
                {
                  key: 'revenueWon',
                  header: '쇼핑 매출 기여',
                  align: 'right' as const,
                  cell: (row: AgentStatsRow) => money(row.revenueWon),
                },
                {
                  key: 'shareLabel',
                  header: '비중',
                  align: 'right' as const,
                  cell: (row: AgentStatsRow) => row.shareLabel,
                },
              ]}
            />
          </div>
          <div className="p-4 md:hidden">
            <MobileCardList
              rows={agentRows}
              rowKey={(row) => row.agentName}
              empty={<EmptyState title="에이전트 통계 데이터가 없습니다" variant="inline" />}
              renderCard={(row) => (
                <div className="space-y-2">
                  <div className="flex justify-between gap-3">
                    <span className="font-bold text-navy-900">{row.agentName}</span>
                    <span className="font-bold text-navy-900">{money(row.revenueWon)}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {row.teamCount}팀 · {row.paxCount}명 · 비중 {row.shareLabel}
                  </div>
                </div>
              )}
            />
          </div>
        </Card>
      )}

      {activeTab === 'hotels' && (
        <Card padding="none" className="overflow-hidden">
          <div className="hidden md:block">
            <DataTable
              rows={hotelRows}
              rowKey={(row) => row.hotelName}
              empty={<EmptyState title="호텔 투숙 데이터가 없습니다" />}
              columns={[
                { key: 'hotelName', header: '호텔', cell: (row: HotelStatsRow) => row.hotelName },
                {
                  key: 'stayCount',
                  header: '예약',
                  align: 'right' as const,
                  cell: (row: HotelStatsRow) => row.stayCount,
                },
                {
                  key: 'roomNights',
                  header: '객실박',
                  align: 'right' as const,
                  cell: (row: HotelStatsRow) => row.roomNights,
                },
                {
                  key: 'estimatedRevenueWon',
                  header: '추정 매출',
                  align: 'right' as const,
                  cell: (row: HotelStatsRow) => money(row.estimatedRevenueWon),
                },
              ]}
            />
          </div>
          <div className="p-4 md:hidden">
            <MobileCardList
              rows={hotelRows}
              rowKey={(row) => row.hotelName}
              empty={<EmptyState title="호텔 투숙 데이터가 없습니다" variant="inline" />}
              renderCard={(row) => (
                <div className="space-y-2">
                  <div className="flex justify-between gap-3">
                    <span className="font-bold text-navy-900">{row.hotelName}</span>
                    <span className="font-bold text-navy-900">{money(row.estimatedRevenueWon)}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    예약 {row.stayCount}건 · 객실박 {row.roomNights}
                  </div>
                </div>
              )}
            />
          </div>
        </Card>
      )}

      {activeTab === 'origins' && (
        <Card padding="lg">
          <div className="space-y-4">
            {originRows.length === 0 ? (
              <EmptyState title="출발지 통계 데이터가 없습니다" variant="inline" />
            ) : (
              originRows.map((row) => (
                <ProgressLine
                  key={row.originCode}
                  label={`${row.originCode} · ${row.originLabel} · ${row.teamCount}팀 / ${row.paxCount}명`}
                  percent={Number(row.shareLabel.replace('%', '')) || 0}
                />
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
