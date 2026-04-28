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
  computeShoppingCommissionTotals,
  computeVat10,
  computeVatIncluded,
  formatWonDisplay,
  normalizeWonInput,
} from '@bttour/shared';
import { prisma } from '@bttour/db';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';
import {
  ShoppingSaleFormButton,
  type ShoppingOption,
  type ShoppingSaleFormValue,
} from './ShoppingSaleFormButton';

interface ShoppingSaleRow {
  id: string;
  dateLabel: string;
  teamLabel: string;
  guideName: string;
  centerName: string;
  category: string;
  paxCount: number;
  buyerCount: number;
  salesWon: number;
  commissionWon: number;
  commissionRatePercent?: number | null;
  conversionRate: string;
  formValue: ShoppingSaleFormValue;
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

function monthBounds(month: string) {
  const { year, monthNo } = monthParts(month);
  return {
    start: new Date(Date.UTC(year, monthNo - 1, 1)),
    end: new Date(Date.UTC(year, monthNo, 0, 23, 59, 59, 999)),
  };
}

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) || '') || null;
}

function numberFromForm(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key) ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function commissionInput(formData: FormData) {
  const rateInput = Number(formData.get('commissionRatePercent') || Number.NaN);
  const wonInputStr = String(formData.get('commissionWon') || '').trim();
  const wonInput = wonInputStr ? normalizeWonInput(wonInputStr) : 0;

  return {
    rateInput,
    wonInput,
  };
}

function calculateCommission({
  centerRatePercent,
  rateInput,
  salesWon,
  wonInput,
}: {
  centerRatePercent?: number | null;
  rateInput: number;
  salesWon: number;
  wonInput: number;
}) {
  const fallbackRate = centerRatePercent ?? 15;
  const rate = Number.isFinite(rateInput) && rateInput > 0 ? rateInput : fallbackRate;
  const commissionWon = wonInput > 0 ? wonInput : Math.round((salesWon * rate) / 100);

  return {
    commissionRatePercent: wonInput > 0 ? null : rate,
    commissionWon,
    vatWon: computeVat10(commissionWon),
  };
}

function dateFromForm(formData: FormData, key: string) {
  return new Date(`${String(formData.get(key) ?? '')}T00:00:00.000Z`);
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function teamLabel(
  team?: {
    teamNo: number;
    partnerNameSnapshot?: string | null;
    agentLabel?: string | null;
    partner?: { name: string } | null;
  } | null,
) {
  if (!team) return '-';
  return `#${team.teamNo} ${team.partner?.name ?? team.partnerNameSnapshot ?? team.agentLabel ?? ''}`.trim();
}

function revalidateShopping(slug: string) {
  revalidatePath(`/w/${slug}/shopping-fee`);
}

async function createShoppingSale(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  const salesWon = normalizeWonInput(String(formData.get('salesWon') ?? '0'));
  const centerId = String(formData.get('centerId') ?? '');
  const { rateInput, wonInput } = commissionInput(formData);

  await prisma.$transaction(async (tx) => {
    const center = await tx.shoppingCenter.findFirst({
      where: { id: centerId, workspaceId: workspace.id, deletedAt: null, active: true },
      select: { id: true, defaultCommissionRatePercent: true },
    });
    if (!center) return;

    const { commissionRatePercent, commissionWon, vatWon } = calculateCommission({
      centerRatePercent: center.defaultCommissionRatePercent,
      rateInput,
      salesWon,
      wonInput,
    });

    const sale = await tx.shoppingSale.create({
      data: {
        workspaceId: workspace.id,
        teamId: optionalString(formData, 'teamId'),
        guideId: optionalString(formData, 'guideId'),
        centerId,
        visitDate: dateFromForm(formData, 'visitDate'),
        paxCount: numberFromForm(formData, 'paxCount'),
        buyerCount: numberFromForm(formData, 'buyerCount'),
        salesWon,
        category: optionalString(formData, 'category'),
        memo: optionalString(formData, 'memo'),
      },
    });
    const { year, monthNo } = monthParts(toDateInput(sale.visitDate).slice(0, 7));
    await tx.shoppingCommission.create({
      data: {
        workspaceId: workspace.id,
        shoppingSaleId: sale.id,
        centerId: sale.centerId,
        periodYear: year,
        periodMonth: monthNo,
        commissionWon,
        vatWon,
        totalWithVatWon: computeVatIncluded(commissionWon),
        commissionRatePercent,
        status: 'DRAFT',
      },
    });
  });

  revalidateShopping(slug);
}

async function updateShoppingSale(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  const saleId = String(formData.get('id') ?? '');
  const salesWon = normalizeWonInput(String(formData.get('salesWon') ?? '0'));
  const centerId = String(formData.get('centerId') ?? '');
  const { rateInput, wonInput } = commissionInput(formData);

  await prisma.$transaction(async (tx) => {
    const [existing, center] = await Promise.all([
      tx.shoppingSale.findFirst({
        where: { id: saleId, workspaceId: workspace.id, deletedAt: null },
        select: { id: true },
      }),
      tx.shoppingCenter.findFirst({
        where: { id: centerId, workspaceId: workspace.id, deletedAt: null, active: true },
        select: { id: true, defaultCommissionRatePercent: true },
      }),
    ]);
    if (!existing || !center) return;

    const { commissionRatePercent, commissionWon, vatWon } = calculateCommission({
      centerRatePercent: center.defaultCommissionRatePercent,
      rateInput,
      salesWon,
      wonInput,
    });

    const sale = await tx.shoppingSale.update({
      where: { id: saleId },
      data: {
        teamId: optionalString(formData, 'teamId'),
        guideId: optionalString(formData, 'guideId'),
        centerId,
        visitDate: dateFromForm(formData, 'visitDate'),
        paxCount: numberFromForm(formData, 'paxCount'),
        buyerCount: numberFromForm(formData, 'buyerCount'),
        salesWon,
        category: optionalString(formData, 'category'),
        memo: optionalString(formData, 'memo'),
      },
    });
    const { year, monthNo } = monthParts(toDateInput(sale.visitDate).slice(0, 7));
    await tx.shoppingCommission.updateMany({
      where: { shoppingSaleId: sale.id, workspaceId: workspace.id },
      data: {
        centerId: sale.centerId,
        periodYear: year,
        periodMonth: monthNo,
        commissionWon,
        vatWon,
        totalWithVatWon: computeVatIncluded(commissionWon),
        commissionRatePercent,
      },
    });
  });

  revalidateShopping(slug);
}

async function cancelShoppingSale(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'ADMIN');
  const id = String(formData.get('id') ?? '');
  await prisma.$transaction([
    prisma.shoppingSale.updateMany({
      where: { id, workspaceId: workspace.id },
      data: { deletedAt: new Date() },
    }),
    prisma.shoppingCommission.updateMany({
      where: { shoppingSaleId: id, workspaceId: workspace.id },
      data: { deletedAt: new Date(), status: 'CANCELLED' },
    }),
  ]);
  revalidateShopping(slug);
}

export default async function ShoppingFeePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { month?: string };
}) {
  const month = parseMonth(searchParams?.month);
  const { year, monthNo } = monthParts(month);
  const { start, end } = monthBounds(month);
  const { workspace, role } = await requireWorkspace(params.slug, 'VIEWER');
  const canMutate = canMutateSettlement(role);
  const canCancel = canCancelSettlement(role);

  const [sales, centers, guides, teams, commissions] = await Promise.all([
    prisma.shoppingSale.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, visitDate: { gte: start, lte: end } },
      include: { center: true, guide: true, team: { include: { partner: true } } },
      orderBy: [{ visitDate: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.shoppingCenter.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.guide.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, active: true },
      orderBy: { name: 'asc' },
    }),
    prisma.tourTeam.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, year, month: monthNo },
      include: { partner: true },
      orderBy: { teamNo: 'asc' },
    }),
    prisma.shoppingCommission.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, periodYear: year, periodMonth: monthNo },
      include: { center: true },
    }),
  ]);

  const centerOptions: ShoppingOption[] = centers.map((center) => ({
    id: center.id,
    label: center.name,
    ratePercent: center.defaultCommissionRatePercent,
  }));
  const guideOptions: ShoppingOption[] = guides.map((guide) => ({
    id: guide.id,
    label: guide.name,
  }));
  const teamOptions: ShoppingOption[] = teams.map((team) => ({
    id: team.id,
    label: teamLabel(team),
  }));

  const commissionBySale = new Map(
    commissions
      .filter((commission) => commission.shoppingSaleId)
      .map((commission) => [commission.shoppingSaleId, commission]),
  );

  const rows: ShoppingSaleRow[] = sales.map((sale) => {
    const commission = commissionBySale.get(sale.id);
    return {
      id: sale.id,
      dateLabel: toDateInput(sale.visitDate).slice(5),
      teamLabel: teamLabel(sale.team),
      guideName: sale.guide?.name ?? '-',
      centerName: sale.center.name,
      category: sale.category ?? sale.center.category ?? '-',
      paxCount: sale.paxCount,
      buyerCount: sale.buyerCount,
      salesWon: sale.salesWon,
      commissionWon: commission?.commissionWon ?? 0,
      commissionRatePercent: commission?.commissionRatePercent,
      conversionRate:
        sale.paxCount > 0 ? `${Math.round((sale.buyerCount / sale.paxCount) * 100)}%` : '-',
      formValue: {
        id: sale.id,
        visitDate: toDateInput(sale.visitDate),
        teamId: sale.teamId ?? undefined,
        guideId: sale.guideId ?? undefined,
        centerId: sale.centerId,
        paxCount: sale.paxCount,
        buyerCount: sale.buyerCount,
        salesWon: sale.salesWon,
        commissionRatePercent: commission?.commissionRatePercent,
        commissionWon: commission?.commissionWon,
        category: sale.category ?? undefined,
        memo: sale.memo ?? undefined,
      },
    };
  });

  const commissionTotals = computeShoppingCommissionTotals(
    commissions.map((commission) => ({
      centerId: commission.centerId,
      commissionWon: commission.commissionWon,
    })),
  );

  const categorySummary = [
    ...sales
      .reduce((map, sale) => {
        const key = sale.category ?? sale.center.category ?? '기타';
        const current = map.get(key) ?? { paxCount: 0, buyerCount: 0, salesWon: 0 };
        map.set(key, {
          paxCount: current.paxCount + sale.paxCount,
          buyerCount: current.buyerCount + sale.buyerCount,
          salesWon: current.salesWon + sale.salesWon,
        });
        return map;
      }, new Map<string, { paxCount: number; buyerCount: number; salesWon: number }>())
      .entries(),
  ];

  const guideSummary = [
    ...sales
      .reduce((map, sale) => {
        const key = sale.guide?.name ?? '미지정';
        const current = map.get(key) ?? { paxCount: 0, salesWon: 0, incentiveWon: 0 };
        const commission = commissionBySale.get(sale.id);
        map.set(key, {
          paxCount: current.paxCount + sale.buyerCount,
          salesWon: current.salesWon + sale.salesWon,
          incentiveWon: current.incentiveWon + (commission?.commissionWon ?? 0),
        });
        return map;
      }, new Map<string, { paxCount: number; salesWon: number; incentiveWon: number }>())
      .entries(),
  ].sort((a, b) => b[1].incentiveWon - a[1].incentiveWon);

  const centerSummary = centers.map((center) => {
    const centerSales = sales.filter((sale) => sale.centerId === center.id);
    const salesWon = centerSales.reduce((sum, sale) => sum + sale.salesWon, 0);
    return {
      id: center.id,
      name: center.name,
      teamCount: new Set(centerSales.map((sale) => sale.teamId).filter(Boolean)).size,
      salesWon,
      commissionWon: commissionTotals.totalByCenter.get(center.id) ?? 0,
    };
  });

  const columns = [
    { key: 'dateLabel', header: '날짜', cell: (row: ShoppingSaleRow) => row.dateLabel },
    {
      key: 'team',
      header: '팀 / 가이드',
      cell: (row: ShoppingSaleRow) => (
        <div>
          <div className="font-semibold text-navy-900">{row.teamLabel}</div>
          <Badge tone="pink">{row.guideName}</Badge>
        </div>
      ),
    },
    { key: 'centerName', header: '센터', cell: (row: ShoppingSaleRow) => row.centerName },
    {
      key: 'paxCount',
      header: '인원',
      align: 'right' as const,
      cell: (row: ShoppingSaleRow) => row.paxCount,
    },
    {
      key: 'buyerCount',
      header: '구매',
      align: 'right' as const,
      cell: (row: ShoppingSaleRow) => row.buyerCount,
    },
    {
      key: 'salesWon',
      header: '매출',
      align: 'right' as const,
      cell: (row: ShoppingSaleRow) => formatWonDisplay(row.salesWon, { roundStep: 5000 }),
    },
    {
      key: 'commissionWon',
      header: '수수료',
      align: 'right' as const,
      cell: (row: ShoppingSaleRow) => (
        <div>
          <div className="font-semibold text-green-600">
            {formatWonDisplay(row.commissionWon, { roundStep: 5000 })}
          </div>
          <div className="text-xs text-slate-500">
            {row.commissionRatePercent ? `${row.commissionRatePercent}%` : '직접 입력'}
          </div>
        </div>
      ),
    },
    {
      key: 'conversionRate',
      header: '전환율',
      align: 'right' as const,
      cell: (row: ShoppingSaleRow) => row.conversionRate,
    },
    {
      key: 'actions',
      header: '액션',
      align: 'right' as const,
      cell: (row: ShoppingSaleRow) => (
        <div className="flex justify-end gap-2">
          <ShoppingSaleFormButton
            action={updateShoppingSale}
            canMutate={canMutate}
            centers={centerOptions}
            guides={guideOptions}
            teams={teamOptions}
            value={row.formValue}
            workspaceSlug={params.slug}
          />
          <form action={cancelShoppingSale}>
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
          <h1 className="text-lg font-bold text-navy-900">쇼핑 수수료</h1>
          <p className="text-xs text-slate-500">
            {month.replace('-', '년 ')}월 · {centers.length}개 센터 · 수수료 합계{' '}
            {formatWonDisplay(commissionTotals.grandTotalWon, { roundStep: 5000 })}원
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            엑셀
          </Button>
          <ShoppingSaleFormButton
            action={createShoppingSale}
            canMutate={canMutate}
            centers={centerOptions}
            guides={guideOptions}
            teams={teamOptions}
            workspaceSlug={params.slug}
          />
        </div>
      </div>

      <FilterToolbar
        primary={
          <>
            <Link
              href={`/w/${params.slug}/shopping-fee?month=${shiftMonth(month, -1)}`}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              ‹
            </Link>
            <span className="px-3 text-lg font-bold text-navy-900 num-tabular">
              {month.replace('-', '년 ')}월
            </span>
            <Link
              href={`/w/${params.slug}/shopping-fee?month=${shiftMonth(month, 1)}`}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              ›
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {categorySummary.length === 0 ? (
          <KpiCard label="쇼핑 매출" value="0" unit="원" />
        ) : (
          categorySummary
            .slice(0, 4)
            .map(([category, summary]) => (
              <KpiCard
                key={category}
                label={category}
                value={
                  summary.salesWon > 0
                    ? formatWonDisplay(summary.salesWon, { roundStep: 5000 })
                    : summary.buyerCount
                }
                unit={summary.salesWon > 0 ? '원' : '명'}
                footer={`전환율 ${
                  summary.paxCount > 0
                    ? Math.round((summary.buyerCount / summary.paxCount) * 100)
                    : 0
                }%`}
              />
            ))
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="lg">
          <h3 className="mb-3 text-sm font-bold text-navy-900">가이드별 쇼핑 인센티브</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {guideSummary.map(([guide, summary]) => (
                  <tr key={guide}>
                    <td className="py-2.5">
                      <Badge tone="pink">{guide}</Badge>
                    </td>
                    <td className="py-2.5 text-right num-tabular">{summary.paxCount}명</td>
                    <td className="py-2.5 text-right num-tabular">
                      {formatWonDisplay(summary.salesWon, { roundStep: 5000 })}
                    </td>
                    <td className="py-2.5 text-right font-bold text-orange-600 num-tabular">
                      {formatWonDisplay(summary.incentiveWon, { roundStep: 5000 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {guideSummary.length === 0 && (
              <EmptyState title="가이드 인센티브 데이터가 없습니다" variant="inline" />
            )}
          </div>
        </Card>

        <Card padding="lg">
          <h3 className="mb-3 text-sm font-bold text-navy-900">센터별 수수료 정산</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {centerSummary.map((center) => (
                  <tr key={center.id}>
                    <td className="py-2.5 font-semibold text-navy-900">{center.name}</td>
                    <td className="py-2.5 text-right num-tabular">{center.teamCount}팀</td>
                    <td className="py-2.5 text-right num-tabular">
                      {formatWonDisplay(center.salesWon, { roundStep: 5000 })}
                    </td>
                    <td className="py-2.5 text-right font-bold text-green-600 num-tabular">
                      {formatWonDisplay(center.commissionWon, { roundStep: 5000 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card padding="none" className="hidden overflow-hidden md:block">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          empty={<EmptyState title="등록된 쇼핑 매출이 없습니다" />}
        />
      </Card>

      <MobileCardList
        className="md:hidden"
        rows={rows}
        rowKey={(row) => row.id}
        empty={<EmptyState title="등록된 쇼핑 매출이 없습니다" />}
        renderCard={(row) => (
          <div className="space-y-2">
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-bold text-navy-900">{row.centerName}</div>
                <div className="text-xs text-slate-500">
                  {row.dateLabel} · {row.teamLabel}
                </div>
              </div>
              <Badge tone="pink">{row.guideName}</Badge>
            </div>
            <div className="text-sm font-semibold">
              {formatWonDisplay(row.salesWon, { roundStep: 5000 })}원
            </div>
          </div>
        )}
      />
    </div>
  );
}
