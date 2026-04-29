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
  canConfirmSettlement,
  canExportData,
  canMutateSettlement,
  computeSettlementBalance,
  formatWonDisplay,
  normalizeWonInput,
  validateSettlementPayment,
} from '@bttour/shared';
import { prisma } from '@bttour/db';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { GuidePdfButton } from '@/components/settlement/GuidePdfButton';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';
import {
  GuideSettlementFormButton,
  GuideSettlementPaymentButton,
  type GuideSettlementFormValue,
  type SettlementOption,
} from './GuideSettlementFormButton';

interface GuideSettlementRow {
  id: string;
  guideId?: string;
  guideName: string;
  teamCount: number;
  teamList: string;
  totalWon: number;
  paidTotalWon: number;
  balanceWon: number;
  status: 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  formValue: GuideSettlementFormValue;
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

function monthStartInput(month: string) {
  return `${month}-01`;
}

function monthEndInput(month: string) {
  const [year, monthNo] = month.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, monthNo ?? 1, 0)).toISOString().slice(0, 10);
}

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) || '') || null;
}

function numberFromForm(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key) ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function dateFromForm(formData: FormData, key: string) {
  return new Date(`${String(formData.get(key) ?? '')}T00:00:00.000Z`);
}

function settlementStatusTone(
  status: GuideSettlementRow['status'],
  balanceWon: number,
): 'green' | 'amber' | 'red' | 'slate' {
  if (status === 'CANCELLED') return 'slate';
  if (balanceWon <= 0) return 'green';
  if (balanceWon < Number.MAX_SAFE_INTEGER && status === 'PARTIALLY_PAID') return 'amber';
  return 'red';
}

function settlementStatusLabel(status: GuideSettlementRow['status'], balanceWon: number) {
  if (status === 'CANCELLED') return '취소';
  if (balanceWon <= 0) return '완료';
  if (status === 'PARTIALLY_PAID') return '부분';
  return '미지급';
}

function revalidateGuideSettlement(slug: string) {
  revalidatePath(`/w/${slug}/guide-settlement`);
}

async function lookupSettlementRefs(
  workspaceId: string,
  formData: FormData,
): Promise<{
  guideId: string | null;
  guideNameSnapshot: string;
  partnerId: string | null;
  partnerNameSnapshot: string | null;
  teamId: string | null;
}> {
  const guideId = optionalString(formData, 'guideId');
  const partnerId = optionalString(formData, 'partnerId');
  const teamId = optionalString(formData, 'teamId');
  const [guide, partner, team] = await Promise.all([
    guideId
      ? prisma.guide.findFirst({
          where: { id: guideId, workspaceId, deletedAt: null },
        })
      : null,
    partnerId
      ? prisma.partner.findFirst({
          where: { id: partnerId, workspaceId, deletedAt: null },
        })
      : null,
    teamId
      ? prisma.tourTeam.findFirst({
          where: { id: teamId, workspaceId, deletedAt: null },
        })
      : null,
  ]);

  return {
    guideId: guide?.id ?? null,
    guideNameSnapshot:
      optionalString(formData, 'guideNameSnapshot') ?? guide?.name ?? '미지정 가이드',
    partnerId: partner?.id ?? null,
    partnerNameSnapshot: optionalString(formData, 'partnerNameSnapshot') ?? partner?.name ?? null,
    teamId: team?.id ?? null,
  };
}

async function createGuideSettlement(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, userId } = await assertWorkspace(slug, 'MANAGER');
  const refs = await lookupSettlementRefs(workspace.id, formData);

  await prisma.guideSettlement.create({
    data: {
      workspaceId: workspace.id,
      teamId: refs.teamId,
      guideId: refs.guideId,
      guideNameSnapshot: refs.guideNameSnapshot,
      partnerId: refs.partnerId,
      partnerNameSnapshot: refs.partnerNameSnapshot,
      periodYear: numberFromForm(formData, 'periodYear'),
      periodMonth: numberFromForm(formData, 'periodMonth'),
      totalWon: normalizeWonInput(String(formData.get('totalWon') ?? '0')),
      memo: optionalString(formData, 'memo'),
      createdById: userId,
      updatedById: userId,
      status: 'DRAFT',
    },
  });

  revalidateGuideSettlement(slug);
}

async function updateGuideSettlement(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, userId } = await assertWorkspace(slug, 'MANAGER');
  const refs = await lookupSettlementRefs(workspace.id, formData);

  await prisma.guideSettlement.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: {
      teamId: refs.teamId,
      guideId: refs.guideId,
      guideNameSnapshot: refs.guideNameSnapshot,
      partnerId: refs.partnerId,
      partnerNameSnapshot: refs.partnerNameSnapshot,
      periodYear: numberFromForm(formData, 'periodYear'),
      periodMonth: numberFromForm(formData, 'periodMonth'),
      totalWon: normalizeWonInput(String(formData.get('totalWon') ?? '0')),
      memo: optionalString(formData, 'memo'),
      updatedById: userId,
    },
  });

  revalidateGuideSettlement(slug);
}

async function cancelGuideSettlement(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, userId } = await assertWorkspace(slug, 'ADMIN');
  await prisma.guideSettlement.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: { status: 'CANCELLED', deletedAt: new Date(), updatedById: userId },
  });
  revalidateGuideSettlement(slug);
}

async function addGuideSettlementPayment(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  const settlement = await prisma.guideSettlement.findFirst({
    where: {
      id: String(formData.get('settlementId') ?? ''),
      workspaceId: workspace.id,
      deletedAt: null,
    },
    include: { payments: true },
  });
  if (!settlement) return;

  const amountWon = normalizeWonInput(String(formData.get('amountWon') ?? '0'));
  const balance = computeSettlementBalance(settlement.totalWon, settlement.payments);
  validateSettlementPayment({
    totalWon: settlement.totalWon,
    paidSoFarWon: balance.paidTotalWon,
    nextPaymentWon: amountWon,
  });

  await prisma.$transaction(async (tx) => {
    await tx.guideSettlementPayment.create({
      data: {
        workspaceId: workspace.id,
        settlementId: settlement.id,
        amountWon,
        paidAt: dateFromForm(formData, 'paidAt'),
        note: optionalString(formData, 'note'),
      },
    });

    const nextBalanceWon = settlement.totalWon - balance.paidTotalWon - amountWon;
    await tx.guideSettlement.update({
      where: { id: settlement.id },
      data: {
        status: nextBalanceWon <= 0 ? 'PAID' : 'PARTIALLY_PAID',
      },
    });
  });

  revalidateGuideSettlement(slug);
}

async function confirmGuideSettlement(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, userId } = await assertWorkspace(slug, 'ADMIN');
  await prisma.guideSettlement.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id, status: 'DRAFT' },
    data: {
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      confirmedById: userId,
      updatedById: userId,
    },
  });
  revalidateGuideSettlement(slug);
}

export default async function GuideSettlementPage({
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
  const canConfirm = canConfirmSettlement(role);
  const canCancel = canCancelSettlement(role);
  const canExport = canExportData(role);
  const defaultPeriodStart = monthStartInput(month);
  const defaultPeriodEnd = monthEndInput(month);

  const [settlements, guides, partners, teams] = await Promise.all([
    prisma.guideSettlement.findMany({
      where: {
        workspaceId: workspace.id,
        deletedAt: null,
        periodYear: year,
        periodMonth: monthNo,
      },
      include: {
        guide: true,
        partner: true,
        team: true,
        payments: true,
      },
      orderBy: [{ guideNameSnapshot: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.guide.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, active: true },
      orderBy: { name: 'asc' },
    }),
    prisma.partner.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, active: true },
      orderBy: { name: 'asc' },
    }),
    prisma.tourTeam.findMany({
      where: {
        workspaceId: workspace.id,
        deletedAt: null,
        year,
        month: monthNo,
      },
      include: { partner: true },
      orderBy: [{ teamNo: 'asc' }],
    }),
  ]);

  const guideOptions: SettlementOption[] = guides.map((guide) => ({
    id: guide.id,
    label: guide.name,
  }));
  const partnerOptions: SettlementOption[] = partners.map((partner) => ({
    id: partner.id,
    label: partner.name,
  }));
  const teamOptions: SettlementOption[] = teams.map((team) => ({
    id: team.id,
    label:
      `#${team.teamNo} ${team.partner?.name ?? team.partnerNameSnapshot ?? team.agentLabel ?? ''}`.trim(),
  }));

  const rows: GuideSettlementRow[] = settlements.map((settlement) => {
    const balance = computeSettlementBalance(settlement.totalWon, settlement.payments);
    return {
      id: settlement.id,
      guideId: settlement.guideId ?? undefined,
      guideName: settlement.guide?.name ?? settlement.guideNameSnapshot,
      teamCount: settlement.team ? 1 : 0,
      teamList: settlement.team ? `#${settlement.team.teamNo}` : '-',
      totalWon: settlement.totalWon,
      paidTotalWon: balance.paidTotalWon,
      balanceWon: balance.balanceWon,
      status: settlement.status,
      formValue: {
        id: settlement.id,
        guideId: settlement.guideId ?? undefined,
        teamId: settlement.teamId ?? undefined,
        partnerId: settlement.partnerId ?? undefined,
        guideNameSnapshot: settlement.guideNameSnapshot,
        partnerNameSnapshot: settlement.partnerNameSnapshot ?? undefined,
        periodYear: settlement.periodYear,
        periodMonth: settlement.periodMonth,
        totalWon: settlement.totalWon,
        memo: settlement.memo ?? undefined,
      },
    };
  });

  const totalWon = settlements.reduce((sum, settlement) => sum + settlement.totalWon, 0);
  const paidWon = rows.reduce((sum, row) => sum + row.paidTotalWon, 0);
  const balanceWon = rows.reduce((sum, row) => sum + row.balanceWon, 0);
  const unpaidCount = rows.filter((row) => row.balanceWon > 0).length;

  const columns = [
    {
      key: 'guide',
      header: '가이드',
      cell: (row: GuideSettlementRow) => <Badge tone="pink">{row.guideName}</Badge>,
    },
    {
      key: 'teamCount',
      header: '팀수',
      cell: (row: GuideSettlementRow) => `${row.teamCount}팀`,
    },
    { key: 'teamList', header: '담당 팀', cell: (row: GuideSettlementRow) => row.teamList },
    {
      key: 'totalWon',
      header: '정산 금액',
      align: 'right' as const,
      cell: (row: GuideSettlementRow) => formatWonDisplay(row.totalWon, { roundStep: 5000 }),
    },
    {
      key: 'paidTotalWon',
      header: '지급 완료',
      align: 'right' as const,
      cell: (row: GuideSettlementRow) => formatWonDisplay(row.paidTotalWon, { roundStep: 5000 }),
    },
    {
      key: 'balanceWon',
      header: '잔액',
      align: 'right' as const,
      cell: (row: GuideSettlementRow) =>
        row.balanceWon > 0 ? (
          <span className="font-bold text-red-600">
            {formatWonDisplay(row.balanceWon, { roundStep: 5000 })}
          </span>
        ) : (
          <span className="text-slate-400">-</span>
        ),
    },
    {
      key: 'status',
      header: '상태',
      cell: (row: GuideSettlementRow) => (
        <Badge tone={settlementStatusTone(row.status, row.balanceWon)}>
          {settlementStatusLabel(row.status, row.balanceWon)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '액션',
      align: 'right' as const,
      cell: (row: GuideSettlementRow) => (
        <div className="flex justify-end gap-2">
          {canExport && row.guideId && (
            <GuidePdfButton
              canExport={canExport}
              defaultPeriodEnd={defaultPeriodEnd}
              defaultPeriodStart={defaultPeriodStart}
              guideId={row.guideId}
              guideName={row.guideName}
              workspaceSlug={params.slug}
            />
          )}
          <GuideSettlementFormButton
            action={updateGuideSettlement}
            canMutate={canMutate}
            defaultMonth={monthNo}
            defaultYear={year}
            guides={guideOptions}
            partners={partnerOptions}
            teams={teamOptions}
            value={row.formValue}
            workspaceSlug={params.slug}
          />
          <GuideSettlementPaymentButton
            action={addGuideSettlementPayment}
            balanceWon={row.balanceWon}
            canMutate={canMutate}
            settlementId={row.id}
            workspaceSlug={params.slug}
          />
          <form action={confirmGuideSettlement}>
            <input type="hidden" name="workspaceSlug" value={params.slug} />
            <input type="hidden" name="id" value={row.id} />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              disabled={!canConfirm || row.status !== 'DRAFT'}
            >
              확정
            </Button>
          </form>
          <form action={cancelGuideSettlement}>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-navy-900">가이드 정산</h1>
          <p className="text-xs text-slate-500">
            {month.replace('-', '년 ')}월 · {rows.length}건 정산 · 미지급 {unpaidCount}건
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled>
            일괄 카톡 발송
          </Button>
          <GuideSettlementFormButton
            action={createGuideSettlement}
            canMutate={canMutate}
            defaultMonth={monthNo}
            defaultYear={year}
            guides={guideOptions}
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
              href={`/w/${params.slug}/guide-settlement?month=${shiftMonth(month, -1)}`}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              ‹
            </Link>
            <span className="px-3 text-lg font-bold text-navy-900 num-tabular">
              {month.replace('-', '년 ')}월
            </span>
            <Link
              href={`/w/${params.slug}/guide-settlement?month=${shiftMonth(month, 1)}`}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              ›
            </Link>
          </>
        }
        secondary={
          <select className="h-11 rounded-lg border border-slate-300 px-3 text-base md:text-sm">
            <option>가이드: 전체</option>
            {guideOptions.map((guide) => (
              <option key={guide.id}>{guide.label}</option>
            ))}
          </select>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="정산 합계"
          value={formatWonDisplay(totalWon, { roundStep: 5000 })}
          unit="원"
        />
        <KpiCard
          label="지급 완료"
          value={formatWonDisplay(paidWon, { roundStep: 5000 })}
          unit="원"
          className="border-green-100"
        />
        <KpiCard
          label="미지급"
          value={formatWonDisplay(balanceWon, { roundStep: 5000 })}
          unit={`원 (${unpaidCount}건)`}
          className="border-amber-200 bg-amber-50"
        />
      </div>

      <Card padding="none" className="hidden overflow-hidden md:block">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          empty={
            <EmptyState
              title="등록된 가이드 정산이 없습니다"
              description="정산 등록 버튼으로 이번 달 가이드 정산을 입력하세요."
            />
          }
        />
      </Card>

      <MobileCardList
        className="md:hidden"
        rows={rows}
        rowKey={(row) => row.id}
        empty={<EmptyState title="등록된 가이드 정산이 없습니다" />}
        renderCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-navy-900">{row.guideName}</div>
                <div className="text-xs text-slate-500">{row.teamList}</div>
              </div>
              <Badge tone={settlementStatusTone(row.status, row.balanceWon)}>
                {settlementStatusLabel(row.status, row.balanceWon)}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-slate-500">정산</div>
                <div className="font-semibold">
                  {formatWonDisplay(row.totalWon, { roundStep: 5000 })}
                </div>
              </div>
              <div>
                <div className="text-slate-500">지급</div>
                <div className="font-semibold">
                  {formatWonDisplay(row.paidTotalWon, { roundStep: 5000 })}
                </div>
              </div>
              <div>
                <div className="text-slate-500">잔액</div>
                <div className="font-semibold text-red-600">
                  {formatWonDisplay(row.balanceWon, { roundStep: 5000 })}
                </div>
              </div>
            </div>
            {canExport && row.guideId && (
              <div className="flex justify-end">
                <GuidePdfButton
                  canExport={canExport}
                  defaultPeriodEnd={defaultPeriodEnd}
                  defaultPeriodStart={defaultPeriodStart}
                  guideId={row.guideId}
                  guideName={row.guideName}
                  workspaceSlug={params.slug}
                />
              </div>
            )}
          </div>
        )}
      />

      <Card padding="lg" className="border-orange-200 bg-orange-50">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-orange-500 text-lg font-bold text-white">
            AI
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-navy-900">Hermes AI 정산서 자동 생성</h3>
            <p className="text-sm text-slate-600">
              5천원 단위 표시 반올림과 가이드별 잔액 검증은 연결됨. 카톡 발송과 PDF 생성은 Phase
              4에서 연결합니다.
            </p>
          </div>
          <Button disabled>정산서 검토하기</Button>
        </div>
      </Card>
    </div>
  );
}
