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
  canMutateSettlement,
  computeSettlementBalance,
  computeVat10,
  computeVatIncluded,
  formatWonDisplay,
  normalizeWonInput,
  validateSettlementPayment,
} from '@bttour/shared';
import { prisma } from '@bttour/db';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';
import {
  VehiclePaymentButton,
  VehicleSettlementFormButton,
  type VehicleOption,
  type VehicleSettlementFormValue,
} from './VehicleSettlementFormButton';

interface VehicleRow {
  id: string;
  dateLabel: string;
  teamLabel: string;
  driverName: string;
  vehicleLabel: string;
  vehicleType: string;
  supplyAmountWon: number;
  vatWon: number;
  totalWithVatWon: number;
  paidTotalWon: number;
  balanceWon: number;
  status: 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  formValue: VehicleSettlementFormValue;
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
  return new Date(`${String(formData.get(key) ?? '')}T00:00:00.000Z`);
}

function statusTone(
  status: VehicleRow['status'],
  balanceWon: number,
): 'green' | 'amber' | 'red' | 'slate' {
  if (status === 'CANCELLED') return 'slate';
  if (balanceWon <= 0) return 'green';
  if (status === 'PARTIALLY_PAID') return 'amber';
  return 'red';
}

function statusLabel(status: VehicleRow['status'], balanceWon: number) {
  if (status === 'CANCELLED') return '취소';
  if (balanceWon <= 0) return '완료';
  if (status === 'PARTIALLY_PAID') return '부분';
  return '미지급';
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

async function lookupVehicleRefs(workspaceId: string, formData: FormData) {
  const vehicleId = optionalString(formData, 'vehicleId');
  const teamId = optionalString(formData, 'teamId');
  const partnerId = optionalString(formData, 'partnerId');
  const [vehicle, team, partner] = await Promise.all([
    vehicleId
      ? prisma.vehicle.findFirst({ where: { id: vehicleId, workspaceId, deletedAt: null } })
      : null,
    teamId
      ? prisma.tourTeam.findFirst({ where: { id: teamId, workspaceId, deletedAt: null } })
      : null,
    partnerId
      ? prisma.partner.findFirst({ where: { id: partnerId, workspaceId, deletedAt: null } })
      : null,
  ]);

  return {
    vehicleId: vehicle?.id ?? null,
    teamId: team?.id ?? null,
    partnerId: partner?.id ?? null,
    partnerNameSnapshot: partner?.name ?? null,
    vehicleLabelSnapshot:
      optionalString(formData, 'vehicleLabelSnapshot') ?? vehicle?.label ?? '미지정 차량',
  };
}

function revalidateVehicle(slug: string) {
  revalidatePath(`/w/${slug}/vehicle`);
}

async function createVehicleSettlement(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  const refs = await lookupVehicleRefs(workspace.id, formData);
  const supplyAmountWon = normalizeWonInput(String(formData.get('supplyAmountWon') ?? '0'));
  const vatWon = computeVat10(supplyAmountWon);

  await prisma.vehicleSettlement.create({
    data: {
      workspaceId: workspace.id,
      teamId: refs.teamId,
      vehicleId: refs.vehicleId,
      vehicleLabelSnapshot: refs.vehicleLabelSnapshot,
      partnerId: refs.partnerId,
      partnerNameSnapshot: refs.partnerNameSnapshot,
      periodYear: numberFromForm(formData, 'periodYear'),
      periodMonth: numberFromForm(formData, 'periodMonth'),
      supplyAmountWon,
      vatWon,
      totalWithVatWon: computeVatIncluded(supplyAmountWon),
      memo: optionalString(formData, 'memo'),
      status: 'DRAFT',
    },
  });

  revalidateVehicle(slug);
}

async function updateVehicleSettlement(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  const refs = await lookupVehicleRefs(workspace.id, formData);
  const supplyAmountWon = normalizeWonInput(String(formData.get('supplyAmountWon') ?? '0'));
  const vatWon = computeVat10(supplyAmountWon);

  await prisma.vehicleSettlement.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: {
      teamId: refs.teamId,
      vehicleId: refs.vehicleId,
      vehicleLabelSnapshot: refs.vehicleLabelSnapshot,
      partnerId: refs.partnerId,
      partnerNameSnapshot: refs.partnerNameSnapshot,
      periodYear: numberFromForm(formData, 'periodYear'),
      periodMonth: numberFromForm(formData, 'periodMonth'),
      supplyAmountWon,
      vatWon,
      totalWithVatWon: computeVatIncluded(supplyAmountWon),
      memo: optionalString(formData, 'memo'),
    },
  });

  revalidateVehicle(slug);
}

async function cancelVehicleSettlement(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'ADMIN');
  await prisma.vehicleSettlement.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: { status: 'CANCELLED', deletedAt: new Date() },
  });
  revalidateVehicle(slug);
}

async function confirmVehicleSettlement(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'ADMIN');
  await prisma.vehicleSettlement.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id, status: 'DRAFT' },
    data: { status: 'CONFIRMED' },
  });
  revalidateVehicle(slug);
}

async function addVehiclePayment(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  const settlement = await prisma.vehicleSettlement.findFirst({
    where: {
      id: String(formData.get('settlementId') ?? ''),
      workspaceId: workspace.id,
      deletedAt: null,
    },
    include: { payments: true },
  });
  if (!settlement) return;

  const amountWon = normalizeWonInput(String(formData.get('amountWon') ?? '0'));
  const balance = computeSettlementBalance(settlement.totalWithVatWon, settlement.payments);
  validateSettlementPayment({
    totalWon: settlement.totalWithVatWon,
    paidSoFarWon: balance.paidTotalWon,
    nextPaymentWon: amountWon,
  });

  await prisma.$transaction(async (tx) => {
    await tx.vehicleSettlementPayment.create({
      data: {
        workspaceId: workspace.id,
        settlementId: settlement.id,
        amountWon,
        paidAt: dateFromForm(formData, 'paidAt'),
        note: optionalString(formData, 'note'),
      },
    });
    const nextBalanceWon = settlement.totalWithVatWon - balance.paidTotalWon - amountWon;
    await tx.vehicleSettlement.update({
      where: { id: settlement.id },
      data: { status: nextBalanceWon <= 0 ? 'PAID' : 'PARTIALLY_PAID' },
    });
  });

  revalidateVehicle(slug);
}

export default async function VehiclePage({
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

  const [settlements, vehicles, partners, teams] = await Promise.all([
    prisma.vehicleSettlement.findMany({
      where: {
        workspaceId: workspace.id,
        deletedAt: null,
        periodYear: year,
        periodMonth: monthNo,
      },
      include: {
        vehicle: true,
        partner: true,
        team: { include: { partner: true } },
        vehicleAssignment: { include: { driver: true, vehicle: true } },
        payments: true,
      },
      orderBy: [{ createdAt: 'desc' }],
    }),
    prisma.vehicle.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, active: true },
      orderBy: { label: 'asc' },
    }),
    prisma.partner.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, active: true },
      orderBy: { name: 'asc' },
    }),
    prisma.tourTeam.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, year, month: monthNo },
      include: { partner: true },
      orderBy: [{ teamNo: 'asc' }],
    }),
  ]);

  const vehicleOptions: VehicleOption[] = vehicles.map((vehicle) => ({
    id: vehicle.id,
    label: `${vehicle.label}${vehicle.plateNumber ? ` · ${vehicle.plateNumber}` : ''}`,
  }));
  const partnerOptions: VehicleOption[] = partners.map((partner) => ({
    id: partner.id,
    label: partner.name,
  }));
  const teamOptions: VehicleOption[] = teams.map((team) => ({
    id: team.id,
    label: teamLabel(team),
  }));

  const rows: VehicleRow[] = settlements.map((settlement) => {
    const balance = computeSettlementBalance(settlement.totalWithVatWon, settlement.payments);
    const assignment = settlement.vehicleAssignment;
    return {
      id: settlement.id,
      dateLabel: assignment?.startDate
        ? assignment.startDate.toISOString().slice(5, 10)
        : `${monthNo}월`,
      teamLabel: teamLabel(settlement.team),
      driverName: assignment?.driver?.name ?? '-',
      vehicleLabel: settlement.vehicle?.label ?? settlement.vehicleLabelSnapshot,
      vehicleType: settlement.vehicle?.vehicleType ?? assignment?.vehicle?.vehicleType ?? '-',
      supplyAmountWon: settlement.supplyAmountWon,
      vatWon: settlement.vatWon,
      totalWithVatWon: settlement.totalWithVatWon,
      paidTotalWon: balance.paidTotalWon,
      balanceWon: balance.balanceWon,
      status: settlement.status,
      formValue: {
        id: settlement.id,
        teamId: settlement.teamId ?? undefined,
        vehicleId: settlement.vehicleId ?? undefined,
        partnerId: settlement.partnerId ?? undefined,
        vehicleLabelSnapshot: settlement.vehicleLabelSnapshot,
        periodYear: settlement.periodYear,
        periodMonth: settlement.periodMonth,
        supplyAmountWon: settlement.supplyAmountWon,
        memo: settlement.memo ?? undefined,
      },
    };
  });

  const totalTrips = rows.length;
  const totalWon = rows.reduce((sum, row) => sum + row.totalWithVatWon, 0);
  const balanceWon = rows.reduce((sum, row) => sum + row.balanceWon, 0);

  const typeSummary = [
    ...rows
      .reduce((map, row) => {
        const current = map.get(row.vehicleType) ?? { count: 0, totalWon: 0 };
        map.set(row.vehicleType, {
          count: current.count + 1,
          totalWon: current.totalWon + row.totalWithVatWon,
        });
        return map;
      }, new Map<string, { count: number; totalWon: number }>())
      .entries(),
  ];

  const driverSummary = [
    ...rows
      .reduce((map, row) => {
        const current = map.get(row.driverName) ?? {
          count: 0,
          totalWon: 0,
          balanceWon: 0,
          vehicleType: row.vehicleType,
        };
        map.set(row.driverName, {
          count: current.count + 1,
          totalWon: current.totalWon + row.totalWithVatWon,
          balanceWon: current.balanceWon + row.balanceWon,
          vehicleType: current.vehicleType,
        });
        return map;
      }, new Map<string, { count: number; totalWon: number; balanceWon: number; vehicleType: string }>())
      .entries(),
  ].sort((a, b) => b[1].totalWon - a[1].totalWon);

  const columns = [
    { key: 'dateLabel', header: '날짜', cell: (row: VehicleRow) => row.dateLabel },
    { key: 'teamLabel', header: '팀', cell: (row: VehicleRow) => row.teamLabel },
    { key: 'driverName', header: '기사', cell: (row: VehicleRow) => row.driverName },
    {
      key: 'vehicle',
      header: '차종 / 차량',
      cell: (row: VehicleRow) => (
        <span>
          <strong>{row.vehicleType}</strong>{' '}
          <span className="text-slate-400">{row.vehicleLabel}</span>
        </span>
      ),
    },
    {
      key: 'totalWithVatWon',
      header: '금액',
      align: 'right' as const,
      cell: (row: VehicleRow) => formatWonDisplay(row.totalWithVatWon, { roundStep: 5000 }),
    },
    {
      key: 'status',
      header: '상태',
      cell: (row: VehicleRow) => (
        <Badge tone={statusTone(row.status, row.balanceWon)}>
          {statusLabel(row.status, row.balanceWon)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '액션',
      align: 'right' as const,
      cell: (row: VehicleRow) => (
        <div className="flex justify-end gap-2">
          <VehicleSettlementFormButton
            action={updateVehicleSettlement}
            canMutate={canMutate}
            defaultMonth={monthNo}
            defaultYear={year}
            partners={partnerOptions}
            teams={teamOptions}
            value={row.formValue}
            vehicles={vehicleOptions}
            workspaceSlug={params.slug}
          />
          <VehiclePaymentButton
            action={addVehiclePayment}
            balanceWon={row.balanceWon}
            canMutate={canMutate}
            settlementId={row.id}
            workspaceSlug={params.slug}
          />
          <form action={confirmVehicleSettlement}>
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
          <form action={cancelVehicleSettlement}>
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
          <h1 className="text-lg font-bold text-navy-900">차량비 정산</h1>
          <p className="text-xs text-slate-500">
            {month.replace('-', '년 ')}월 · 운행 {totalTrips}건
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            일괄 카톡 발송
          </Button>
          <VehicleSettlementFormButton
            action={createVehicleSettlement}
            canMutate={canMutate}
            defaultMonth={monthNo}
            defaultYear={year}
            partners={partnerOptions}
            teams={teamOptions}
            vehicles={vehicleOptions}
            workspaceSlug={params.slug}
          />
        </div>
      </div>

      <FilterToolbar
        primary={
          <>
            <Link
              href={`/w/${params.slug}/vehicle?month=${shiftMonth(month, -1)}`}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              ‹
            </Link>
            <span className="px-3 text-lg font-bold text-navy-900 num-tabular">
              {month.replace('-', '년 ')}월
            </span>
            <Link
              href={`/w/${params.slug}/vehicle?month=${shiftMonth(month, 1)}`}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              ›
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="총 운행" value={totalTrips} unit="건" />
        <KpiCard
          label="정산 합계"
          value={formatWonDisplay(totalWon, { roundStep: 5000 })}
          unit="원"
        />
        <KpiCard
          label="미지급"
          value={formatWonDisplay(balanceWon, { roundStep: 5000 })}
          unit="원"
          className="border-amber-200 bg-amber-50"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card padding="lg">
          <h3 className="mb-3 text-sm font-bold text-navy-900">차종별 운행 분포</h3>
          <div className="space-y-3">
            {typeSummary.length === 0 ? (
              <EmptyState title="차종 데이터가 없습니다" variant="inline" />
            ) : (
              typeSummary.map(([type, summary]) => (
                <div key={type}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{type}</span>
                    <span className="font-bold num-tabular">{summary.count}건</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-navy-900"
                      style={{
                        width: `${Math.max(8, (summary.count / Math.max(totalTrips, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card padding="lg" className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-bold text-navy-900">기사별 운행 + 정산</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 text-left">기사</th>
                  <th className="py-2 text-left">차종</th>
                  <th className="py-2 text-right">운행</th>
                  <th className="py-2 text-right">정산</th>
                  <th className="py-2 text-right">잔액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {driverSummary.slice(0, 6).map(([driver, summary]) => (
                  <tr key={driver}>
                    <td className="py-2.5 font-bold text-navy-900">{driver}</td>
                    <td className="py-2.5 text-xs text-slate-500">{summary.vehicleType}</td>
                    <td className="py-2.5 text-right num-tabular">{summary.count}건</td>
                    <td className="py-2.5 text-right font-bold num-tabular">
                      {formatWonDisplay(summary.totalWon, { roundStep: 5000 })}
                    </td>
                    <td className="py-2.5 text-right font-bold text-red-600 num-tabular">
                      {summary.balanceWon > 0
                        ? formatWonDisplay(summary.balanceWon, { roundStep: 5000 })
                        : '-'}
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
          empty={<EmptyState title="등록된 차량비 정산이 없습니다" />}
        />
      </Card>

      <MobileCardList
        className="md:hidden"
        rows={rows}
        rowKey={(row) => row.id}
        empty={<EmptyState title="등록된 차량비 정산이 없습니다" />}
        renderCard={(row) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-navy-900">{row.vehicleLabel}</div>
                <div className="text-xs text-slate-500">{row.teamLabel}</div>
              </div>
              <Badge tone={statusTone(row.status, row.balanceWon)}>
                {statusLabel(row.status, row.balanceWon)}
              </Badge>
            </div>
            <div className="text-sm font-semibold">
              {formatWonDisplay(row.totalWithVatWon, { roundStep: 5000 })}원
            </div>
          </div>
        )}
      />
    </div>
  );
}
