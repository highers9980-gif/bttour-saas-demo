import { Badge, Button, Card, DataTable, EmptyState, KpiCard, MobileCardList } from '@bttour/ui';
import {
  canApproveExpense,
  canCancelSettlement,
  canCreateExpense,
  canMutateSettlement,
  computeVat10,
  formatWonDisplay,
  normalizeWonInput,
} from '@bttour/shared';
import { prisma } from '@bttour/db';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';
import { ReceiptScanModal } from '@/components/expense/ReceiptScanModal';
import { ExpenseFormButton, type ExpenseFormValue, type ExpenseOption } from './ExpenseFormButton';

type ExpenseTabStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

interface ExpenseRow {
  id: string;
  dateLabel: string;
  title: string;
  category: string;
  vendorName: string;
  teamLabel: string;
  amountMinor: number;
  vatMinor: number;
  currencyCode: string;
  status: ExpenseTabStatus;
  attachmentCount: number;
  ocrLabel: string;
  formValue: ExpenseFormValue;
}

function parseStatus(raw?: string): ExpenseTabStatus {
  if (raw === 'APPROVED' || raw === 'REJECTED') return raw;
  return 'PENDING_APPROVAL';
}

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) || '') || null;
}

function dateFromForm(formData: FormData, key: string) {
  return new Date(`${String(formData.get(key) ?? '')}T00:00:00.000Z`);
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function expenseAmount(formData: FormData, key: string) {
  return normalizeWonInput(String(formData.get(key) ?? '0'));
}

function expenseVat(formData: FormData, amountMinor: number) {
  const raw = String(formData.get('vatMinor') ?? '').trim();
  return raw ? normalizeWonInput(raw) : computeVat10(amountMinor);
}

function formatMoney(amountMinor: number, currencyCode: string) {
  if (currencyCode === 'KRW') return `${formatWonDisplay(amountMinor, { roundStep: 5000 })}원`;
  return `${new Intl.NumberFormat('ko-KR').format(amountMinor)} ${currencyCode}`;
}

function statusTone(status: ExpenseTabStatus) {
  if (status === 'APPROVED') return 'green' as const;
  if (status === 'REJECTED') return 'red' as const;
  return 'amber' as const;
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

function revalidateExpense(slug: string) {
  revalidatePath(`/w/${slug}/expense`);
}

async function createExpense(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, userId } = await assertWorkspace(slug, 'MANAGER');
  const amountMinor = expenseAmount(formData, 'amountMinor');

  await prisma.expense.create({
    data: {
      workspaceId: workspace.id,
      teamId: optionalString(formData, 'teamId'),
      title: String(formData.get('title') ?? ''),
      category: optionalString(formData, 'category'),
      expenseDate: dateFromForm(formData, 'expenseDate'),
      currencyCode: String(formData.get('currencyCode') || 'KRW').toUpperCase(),
      amountMinor,
      vatMinor: expenseVat(formData, amountMinor),
      vendorName: optionalString(formData, 'vendorName'),
      status: 'PENDING_APPROVAL',
      memo: optionalString(formData, 'memo'),
      createdById: userId,
    },
  });
  revalidateExpense(slug);
}

async function updateExpense(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  const amountMinor = expenseAmount(formData, 'amountMinor');

  await prisma.expense.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id, deletedAt: null },
    data: {
      teamId: optionalString(formData, 'teamId'),
      title: String(formData.get('title') ?? ''),
      category: optionalString(formData, 'category'),
      expenseDate: dateFromForm(formData, 'expenseDate'),
      currencyCode: String(formData.get('currencyCode') || 'KRW').toUpperCase(),
      amountMinor,
      vatMinor: expenseVat(formData, amountMinor),
      vendorName: optionalString(formData, 'vendorName'),
      memo: optionalString(formData, 'memo'),
    },
  });
  revalidateExpense(slug);
}

async function approveExpense(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, userId } = await assertWorkspace(slug, 'ADMIN');
  await prisma.expense.updateMany({
    where: {
      id: String(formData.get('id') ?? ''),
      workspaceId: workspace.id,
      deletedAt: null,
      status: 'PENDING_APPROVAL',
    },
    data: { status: 'APPROVED', approvedAt: new Date(), approvedById: userId },
  });
  revalidateExpense(slug);
}

async function rejectExpense(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, userId } = await assertWorkspace(slug, 'ADMIN');
  await prisma.expense.updateMany({
    where: {
      id: String(formData.get('id') ?? ''),
      workspaceId: workspace.id,
      deletedAt: null,
      status: 'PENDING_APPROVAL',
    },
    data: { status: 'REJECTED', approvedAt: new Date(), approvedById: userId },
  });
  revalidateExpense(slug);
}

async function bulkApproveExpenses(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, userId } = await assertWorkspace(slug, 'ADMIN');
  await prisma.expense.updateMany({
    where: { workspaceId: workspace.id, deletedAt: null, status: 'PENDING_APPROVAL' },
    data: { status: 'APPROVED', approvedAt: new Date(), approvedById: userId },
  });
  revalidateExpense(slug);
}

async function cancelExpense(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'ADMIN');
  await prisma.expense.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: { deletedAt: new Date() },
  });
  revalidateExpense(slug);
}

export default async function ExpensePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { status?: string };
}) {
  const activeStatus = parseStatus(searchParams?.status);
  const { workspace, role } = await requireWorkspace(params.slug, 'VIEWER');
  const canMutate = canMutateSettlement(role);
  const canApprove = canApproveExpense(role);
  const canCancel = canCancelSettlement(role);
  const canScanReceipt = canCreateExpense(role);

  const [expenses, teams, aiSettings, primaryAiConfig] = await Promise.all([
    prisma.expense.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, status: activeStatus },
      include: { attachments: true, team: { include: { partner: true } } },
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.tourTeam.findMany({
      where: { workspaceId: workspace.id, deletedAt: null },
      include: { partner: true },
      orderBy: [{ startDate: 'desc' }, { teamNo: 'desc' }],
      take: 120,
    }),
    prisma.workspaceAiSettings.findUnique({ where: { workspaceId: workspace.id } }),
    prisma.workspaceAiProviderConfig.findUnique({
      where: { workspaceId_role: { workspaceId: workspace.id, role: 'PRIMARY' } },
    }),
  ]);
  const showReceiptScanner = canScanReceipt && Boolean(aiSettings?.enabled && primaryAiConfig);

  const teamOptions: ExpenseOption[] = teams.map((team) => ({
    id: team.id,
    label: teamLabel(team),
  }));

  const rows: ExpenseRow[] = expenses.map((expense) => {
    const ocrStatuses = expense.attachments.map((attachment) => attachment.ocrStatus ?? '대기');
    return {
      id: expense.id,
      dateLabel: toDateInput(expense.expenseDate),
      title: expense.title,
      category: expense.category ?? '-',
      vendorName: expense.vendorName ?? '-',
      teamLabel: teamLabel(expense.team),
      amountMinor: expense.amountMinor,
      vatMinor: expense.vatMinor,
      currencyCode: expense.currencyCode,
      status: expense.status as ExpenseTabStatus,
      attachmentCount: expense.attachments.length,
      ocrLabel: ocrStatuses.length ? Array.from(new Set(ocrStatuses)).join(', ') : '첨부 없음',
      formValue: {
        id: expense.id,
        teamId: expense.teamId ?? undefined,
        title: expense.title,
        category: expense.category ?? undefined,
        vendorName: expense.vendorName ?? undefined,
        expenseDate: toDateInput(expense.expenseDate),
        currencyCode: expense.currencyCode,
        amountMinor: expense.amountMinor,
        vatMinor: expense.vatMinor,
        memo: expense.memo ?? undefined,
      },
    };
  });

  const totalAmount = rows.reduce((sum, row) => sum + row.amountMinor, 0);
  const totalVat = rows.reduce((sum, row) => sum + row.vatMinor, 0);
  const categories = new Map<string, number>();
  rows.forEach((row) =>
    categories.set(row.category, (categories.get(row.category) ?? 0) + row.amountMinor),
  );
  const topCategories = Array.from(categories.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const attachments = expenses.flatMap((expense) => expense.attachments);
  const ocrDone = attachments.filter((attachment) => attachment.ocrStatus === 'DONE').length;

  const tabs: Array<{ key: ExpenseTabStatus; label: string }> = [
    { key: 'PENDING_APPROVAL', label: '승인 대기' },
    { key: 'APPROVED', label: '승인 완료' },
    { key: 'REJECTED', label: '반려' },
  ];

  const columns = [
    { key: 'date', header: '일자', cell: (row: ExpenseRow) => row.dateLabel },
    {
      key: 'title',
      header: '비용',
      cell: (row: ExpenseRow) => (
        <div>
          <div className="font-semibold text-navy-900">{row.title}</div>
          <div className="text-xs text-slate-500">{row.vendorName}</div>
        </div>
      ),
    },
    { key: 'category', header: '분류', cell: (row: ExpenseRow) => row.category },
    { key: 'team', header: '팀', cell: (row: ExpenseRow) => row.teamLabel, hideOnMobile: true },
    {
      key: 'amount',
      header: '금액',
      align: 'right' as const,
      cell: (row: ExpenseRow) => (
        <div className="font-bold text-navy-900">
          {formatMoney(row.amountMinor, row.currencyCode)}
        </div>
      ),
    },
    {
      key: 'vat',
      header: 'VAT',
      align: 'right' as const,
      cell: (row: ExpenseRow) => formatMoney(row.vatMinor, row.currencyCode),
    },
    {
      key: 'ocr',
      header: '증빙/OCR',
      cell: (row: ExpenseRow) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-700">첨부 {row.attachmentCount}건</div>
          <div className="text-slate-500">{row.ocrLabel}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      cell: (row: ExpenseRow) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right' as const,
      cell: (row: ExpenseRow) => (
        <div className="flex justify-end gap-2">
          <ExpenseFormButton
            action={updateExpense}
            canMutate={canMutate}
            teams={teamOptions}
            value={row.formValue}
            workspaceSlug={params.slug}
          />
          {row.status === 'PENDING_APPROVAL' && (
            <>
              <form action={approveExpense}>
                <input type="hidden" name="workspaceSlug" value={params.slug} />
                <input type="hidden" name="id" value={row.id} />
                <Button type="submit" size="sm" variant="secondary" disabled={!canApprove}>
                  승인
                </Button>
              </form>
              <form action={rejectExpense}>
                <input type="hidden" name="workspaceSlug" value={params.slug} />
                <input type="hidden" name="id" value={row.id} />
                <Button type="submit" size="sm" variant="danger" disabled={!canApprove}>
                  반려
                </Button>
              </form>
            </>
          )}
          <form action={cancelExpense}>
            <input type="hidden" name="workspaceSlug" value={params.slug} />
            <input type="hidden" name="id" value={row.id} />
            <Button type="submit" size="sm" variant="ghost" disabled={!canCancel}>
              삭제
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
          <h1 className="text-lg font-bold text-navy-900">비용 처리</h1>
          <p className="text-xs text-slate-500">
            직접 입력 비용 {rows.length}건 · 증빙 {attachments.length}건
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showReceiptScanner && (
            <ReceiptScanModal canScan={showReceiptScanner} workspaceSlug={params.slug} />
          )}
          <form action={bulkApproveExpenses}>
            <input type="hidden" name="workspaceSlug" value={params.slug} />
            <Button
              type="submit"
              variant="outline"
              disabled={!canApprove || activeStatus !== 'PENDING_APPROVAL' || rows.length === 0}
            >
              일괄 승인
            </Button>
          </form>
          <ExpenseFormButton
            action={createExpense}
            canMutate={canMutate}
            teams={teamOptions}
            workspaceSlug={params.slug}
          />
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/w/${params.slug}/expense?status=${tab.key}`}
            className={
              tab.key === activeStatus
                ? 'border-b-2 border-navy-900 px-5 py-3 text-sm font-semibold text-navy-900'
                : 'border-b-2 border-transparent px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-700'
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="비용 합계"
          value={formatWonDisplay(totalAmount, { roundStep: 5000 })}
          unit="원"
        />
        <KpiCard label="VAT" value={formatWonDisplay(totalVat, { roundStep: 5000 })} unit="원" />
        <KpiCard label="증빙 첨부" value={attachments.length} unit="건" />
        <KpiCard label="OCR 완료" value={`${ocrDone}/${attachments.length}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="p-0">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-navy-900">비용 목록</h2>
          </div>
          <div className="hidden md:block">
            <DataTable
              rows={rows}
              columns={columns}
              rowKey={(row) => row.id}
              empty={
                <EmptyState
                  title="등록된 비용이 없습니다"
                  description="비용을 직접 등록하거나 Phase 4에서 OCR 업로드로 자동 생성할 수 있습니다."
                  action={
                    <ExpenseFormButton
                      action={createExpense}
                      canMutate={canMutate}
                      teams={teamOptions}
                      workspaceSlug={params.slug}
                    />
                  }
                />
              }
            />
          </div>
          <div className="p-4 md:hidden">
            <MobileCardList
              rows={rows}
              rowKey={(row) => row.id}
              empty={<EmptyState title="등록된 비용이 없습니다" variant="inline" />}
              renderCard={(row) => (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-navy-900">{row.title}</div>
                      <div className="text-xs text-slate-500">
                        {row.dateLabel} · {row.vendorName}
                      </div>
                    </div>
                    <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-slate-500">금액</span>
                    <span className="text-right font-bold">
                      {formatMoney(row.amountMinor, row.currencyCode)}
                    </span>
                    <span className="text-slate-500">증빙</span>
                    <span className="text-right">
                      {row.attachmentCount}건 · {row.ocrLabel}
                    </span>
                  </div>
                </div>
              )}
            />
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-navy-900">분류별 합계</h2>
              <Badge tone="slate">현재 탭</Badge>
            </div>
            <div className="space-y-3">
              {topCategories.length === 0 ? (
                <p className="text-sm text-slate-500">집계할 비용이 없습니다.</p>
              ) : (
                topCategories.map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{category}</span>
                    <span className="font-bold text-navy-900">
                      {formatWonDisplay(amount, { roundStep: 5000 })}원
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-navy-900">증빙 OCR</h2>
              <Badge tone="amber">Phase 4</Badge>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>첨부 파일</span>
                <span className="font-semibold text-navy-900">{attachments.length}건</span>
              </div>
              <div className="flex justify-between">
                <span>OCR 완료</span>
                <span className="font-semibold text-navy-900">{ocrDone}건</span>
              </div>
              <p className="pt-2 text-xs text-slate-500">
                현재는 Attachment와 ocrStatus만 표시합니다. 실제 영수증 OCR 파이프라인은 Hermes AI
                연동 단계에서 붙입니다.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
