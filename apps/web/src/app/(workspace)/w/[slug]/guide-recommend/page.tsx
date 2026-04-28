import { Badge, Card, ConflictBanner, EmptyState, KpiCard, shiftMonth, todayIso } from '@bttour/ui';
import Link from 'next/link';
import { prisma } from '@bttour/db';
import { requireWorkspace } from '@/lib/workspace-guard';

interface Recommendation {
  guideId: string;
  guideName: string;
  score: number;
  originExperience: number;
  activeAssignmentCount: number;
}

function parseMonth(raw?: string) {
  const fallback = todayIso().slice(0, 7);
  return raw && /^\d{4}-\d{2}$/.test(raw) ? raw : fallback;
}

function monthBounds(month: string) {
  const [yearPart, monthPart] = month.split('-');
  const year = Number(yearPart);
  const monthNo = Number(monthPart);
  return {
    start: new Date(Date.UTC(year, monthNo - 1, 1)),
    end: new Date(Date.UTC(year, monthNo, 7, 23, 59, 59, 999)),
    year,
    monthNo,
  };
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart <= bEnd && aEnd >= bStart;
}

function paxLabel(team: { paxAdult: number; paxChild: number; paxInfant: number; paxTc: number }) {
  const total = team.paxAdult + team.paxChild + team.paxInfant + team.paxTc;
  return `${total}명`;
}

function teamLabel(team: {
  teamNo: number;
  partnerNameSnapshot?: string | null;
  agentLabel?: string | null;
  partner?: { name: string } | null;
}) {
  return `#${team.teamNo} ${team.partner?.name ?? team.partnerNameSnapshot ?? team.agentLabel ?? ''}`.trim();
}

function dateLabel(date: Date) {
  return date.toISOString().slice(5, 10).replace('-', '/');
}

function assignmentGuideKey(assignment: { guideId?: string | null; guideNameSnapshot: string }) {
  return assignment.guideId ?? `snapshot:${assignment.guideNameSnapshot}`;
}

export default async function GuideRecommendPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { month?: string };
}) {
  const month = parseMonth(searchParams?.month);
  const { start, end, year, monthNo } = monthBounds(month);
  const { workspace } = await requireWorkspace(params.slug, 'VIEWER');

  const [teams, guides, rangeAssignments, allAssignments] = await Promise.all([
    prisma.tourTeam.findMany({
      where: {
        workspaceId: workspace.id,
        deletedAt: null,
        status: { not: 'CANCELLED' },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      include: { partner: true, guideAssignments: { include: { guide: true } } },
      orderBy: [{ startDate: 'asc' }, { teamNo: 'asc' }],
    }),
    prisma.guide.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, active: true },
      orderBy: { name: 'asc' },
    }),
    prisma.teamGuideAssignment.findMany({
      where: {
        workspaceId: workspace.id,
        status: { not: 'CANCELLED' },
        team: { startDate: { lte: end }, endDate: { gte: start }, deletedAt: null },
      },
      include: { guide: true, team: { include: { partner: true } } },
    }),
    prisma.teamGuideAssignment.findMany({
      where: { workspaceId: workspace.id, status: { not: 'CANCELLED' }, team: { deletedAt: null } },
      include: { team: true },
    }),
  ]);

  const unassignedTeams = teams.filter(
    (team) =>
      team.guideAssignments.length === 0 ||
      team.guideAssignments.some((assignment) => assignment.status === 'TENTATIVE'),
  );
  const assignedTeams = teams.length - unassignedTeams.length;

  const rangeAssignmentCount = new Map<string, number>();
  rangeAssignments.forEach((assignment) => {
    const key = assignmentGuideKey(assignment);
    rangeAssignmentCount.set(key, (rangeAssignmentCount.get(key) ?? 0) + 1);
  });

  const originExperience = new Map<string, Map<string, number>>();
  allAssignments.forEach((assignment) => {
    if (!assignment.guideId || !assignment.team.originCode) return;
    const guideOrigins = originExperience.get(assignment.guideId) ?? new Map<string, number>();
    guideOrigins.set(
      assignment.team.originCode,
      (guideOrigins.get(assignment.team.originCode) ?? 0) + 1,
    );
    originExperience.set(assignment.guideId, guideOrigins);
  });

  const recommendations = new Map<string, Recommendation[]>();
  unassignedTeams.forEach((team) => {
    const candidates = guides
      .map((guide) => {
        const guideAssignments = rangeAssignments.filter(
          (assignment) => assignment.guideId === guide.id,
        );
        const hasConflict = guideAssignments.some((assignment) =>
          overlaps(
            team.startDate,
            team.endDate,
            assignment.team.startDate,
            assignment.team.endDate,
          ),
        );
        if (hasConflict) return null;
        const experience = team.originCode
          ? (originExperience.get(guide.id)?.get(team.originCode) ?? 0)
          : 0;
        const score = (experience > 0 ? 10 : 0) + 5;
        return {
          guideId: guide.id,
          guideName: guide.name,
          score,
          originExperience: experience,
          activeAssignmentCount: rangeAssignmentCount.get(guide.id) ?? 0,
        };
      })
      .filter((candidate): candidate is Recommendation => Boolean(candidate))
      .sort((a, b) => b.score - a.score || a.activeAssignmentCount - b.activeAssignmentCount)
      .slice(0, 5);
    recommendations.set(team.id, candidates);
  });

  const conflictItems = rangeAssignments.flatMap((assignment, index) => {
    const rest = rangeAssignments.slice(index + 1);
    return rest
      .filter(
        (other) =>
          assignmentGuideKey(other) === assignmentGuideKey(assignment) &&
          assignment.teamId !== other.teamId &&
          overlaps(
            assignment.team.startDate,
            assignment.team.endDate,
            other.team.startDate,
            other.team.endDate,
          ),
      )
      .map((other) => ({
        id: `${assignment.id}-${other.id}`,
        severity: 'danger' as const,
        title: `${assignment.guide?.name ?? assignment.guideNameSnapshot} 중복 배정`,
        detail: `${teamLabel(assignment.team)} / ${teamLabel(other.team)} 기간 겹침`,
      }));
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-navy-900">가이드 추천</h1>
          <p className="text-xs text-slate-500">
            {year}년 {monthNo}월 · 범위 {start.toISOString().slice(0, 10)} ~{' '}
            {end.toISOString().slice(0, 10)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/w/${params.slug}/guide-recommend?month=${shiftMonth(month, -1)}`}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 hover:bg-slate-50"
          >
            ‹
          </Link>
          <span className="px-3 text-sm font-bold text-navy-900">{month}</span>
          <Link
            href={`/w/${params.slug}/guide-recommend?month=${shiftMonth(month, 1)}`}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 hover:bg-slate-50"
          >
            ›
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="범위 내 팀" value={teams.length} unit="팀" />
        <KpiCard label="미배정" value={unassignedTeams.length} unit="팀" highlight />
        <KpiCard label="배정 완료" value={assignedTeams} unit="팀" />
        <KpiCard label="활성 가이드" value={guides.length} unit="명" />
      </div>

      <ConflictBanner
        items={conflictItems}
        showWhenEmpty
        emptyMessage="현재 범위의 가이드 중복 배정은 없습니다"
      />

      <Card padding="md" className="flex flex-wrap gap-2">
        <span className="mr-2 self-center text-xs font-semibold text-slate-500">
          활성 가이드 배정 수
        </span>
        {guides.map((guide) => (
          <Badge key={guide.id} tone="cyan">
            {guide.name} · {rangeAssignmentCount.get(guide.id) ?? 0}
          </Badge>
        ))}
      </Card>

      <div className="space-y-3">
        <h2 className="font-bold text-navy-900">미배정 팀 ({unassignedTeams.length})</h2>
        {unassignedTeams.length === 0 ? (
          <EmptyState
            title="추천이 필요한 미배정 팀이 없습니다"
            description="현재 범위의 모든 팀에 가이드가 배정되어 있습니다."
          />
        ) : (
          unassignedTeams.map((team) => {
            const candidates = recommendations.get(team.id) ?? [];
            return (
              <Card
                key={team.id}
                padding="lg"
                className="grid gap-5 border-l-4 border-l-orange-500 lg:grid-cols-[minmax(260px,1fr)_minmax(360px,1.7fr)]"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl font-extrabold leading-none text-navy-900">
                      #{team.teamNo}
                    </span>
                    <span className="font-bold text-slate-700">
                      {team.partner?.name ??
                        team.partnerNameSnapshot ??
                        team.agentLabel ??
                        '미지정'}
                    </span>
                    <Badge tone="blue">
                      {team.originCode ?? 'ORIGIN'} · {team.originLabel ?? '미지정'}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-slate-600">
                    <div>
                      일정 {dateLabel(team.startDate)}~{dateLabel(team.endDate)}
                    </div>
                    <div>인원 {paxLabel(team)}</div>
                    <div>
                      입국 {team.flightIn ?? '-'} · 출국 {team.flightOut ?? '-'}
                    </div>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {candidates.length === 0 ? (
                    <EmptyState title="추천 가능한 가이드가 없습니다" variant="inline" />
                  ) : (
                    candidates.map((candidate, index) => (
                      <div
                        key={candidate.guideId}
                        className={
                          index === 0
                            ? 'rounded-xl border-2 border-navy-900 bg-blue-50 p-3'
                            : 'rounded-xl border border-slate-200 bg-slate-50 p-3'
                        }
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <Badge tone={index === 0 ? 'blue' : 'slate'}>{candidate.guideName}</Badge>
                          <span className="font-bold text-navy-900 num-tabular">
                            {candidate.score}점
                          </span>
                        </div>
                        <div className="text-xs leading-relaxed text-slate-600">
                          같은 출발지 경험 {candidate.originExperience}회 · 현재 범위 배정{' '}
                          {candidate.activeAssignmentCount}건 · 충돌 없음
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
