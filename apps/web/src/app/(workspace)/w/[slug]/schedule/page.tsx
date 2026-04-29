import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  FilterToolbar,
  KpiCard,
  MobileCardList,
  MonthlyOpsPageShell,
  shiftMonth,
  todayIso,
} from '@bttour/ui';
import { canMutateMaster } from '@bttour/shared';
import { prisma, type Prisma } from '@bttour/db';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';
import { CreateTourTeamButton } from './CreateTourTeamButton';

type ScheduleStatus = 'IN_PROGRESS' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'UNASSIGNED';

interface ScheduleTeamRow {
  id: string;
  teamNo: number;
  agentName: string;
  period: string;
  startDate: string;
  endDate: string;
  originCode?: string;
  originLabel?: string;
  paxDisplay: string;
  paxTotal: number;
  inboundFlightNo?: string;
  outboundFlightNo?: string;
  hotelName?: string;
  guideName?: string;
  status: ScheduleStatus;
}

function parseMonth(raw?: string) {
  const fallback = todayIso().slice(0, 7);
  return raw && /^\d{4}-\d{2}$/.test(raw) ? raw : fallback;
}

function monthBounds(month: string) {
  const [year = new Date().getFullYear(), monthNo = new Date().getMonth() + 1] = month
    .split('-')
    .map(Number);
  return {
    year,
    monthNo,
    start: new Date(Date.UTC(year, monthNo - 1, 1)),
    end: new Date(Date.UTC(year, monthNo, 0, 23, 59, 59, 999)),
  };
}

function dateFromForm(formData: FormData, key: string) {
  return new Date(`${String(formData.get(key) ?? '')}T00:00:00.000Z`);
}

function numberFromForm(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key) ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) || '') || null;
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatPeriod(startDate: Date, endDate: Date) {
  return `${toDateInput(startDate).slice(5).replace('-', '/')}~${toDateInput(endDate)
    .slice(5)
    .replace('-', '/')}`;
}

function paxDisplay(row: { paxAdult: number; paxChild: number; paxTc: number }) {
  const pax = row.paxAdult + row.paxChild;
  return row.paxTc > 0 ? `${pax}+${row.paxTc}` : String(pax);
}

function originTone(originCode?: string): 'blue' | 'amber' | 'green' | 'slate' {
  if (originCode === 'TYO') return 'blue';
  if (originCode === 'BKK') return 'amber';
  if (originCode === 'MNL') return 'green';
  return 'slate';
}

const statusTone: Record<ScheduleStatus, 'green' | 'blue' | 'slate' | 'red'> = {
  IN_PROGRESS: 'green',
  SCHEDULED: 'blue',
  COMPLETED: 'slate',
  CANCELLED: 'red',
  UNASSIGNED: 'red',
};

function statusLabel(status: ScheduleStatus, t: Awaited<ReturnType<typeof getTranslations>>) {
  const key = {
    IN_PROGRESS: 'status.in_progress',
    SCHEDULED: 'status.scheduled',
    COMPLETED: 'status.done',
    CANCELLED: 'common.cancel',
    UNASSIGNED: 'status.unassigned',
  }[status];
  return t(key);
}

function revalidateOps(slug: string) {
  revalidatePath(`/w/${slug}/schedule`);
  revalidatePath(`/w/${slug}/team-timeline`);
  revalidatePath(`/w/${slug}/hotel-calendar`);
}

function teamSnapshot(team: {
  id: string;
  teamNo: number;
  startDate: Date;
  endDate: Date;
  guideAssignments?: Array<{ guideId?: string | null; guideNameSnapshot?: string | null }>;
}) {
  return {
    id: team.id,
    teamNo: team.teamNo,
    startDate: team.startDate.toISOString(),
    endDate: team.endDate.toISOString(),
    guideId: team.guideAssignments?.[0]?.guideId ?? null,
    guideName: team.guideAssignments?.[0]?.guideNameSnapshot ?? null,
  };
}

async function recordScheduleChange({
  afterData,
  beforeData,
  changedById,
  changeType,
  scheduleId,
  workspaceId,
}: {
  afterData?: Prisma.InputJsonObject;
  beforeData?: Prisma.InputJsonObject;
  changedById: string;
  changeType: 'CREATED' | 'UPDATED' | 'DELETED' | 'TIME_CHANGED' | 'GUIDE_CHANGED';
  scheduleId: string;
  workspaceId: string;
}) {
  const settings = await prisma.workspaceAutomationSettings.findUnique({
    where: { workspaceId },
    select: { scheduleChangeNotifyEnabled: true },
  });

  if (!settings?.scheduleChangeNotifyEnabled) return;

  await prisma.scheduleChangeLog.create({
    data: {
      workspaceId,
      scheduleId,
      changeType,
      ...(beforeData ? { beforeData } : {}),
      ...(afterData ? { afterData } : {}),
      changedById,
    },
  });
}

async function createTourTeam(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, userId } = await assertWorkspace(slug, 'MANAGER');
  const partnerId = optionalString(formData, 'partnerId');
  const partner = partnerId
    ? await prisma.partner.findFirst({
        where: { id: partnerId, workspaceId: workspace.id, deletedAt: null },
      })
    : null;

  const team = await prisma.tourTeam.create({
    data: {
      workspaceId: workspace.id,
      year: numberFromForm(formData, 'year'),
      month: numberFromForm(formData, 'month'),
      teamNo: numberFromForm(formData, 'teamNo'),
      partnerId: partner?.id,
      partnerNameSnapshot: optionalString(formData, 'partnerNameSnapshot') ?? partner?.name,
      startDate: dateFromForm(formData, 'startDate'),
      endDate: dateFromForm(formData, 'endDate'),
      paxAdult: numberFromForm(formData, 'paxAdult'),
      paxChild: numberFromForm(formData, 'paxChild'),
      paxTc: numberFromForm(formData, 'paxTc'),
      originCode: optionalString(formData, 'originCode'),
      originLabel: optionalString(formData, 'originCode'),
      flightIn: optionalString(formData, 'flightIn'),
      flightOut: optionalString(formData, 'flightOut'),
      tourType: optionalString(formData, 'tourType'),
      createdById: userId,
      updatedById: userId,
      status: 'SCHEDULED',
    },
  });

  await recordScheduleChange({
    workspaceId: workspace.id,
    scheduleId: team.id,
    changeType: 'CREATED',
    changedById: userId,
    afterData: teamSnapshot(team),
  });

  revalidateOps(slug);
}

async function assignGuide(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, userId } = await assertWorkspace(slug, 'MANAGER');
  const teamId = String(formData.get('teamId') ?? '');
  const guideId = optionalString(formData, 'guideId');
  const [team, guide] = await Promise.all([
    prisma.tourTeam.findFirst({
      where: { id: teamId, workspaceId: workspace.id, deletedAt: null },
      include: {
        guideAssignments: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    }),
    guideId
      ? prisma.guide.findFirst({
          where: { id: guideId, workspaceId: workspace.id, deletedAt: null },
        })
      : null,
  ]);

  if (!team || !guide) return;

  await prisma.teamGuideAssignment.create({
    data: {
      workspaceId: workspace.id,
      teamId: team.id,
      guideId: guide.id,
      guideNameSnapshot: guide.name,
      role: 'LEAD',
      status: 'TENTATIVE',
      startDate: team.startDate,
      endDate: team.endDate,
    },
  });

  await recordScheduleChange({
    workspaceId: workspace.id,
    scheduleId: team.id,
    changeType: 'GUIDE_CHANGED',
    changedById: userId,
    beforeData: teamSnapshot(team),
    afterData: {
      ...teamSnapshot(team),
      guideId: guide.id,
      guideName: guide.name,
    },
  });

  revalidateOps(slug);
}

async function cancelTourTeam(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, userId } = await assertWorkspace(slug, 'MANAGER');
  const team = await prisma.tourTeam.findFirst({
    where: { id: String(formData.get('teamId') ?? ''), workspaceId: workspace.id },
    include: {
      guideAssignments: {
        where: { status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });
  await prisma.tourTeam.updateMany({
    where: { id: String(formData.get('teamId') ?? ''), workspaceId: workspace.id },
    data: { status: 'CANCELLED', deletedAt: new Date(), updatedById: userId },
  });
  if (team) {
    await recordScheduleChange({
      workspaceId: workspace.id,
      scheduleId: team.id,
      changeType: 'DELETED',
      changedById: userId,
      beforeData: teamSnapshot(team),
    });
  }
  revalidateOps(slug);
}

export default async function SchedulePage({
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
  const canMutate = canMutateMaster(role);
  const where = {
    workspaceId: workspace.id,
    deletedAt: null,
    startDate: { lte: end },
    endDate: { gte: start },
  };

  const [
    teams,
    partners,
    guides,
    totalTeams,
    activeTeams,
    scheduledTeams,
    unassignedTeams,
    paxTotals,
  ] = await Promise.all([
    prisma.tourTeam.findMany({
      where,
      include: {
        partner: true,
        guideAssignments: {
          where: { status: { not: 'CANCELLED' } },
          include: { guide: true },
          orderBy: { createdAt: 'asc' },
        },
        hotelStays: {
          where: { status: { not: 'CANCELLED' } },
          include: { hotel: true },
          orderBy: { checkIn: 'asc' },
        },
      },
      orderBy: [{ startDate: 'asc' }, { teamNo: 'asc' }],
    }),
    prisma.partner.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, active: true, kind: 'AGENCY' },
      orderBy: { name: 'asc' },
    }),
    prisma.guide.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, active: true },
      orderBy: { name: 'asc' },
    }),
    prisma.tourTeam.count({ where }),
    prisma.tourTeam.count({ where: { ...where, status: 'IN_PROGRESS' } }),
    prisma.tourTeam.count({ where: { ...where, status: 'SCHEDULED' } }),
    prisma.tourTeam.count({
      where: {
        ...where,
        guideAssignments: { none: { status: { not: 'CANCELLED' } } },
      },
    }),
    prisma.tourTeam.aggregate({
      where,
      _sum: { paxAdult: true, paxChild: true, paxTc: true },
    }),
  ]);

  const rows: ScheduleTeamRow[] = teams.map((team) => {
    const guideAssignment = team.guideAssignments[0];
    const hotelStay = team.hotelStays[0];
    const derivedStatus: ScheduleStatus = guideAssignment ? team.status : 'UNASSIGNED';
    return {
      id: team.id,
      teamNo: team.teamNo,
      agentName: team.partner?.name ?? team.partnerNameSnapshot ?? team.agentLabel ?? '-',
      period: formatPeriod(team.startDate, team.endDate),
      startDate: toDateInput(team.startDate),
      endDate: toDateInput(team.endDate),
      originCode: team.originCode ?? undefined,
      originLabel: team.originLabel ?? undefined,
      paxDisplay: paxDisplay(team),
      paxTotal: team.paxAdult + team.paxChild + team.paxTc,
      inboundFlightNo: team.flightIn ?? undefined,
      outboundFlightNo: team.flightOut ?? undefined,
      hotelName: hotelStay?.hotel?.name ?? hotelStay?.hotelNameSnapshot,
      guideName: guideAssignment?.guide?.name ?? guideAssignment?.guideNameSnapshot,
      status: derivedStatus,
    };
  });

  const columns = [
    {
      key: 'teamNo',
      header: '#',
      cell: (team: ScheduleTeamRow) => (
        <span className="font-bold text-navy-900">#{team.teamNo}</span>
      ),
    },
    {
      key: 'agentName',
      header: '에이전트',
      cell: (team: ScheduleTeamRow) => (
        <span className="font-semibold text-slate-700">{team.agentName}</span>
      ),
    },
    { key: 'period', header: '기간', cell: (team: ScheduleTeamRow) => team.period },
    {
      key: 'origin',
      header: '출발지',
      cell: (team: ScheduleTeamRow) => (
        <Badge tone={originTone(team.originCode)}>
          {team.originCode ?? '-'}
          {team.originLabel ? ` · ${team.originLabel}` : ''}
        </Badge>
      ),
    },
    { key: 'pax', header: '인원', cell: (team: ScheduleTeamRow) => team.paxDisplay },
    {
      key: 'inbound',
      header: '입국편',
      cell: (team: ScheduleTeamRow) => team.inboundFlightNo ?? '-',
      hideOnMobile: true,
    },
    {
      key: 'outbound',
      header: '출국편',
      cell: (team: ScheduleTeamRow) => team.outboundFlightNo ?? '-',
      hideOnMobile: true,
    },
    {
      key: 'hotel',
      header: '호텔',
      cell: (team: ScheduleTeamRow) => team.hotelName ?? '-',
      hideOnMobile: true,
    },
    {
      key: 'guide',
      header: '가이드',
      cell: (team: ScheduleTeamRow) =>
        team.guideName ? (
          <Badge tone="pink">{team.guideName}</Badge>
        ) : (
          <form action={assignGuide} className="flex items-center justify-end gap-2">
            <input type="hidden" name="workspaceSlug" value={params.slug} />
            <input type="hidden" name="teamId" value={team.id} />
            <select
              name="guideId"
              disabled={!canMutate || guides.length === 0}
              className="h-8 rounded-lg border border-slate-300 px-2 text-xs"
              defaultValue=""
            >
              <option value="">가이드</option>
              {guides.map((guide) => (
                <option key={guide.id} value={guide.id}>
                  {guide.name}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" disabled={!canMutate || guides.length === 0}>
              배정
            </Button>
          </form>
        ),
    },
    {
      key: 'status',
      header: '상태',
      cell: (team: ScheduleTeamRow) => (
        <Badge tone={statusTone[team.status]}>{statusLabel(team.status, t)}</Badge>
      ),
    },
    {
      key: 'cancel',
      header: '관리',
      align: 'right' as const,
      cell: (team: ScheduleTeamRow) => (
        <form action={cancelTourTeam}>
          <input type="hidden" name="workspaceSlug" value={params.slug} />
          <input type="hidden" name="teamId" value={team.id} />
          <Button type="submit" size="sm" variant="ghost" disabled={!canMutate}>
            취소
          </Button>
        </form>
      ),
    },
  ];

  const totalPax =
    (paxTotals._sum.paxAdult ?? 0) + (paxTotals._sum.paxChild ?? 0) + (paxTotals._sum.paxTc ?? 0);

  return (
    <MonthlyOpsPageShell
      header={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-navy-900">{t('schedule.title')}</h1>
            <p className="text-xs text-slate-500">
              {month.replace('-', '년 ')}월 · {totalTeams}팀 운영중
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm">
              {[t('schedule.view.list'), t('schedule.view.calendar'), t('schedule.view.gantt')].map(
                (label, index) => (
                  <span
                    key={label}
                    className={
                      index === 0
                        ? 'rounded-md bg-white px-3 py-1 font-semibold text-navy-900 shadow-soft'
                        : 'px-3 py-1 text-slate-600'
                    }
                  >
                    {label}
                  </span>
                ),
              )}
            </div>
            <CreateTourTeamButton
              action={createTourTeam}
              canMutate={canMutate}
              month={month}
              partners={partners.map((partner) => ({ id: partner.id, name: partner.name }))}
              workspaceSlug={params.slug}
            />
          </div>
        </div>
      }
      toolbar={
        <FilterToolbar
          primary={
            <>
              <Link
                href={`/w/${params.slug}/schedule?month=${shiftMonth(month, -1)}`}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                ‹
              </Link>
              <span className="px-3 text-lg font-bold text-navy-900 num-tabular">
                {month.replace('-', '년 ')}월
              </span>
              <Link
                href={`/w/${params.slug}/schedule?month=${shiftMonth(month, 1)}`}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                ›
              </Link>
            </>
          }
          secondary={
            <input
              type="text"
              placeholder={t('schedule.search_placeholder')}
              className="h-9 w-56 rounded-lg border border-slate-300 px-3 text-sm"
            />
          }
          extraRow={
            <>
              <select className="h-9 rounded-lg border border-slate-300 px-3 text-sm">
                <option>{t('schedule.filter.guide_all')}</option>
                {guides.map((guide) => (
                  <option key={guide.id}>{guide.name}</option>
                ))}
              </select>
              <select className="h-9 rounded-lg border border-slate-300 px-3 text-sm">
                <option>{t('schedule.filter.origin_all')}</option>
                {[...new Set(rows.map((team) => team.originCode).filter(Boolean))].map((origin) => (
                  <option key={origin}>{origin}</option>
                ))}
              </select>
              <select className="h-9 rounded-lg border border-slate-300 px-3 text-sm">
                <option>{t('schedule.filter.status_all')}</option>
                {['IN_PROGRESS', 'SCHEDULED', 'UNASSIGNED'].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </>
          }
        />
      }
      kpis={
        <div className="grid gap-3 md:grid-cols-5">
          <KpiCard label={t('common.all')} value={totalTeams} />
          <KpiCard
            label={t('status.in_progress')}
            value={activeTeams}
            className="border-green-100"
          />
          <KpiCard label={t('status.scheduled')} value={scheduledTeams} />
          <KpiCard
            label={t('status.unassigned')}
            value={unassignedTeams}
            className="border-amber-200 bg-amber-50"
          />
          <KpiCard label="총 인원" value={totalPax} unit={t('unit.person')} />
        </div>
      }
    >
      <Card padding="none" className="hidden overflow-hidden md:block">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(team) => team.id}
          empty={<EmptyState title={t('common.empty')} />}
        />
      </Card>

      <MobileCardList
        className="md:hidden"
        rows={rows}
        rowKey={(team) => team.id}
        empty={<EmptyState title={t('common.empty')} />}
        renderCard={(team) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-navy-900">
                  #{team.teamNo} {team.agentName}
                </div>
                <div className="text-xs text-slate-500">{team.period}</div>
              </div>
              <Badge tone={statusTone[team.status]}>{statusLabel(team.status, t)}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <Badge tone={originTone(team.originCode)}>
                {team.originCode ?? '-'}
                {team.originLabel ? ` · ${team.originLabel}` : ''}
              </Badge>
              <span>{team.paxDisplay}명</span>
              <span>{team.inboundFlightNo ?? '-'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{team.hotelName ?? '-'}</span>
              {team.guideName ? <Badge tone="pink">{team.guideName}</Badge> : null}
            </div>
          </div>
        )}
      />
    </MonthlyOpsPageShell>
  );
}
