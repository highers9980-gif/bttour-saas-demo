import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  FilterToolbar,
  KpiCard,
  MobileCardList,
  shiftMonth,
  todayIso,
} from '@bttour/ui';
import {
  canCancelSettlement,
  canMutateSettlement,
  computeReceivableBalance,
  formatWonDisplay,
  normalizeWonInput,
} from '@bttour/shared';
import { prisma } from '@bttour/db';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';
import {
  ReceivableFormButton,
  ReceivablePaymentButton,
  type ReceivableFormValue,
  type ReceivableOption,
} from './ReceivableFormButton';

interface ReceivableRow {
  id: string;
  partnerName: string;
  title: string;
  currencyCode: string;
  amountMinor: number;
  paidMinor: number;
  balanceMinor: number;
  daysPastDue: number;
  grade: '완료' | '정상' | '주의' | '연체' | '위험';
  status: 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'WRITTEN_OFF';
  formValue: ReceivableFormValue;
}

function parseMonth(raw?: string) {
  const fallback = todayIso().slice(0, 7);
  return raw && /^\d{4}-\d{2}$/.test(raw) ? raw : fallback;
}

function monthParts(month: string) {
  const [year = new Date().getFullYear(), monthNo = new Date().getMonth() + 1] = month
    .split('-')
    .map(Number);
  return { year, monthNo };
}

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) || '') || null;
}

function numberFromForm(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key) ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function dateFromForm(formData: FormData, key: string) {
  const value = String(formData.get(key) || '');
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function toDateInput(date?: Date | null) {
  return date ? date.toISOString().slice(0, 10) : undefined;
}

function formatMoney(amountMinor: number, currencyCode: string) {
  if (currencyCode === 'KRW') return `${formatWonDisplay(amountMinor, { roundStep: 5000 })}원`;
  return `${new Intl.NumberFormat('ko-KR').format(amountMinor)} ${currencyCode}`;
}

function gradeTone(grade: ReceivableRow['grade']): 'green' | 'amber' | 'orange' | 'red' | 'slate' {
  if (grade === '완료') return 'slate';
  if (grade === '정상') return 'green';
  if (grade === '주의') return 'amber';
  if (grade === '연체') return 'orange';
  return 'red';
}

function agingGrade(balanceMinor: number, daysPastDue: number): ReceivableRow['grade'] {
  if (balanceMinor <= 0) return '완료';
  if (daysPastDue <= 15) return '정상';
  if (daysPastDue <= 30) return '주의';
  if (daysPastDue <= 60) return '연체';
  return '위험';
}

function teamLabel(
  team?: {
    teamNo: number;
    partnerNameSnapshot?: string | null;
    agentLabel?: string | null;
    partner?: { name: string } | null;
  } | null,
) {
  if (!team) return '';
  return `#${team.teamNo} ${team.partner?.name ?? team.partnerNameSnapshot ?? team.agentLabel ?? ''}`.trim();
}

function revalidateReceivables(slug: string) {
  revalidatePath(`/w/${slug}/receivables`);
}

async function lookupRefs(workspaceId: string, formData: FormData) {
  const partnerId = optionalString(formData, 'partnerId');
  const teamId = optionalString(formData, 'teamId');
  const [partner, team] = await Promise.all([
    partnerId
      ? prisma.partner.findFirst({ where: { id: partnerId, workspaceId, deletedAt: null } })
      : null,
    teamId
      ? prisma.tourTeam.findFirst({ where: { id: teamId, workspaceId, deletedAt: null } })
      : null,
  ]);

  return {
    partnerId: partner?.id ?? null,
    partnerNameSnapshot:
      optionalString(formData, 'partnerNameSnapshot') ??
      partner?.name ??
      team?.partnerNameSnapshot ??
      '미지정 거래처',
    teamId: team?.id ?? null,
  };
}

async function createReceivable(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  const refs = await lookupRefs(workspace.id, formData);

  await prisma.receivable.create({
    data: {
      workspaceId: workspace.id,
      teamId: refs.teamId,
      partnerId: refs.partnerId,
      partnerNameSnapshot: refs.partnerNameSnapshot,
      title: String(formData.get('title') ?? ''),
      currencyCode: String(formData.get('currencyCode') || 'KRW').toUpperCase(),
      amountMinor: normalizeWonInput(String(formData.get('amountMinor') ?? '0')),
      periodYear: numberFromForm(formData, 'periodYear'),
      periodMonth: numberFromForm(formData, 'periodMonth'),
      dueDate: dateFromForm(formData, 'dueDate'),
      dueNote: optionalString(formData, 'dueNote'),
      memo: optionalString(formData, 'memo'),
      status: 'OPEN',
    },
  });

  revalidateReceivables(slug);
}

async function updateReceivable(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  const refs = await lookupRefs(workspace.id, formData);

  await prisma.receivable.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: {
      teamId: refs.teamId,
      partnerId: refs.partnerId,
      partnerNameSnapshot: refs.partnerNameSnapshot,
      title: String(formData.get('title') ?? ''),
      currencyCode: String(formData.get('currencyCode') || 'KRW').toUpperCase(),
      amountMinor: normalizeWonInput(String(formData.get('amountMinor') ?? '0')),
      periodYear: numberFromForm(formData, 'periodYear'),
      periodMonth: numberFromForm(formData, 'periodMonth'),
      dueDate: dateFromForm(formData, 'dueDate'),
      dueNote: optionalString(formData, 'dueNote'),
      memo: optionalString(formData, 'memo'),
    },
  });

  revalidateReceivables(slug);
}

async function cancelReceivable(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'ADMIN');
  await prisma.receivable.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: { status: 'WRITTEN_OFF', deletedAt: new Date() },
  });
  revalidateReceivables(slug);
}

async function addReceivablePayment(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  const receivable = await prisma.receivable.findFirst({
    where: {
      id: String(formData.get('receivableId') ?? ''),
      workspaceId: workspace.id,
      deletedAt: null,
    },
    include: { payments: true },
  });
  if (!receivable) return;
  const amountMinor = normalizeWonInput(String(formData.get('amountMinor') ?? '0'));
  const balanceMinor = computeReceivableBalance({
    amountMinor: receivable.amountMinor,
    payments: receivable.payments,
  });
  if (amountMinor <= 0 || amountMinor > balanceMinor) return;

  await prisma.$transaction(async (tx) => {
    await tx.receivablePayment.create({
      data: {
        workspaceId: workspace.id,
        receivableId: receivable.id,
        currencyCode: receivable.currencyCode,
        amountMinor,
        paidAt: dateFromForm(formData, 'paidAt') ?? new Date(),
        note: optionalString(formData, 'note'),
      },
    });
    const nextBalance = balanceMinor - amountMinor;
    await tx.receivable.update({
      where: { id: receivable.id },
      data: { status: nextBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID' },
    });
  });

  revalidateReceivables(slug);
}

export default async function ReceivablesPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { month?: string };
}) {
  const month = parseMonth(searchParams?.month);
  const { year, monthNo } = monthParts(month);
  const { workspace, role } = await requireWorkspace(params.slug, 'VIEWER');
  const canMutate = canMutateSettlement(role);
  const canCancel = canCancelSettlement(role);

  const [receivables, partners, teams] = await Promise.all([
    prisma.receivable.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, periodYear: year, periodMonth: monthNo },
      include: { partner: true, team: { include: { partner: true } }, payments: true },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.partner.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, active: true },
      orderBy: { name: 'asc' },
    }),
    prisma.tourTeam.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, year, month: monthNo },
      include: { partner: true },
      orderBy: { teamNo: 'asc' },
    }),
  ]);

  const partnerOptions: ReceivableOption[] = partners.map((partner) => ({
    id: partner.id,
    label: partner.name,
  }));
  const teamOptions: ReceivableOption[] = teams.map((team) => ({
    id: team.id,
    label: teamLabel(team),
  }));
  const today = new Date(`${todayIso()}T00:00:00.000Z`);

  const rows: ReceivableRow[] = receivables.map((receivable) => {
    const balanceMinor = computeReceivableBalance({
      amountMinor: receivable.amountMinor,
      payments: receivable.payments,
    });
    const paidMinor = receivable.amountMinor - balanceMinor;
    const daysPastDue = receivable.dueDate
      ? Math.max(0, Math.floor((today.getTime() - receivable.dueDate.getTime()) / 86400000))
      : 0;
    const grade = agingGrade(balanceMinor, daysPastDue);
    return {
      id: receivable.id,
      partnerName: receivable.partner?.name ?? receivable.partnerNameSnapshot,
      title: receivable.title,
      currencyCode: receivable.currencyCode,
      amountMinor: receivable.amountMinor,
      paidMinor,
      balanceMinor,
      daysPastDue,
      grade,
      status: receivable.status,
      formValue: {
        id: receivable.id,
        teamId: receivable.teamId ?? undefined,
        partnerId: receivable.partnerId ?? undefined,
        partnerNameSnapshot: receivable.partnerNameSnapshot,
        title: receivable.title,
        currencyCode: receivable.currencyCode,
        amountMinor: receivable.amountMinor,
        periodYear: receivable.periodYear,
        periodMonth: receivable.periodMonth,
        dueDate: toDateInput(receivable.dueDate),
        dueNote: receivable.dueNote ?? undefined,
        memo: receivable.memo ?? undefined,
      },
    };
  });

  const totalBalanceKrw = rows
    .filter((row) => row.currencyCode === 'KRW')
    .reduce((sum, row) => sum + row.balanceMinor, 0);
  const gradeSummary = rows.reduce((map, row) => {
    const current = map.get(row.grade) ?? { count: 0, balanceMinor: 0 };
    map.set(row.grade, {
      count: current.count + 1,
      balanceMinor: current.balanceMinor + row.balanceMinor,
    });
    return map;
  }, new Map<ReceivableRow['grade'], { count: number; balanceMinor: number }>());

  const columns = [
    {
      key: 'partner',
      header: '거래처',
      cell: (row: ReceivableRow) => <strong>{row.partnerName}</strong>,
    },
    { key: 'title', header: '제목', cell: (row: ReceivableRow) => row.title },
    {
      key: 'amount',
      header: '청구액',
      align: 'right' as const,
      cell: (row: ReceivableRow) => formatMoney(row.amountMinor, row.currencyCode),
    },
    {
      key: 'paid',
      header: '입금',
      align: 'right' as const,
      cell: (row: ReceivableRow) => formatMoney(row.paidMinor, row.currencyCode),
    },
    {
      key: 'balance',
      header: '미수',
      align: 'right' as const,
      cell: (row: ReceivableRow) =>
        row.balanceMinor > 0 ? (
          <span className="font-bold text-red-600">
            {formatMoney(row.balanceMinor, row.currencyCode)}
          </span>
        ) : (
          <span className="text-slate-400">-</span>
        ),
    },
    {
      key: 'days',
      header: '경과',
      align: 'center' as const,
      cell: (row: ReceivableRow) => (row.daysPastDue > 0 ? `${row.daysPastDue}일` : '-'),
    },
    {
      key: 'grade',
      header: '등급',
      cell: (row: ReceivableRow) => <Badge tone={gradeTone(row.grade)}>{row.grade}</Badge>,
    },
    {
      key: 'actions',
      header: '액션',
      align: 'right' as const,
      cell: (row: ReceivableRow) => (
        <div className="flex justify-end gap-2">
          <ReceivableFormButton
            action={updateReceivable}
            canMutate={canMutate}
            defaultMonth={monthNo}
            defaultYear={year}
            partners={partnerOptions}
            teams={teamOptions}
            value={row.formValue}
            workspaceSlug={params.slug}
          />
          <ReceivablePaymentButton
            action={addReceivablePayment}
            balanceMinor={row.balanceMinor}
            canMutate={canMutate}
            currencyCode={row.currencyCode}
            receivableId={row.id}
            workspaceSlug={params.slug}
          />
          <form action={cancelReceivable}>
            <input type="hidden" name="workspaceSlug" value={params.slug} />
            <input type="hidden" name="id" value={row.id} />
            <Button type="submit" size="sm" variant="ghost" disabled={!canCancel}>
              취소
            </Button>
          </form>
        </div>
      ),
    },
  ];

  const kpiGrades: ReceivableRow['grade'][] = ['정상', '주의', '연체', '위험'];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-navy-900">미수금 관리</h1>
          <p className="text-xs text-slate-500">
            {rows.length}건 · KRW 미수금 합계 {formatMoney(totalBalanceKrw, 'KRW')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            일괄 독촉 카톡
          </Button>
          <ReceivableFormButton
            action={createReceivable}
            canMutate={canMutate}
            defaultMonth={monthNo}
            defaultYear={year}
            partners={partnerOptions}
            teams={teamOptions}
            workspaceSlug={params.slug}
          />
        </div>
      </div>

      <FilterToolbar
        primary={
          <>
            <Link
              href={`/w/${params.slug}/receivables?month=${shiftMonth(month, -1)}`}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              ‹
            </Link>
            <span className="px-3 text-lg font-bold text-navy-900 num-tabular">
              {month.replace('-', '년 ')}월
            </span>
            <Link
              href={`/w/${params.slug}/receivables?month=${shiftMonth(month, 1)}`}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              ›
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard
          label="총 미수금"
          value={formatWonDisplay(totalBalanceKrw, { roundStep: 5000 })}
          unit="원"
        />
        {kpiGrades.map((grade) => {
          const summary = gradeSummary.get(grade) ?? { count: 0, balanceMinor: 0 };
          return (
            <KpiCard
              key={grade}
              label={grade}
              value={formatWonDisplay(summary.balanceMinor, { roundStep: 5000 })}
              unit="원"
              footer={`${summary.count}건`}
            />
          );
        })}
      </div>

      <Card padding="none" className="hidden overflow-hidden md:block">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          empty={<EmptyState title="등록된 미수금이 없습니다" />}
        />
      </Card>

      <MobileCardList
        className="md:hidden"
        rows={rows}
        rowKey={(row) => row.id}
        empty={<EmptyState title="등록된 미수금이 없습니다" />}
        renderCard={(row) => (
          <div className="space-y-2">
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-bold text-navy-900">{row.partnerName}</div>
                <div className="text-xs text-slate-500">{row.title}</div>
              </div>
              <Badge tone={gradeTone(row.grade)}>{row.grade}</Badge>
            </div>
            <div className="font-semibold text-red-600">
              {formatMoney(row.balanceMinor, row.currencyCode)}
            </div>
          </div>
        )}
      />

      <Card padding="lg" className="border-orange-200 bg-orange-50">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-orange-500 text-lg font-bold text-white">
            AI
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-navy-900">Hermes AI 독촉 메시지</h3>
            <p className="text-sm text-slate-600">
              aging 등급별 메시지 초안 생성은 Phase 4에서 연결합니다. 현재는 미수 잔액과 경과일만
              계산합니다.
            </p>
          </div>
          <Button disabled>메시지 검토</Button>
        </div>
      </Card>
    </div>
  );
}
