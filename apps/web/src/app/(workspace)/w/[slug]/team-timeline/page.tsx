import {
  Badge,
  Button,
  ConflictBanner,
  FilterToolbar,
  MobileCardList,
  MonthlyOpsPageShell,
  buildMonthDays,
  dateToDayInMonth,
  shiftMonth,
  todayIso,
  type ConflictBannerItem,
  type MonthGridBarTone,
} from '@bttour/ui';
import { canExportData, canMutateMaster } from '@bttour/shared';
import { prisma } from '@bttour/db';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { requireWorkspace } from '@/lib/workspace-guard';
import { TeamTimelineGrid, type TeamTimelineItem } from './TeamTimelineGrid';

interface AssignmentWindow {
  key: string;
  guideName: string;
  teamId: string;
  teamNo: number;
  startDate: string;
  endDate: string;
}

const toneCycle: MonthGridBarTone[] = [
  'pink',
  'blue',
  'purple',
  'green',
  'amber',
  'cyan',
  'orange',
  'navy',
];

function parseMonth(raw?: string) {
  const fallback = todayIso().slice(0, 7);
  return raw && /^\d{4}-\d{2}$/.test(raw) ? raw : fallback;
}

function monthBounds(month: string) {
  const [year = new Date().getFullYear(), monthNo = new Date().getMonth() + 1] = month
    .split('-')
    .map(Number);
  return {
    start: new Date(Date.UTC(year, monthNo - 1, 1)),
    end: new Date(Date.UTC(year, monthNo, 0, 23, 59, 59, 999)),
  };
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function paxDisplay(row: { paxAdult: number; paxChild: number; paxTc: number }) {
  const pax = row.paxAdult + row.paxChild;
  return row.paxTc > 0 ? `${pax}+${row.paxTc}` : String(pax);
}

function getAgentName(team: {
  partner?: { name: string } | null;
  partnerNameSnapshot?: string | null;
  agentLabel?: string | null;
}) {
  return team.partner?.name ?? team.partnerNameSnapshot ?? team.agentLabel ?? '-';
}

function rangesOverlap(a: AssignmentWindow, b: AssignmentWindow) {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

function buildConflictData(assignments: AssignmentWindow[]) {
  const conflicts = new Map<string, AssignmentWindow[]>();

  for (let i = 0; i < assignments.length; i += 1) {
    for (let j = i + 1; j < assignments.length; j += 1) {
      const left = assignments[i];
      const right = assignments[j];
      if (!left || !right) continue;
      if (left.key !== right.key || !rangesOverlap(left, right)) continue;
      conflicts.set(left.key, [...(conflicts.get(left.key) ?? []), left, right]);
    }
  }

  const conflictKeys = new Set(conflicts.keys());
  const items: ConflictBannerItem[] = [...conflicts.entries()].map(([key, rows]) => {
    const uniqueRows = [...new Map(rows.map((row) => [row.teamId, row])).values()];
    const first = uniqueRows[0];
    if (!first) {
      return {
        id: `guide-conflict-${key}`,
        severity: 'danger',
        title: '가이드 중복 배정 감지',
      };
    }
    return {
      id: `guide-conflict-${key}`,
      severity: 'danger',
      title: `가이드 중복 배정 감지: ${first.guideName}`,
      detail: `${uniqueRows
        .map((row) => `#${row.teamNo}(${row.startDate.slice(5)}~${row.endDate.slice(5)})`)
        .join(', ')} 기간이 겹칩니다.`,
    };
  });

  return { conflictKeys, items };
}

export default async function TeamTimelinePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { month?: string };
}) {
  const t = await getTranslations();
  const month = parseMonth(searchParams?.month);
  const { start, end } = monthBounds(month);
  const { workspace, role } = await requireWorkspace(params.slug, 'VIEWER');
  const days = buildMonthDays(month, todayIso());
  const canResolve = canMutateMaster(role);
  const canExport = canExportData(role);

  const teams = await prisma.tourTeam.findMany({
    where: {
      workspaceId: workspace.id,
      deletedAt: null,
      startDate: { lte: end },
      endDate: { gte: start },
    },
    include: {
      partner: true,
      guideAssignments: {
        where: { status: { not: 'CANCELLED' } },
        include: { guide: true },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ startDate: 'asc' }, { teamNo: 'asc' }],
  });

  const guideToneMap = new Map<string, MonthGridBarTone>();
  const assignmentWindows: AssignmentWindow[] = [];

  const items: TeamTimelineItem[] = teams.map((team) => {
    const assignment = team.guideAssignments[0];
    const startIso = toIsoDate(assignment?.startDate ?? team.startDate);
    const endIso = toIsoDate(assignment?.endDate ?? team.endDate);
    const guideName = assignment?.guide?.name ?? assignment?.guideNameSnapshot;
    const guideKey = assignment?.guideId ?? guideName ?? `unassigned-${team.id}`;

    if (!guideToneMap.has(guideKey)) {
      guideToneMap.set(
        guideKey,
        guideName ? (toneCycle[guideToneMap.size % toneCycle.length] ?? 'navy') : 'slate',
      );
    }

    if (guideName) {
      assignmentWindows.push({
        key: guideKey,
        guideName,
        teamId: team.id,
        teamNo: team.teamNo,
        startDate: startIso,
        endDate: endIso,
      });
    }

    return {
      teamId: team.id,
      teamNo: team.teamNo,
      agentName: getAgentName(team),
      fromDay: dateToDayInMonth(startIso, month) ?? 1,
      toDay: dateToDayInMonth(endIso, month) ?? days.length,
      startDate: startIso,
      endDate: endIso,
      guideName,
      paxDisplay: paxDisplay(team),
      tone: guideToneMap.get(guideKey) ?? 'slate',
    };
  });

  const { conflictKeys, items: conflictItems } = buildConflictData(assignmentWindows);
  const itemsWithWarnings = items.map((item) => {
    const assignment = assignmentWindows.find((row) => row.teamId === item.teamId);
    return assignment && conflictKeys.has(assignment.key) ? { ...item, warning: true } : item;
  });

  const guideSummaries = [...guideToneMap.entries()]
    .filter(([key]) => !key.startsWith('unassigned-'))
    .map(([key, tone]) => {
      const guideAssignments = assignmentWindows.filter((row) => row.key === key);
      return {
        id: key,
        name: guideAssignments[0]?.guideName ?? '-',
        teamCount: guideAssignments.length,
        tone,
        hasConflict: conflictKeys.has(key),
      };
    });

  return (
    <MonthlyOpsPageShell
      header={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-navy-900">{t('schedule.timeline.title')}</h1>
            <p className="text-xs text-slate-500">
              {month.replace('-', '년 ')}월 · 가이드 충돌 {conflictItems.length}건 감지
            </p>
          </div>
          <div className="flex gap-2">
            <select className="h-9 rounded-lg border border-slate-300 px-3 text-sm">
              <option>{t('schedule.filter.guide_all')}</option>
              {guideSummaries.map((guide) => (
                <option key={guide.id}>{guide.name}</option>
              ))}
            </select>
            <Button variant="outline" disabled={!canExport}>
              ↓ {t('common.export')}
            </Button>
          </div>
        </div>
      }
      toolbar={
        <FilterToolbar
          primary={
            <>
              <Link
                href={`/w/${params.slug}/team-timeline?month=${shiftMonth(month, -1)}`}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                ‹
              </Link>
              <span className="px-3 text-lg font-bold text-navy-900 num-tabular">
                {month.replace('-', '년 ')}월
              </span>
              <Link
                href={`/w/${params.slug}/team-timeline?month=${shiftMonth(month, 1)}`}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                ›
              </Link>
            </>
          }
          extraRow={
            <>
              <span className="mr-2 text-xs font-semibold text-slate-500">가이드:</span>
              {guideSummaries.map((guide) => (
                <Badge key={guide.id} tone={guide.tone}>
                  {guide.name} {guide.teamCount}
                  {guide.hasConflict ? ' · !' : ''}
                </Badge>
              ))}
            </>
          }
        />
      }
      banner={
        <ConflictBanner
          items={conflictItems.map((conflict) => ({
            ...conflict,
            action: (
              <Button size="sm" variant="outline" disabled={!canResolve}>
                {t('admin.users.adjust_role')}
              </Button>
            ),
          }))}
          showWhenEmpty
        />
      }
    >
      <div className="hidden md:block">
        <TeamTimelineGrid days={days} items={itemsWithWarnings} month={month} />
      </div>

      <MobileCardList
        className="md:hidden"
        rows={itemsWithWarnings}
        rowKey={(item) => item.teamId}
        renderCard={(item) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-navy-900">
                  #{item.teamNo} {item.agentName}
                </div>
                <div className="text-xs text-slate-500">
                  {item.startDate.slice(5)}~{item.endDate.slice(5)}
                </div>
              </div>
              {item.warning && <Badge tone="red">충돌</Badge>}
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-slate-600">
              <Badge tone={item.tone}>{item.guideName ?? t('status.unassigned')}</Badge>
              <span>{item.paxDisplay}명</span>
            </div>
          </div>
        )}
      />
    </MonthlyOpsPageShell>
  );
}
