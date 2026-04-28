import { Badge, Card, DataTable, EmptyState, KpiCard, MobileCardList } from '@bttour/ui';
import {
  canMutateFinanceWallet,
  canMutateSettlement,
  computeCardRemainingLimit,
  computeWalletBalance,
  formatWonDisplay,
  normalizeWonInput,
} from '@bttour/shared';
import { prisma } from '@bttour/db';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';
import { LedgerLineFormButton, WalletFormButton, type WalletOption } from './FinanceFormButtons';

type WalletKind = 'BANK' | 'CARD' | 'FX';

interface LedgerRow {
  id: string;
  dateLabel: string;
  walletName: string;
  entryType: string;
  note: string;
  amountMinor: number;
  currencyCode: string;
}

function parseKind(raw?: string): WalletKind {
  return raw === 'BANK' || raw === 'FX' ? raw : 'CARD';
}

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) || '') || null;
}

function numberFromForm(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key) ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function dateTimeFromForm(formData: FormData, key: string) {
  const value = String(formData.get(key) || '');
  return value ? new Date(value) : new Date();
}

function signedAmount(entryType: string, amountMinor: number) {
  if (['WITHDRAWAL', 'CARD_USE', 'FX_OUT'].includes(entryType)) return -Math.abs(amountMinor);
  return amountMinor;
}

function formatMoney(amountMinor: number, currencyCode: string) {
  if (currencyCode === 'KRW') return `${formatWonDisplay(amountMinor, { roundStep: 5000 })}원`;
  return `${new Intl.NumberFormat('ko-KR').format(amountMinor)} ${currencyCode}`;
}

function revalidateFinance(slug: string) {
  revalidatePath(`/w/${slug}/finance`);
}

async function createWallet(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'ADMIN');
  const kind = String(formData.get('kind') || 'BANK') as WalletKind;
  await prisma.financeWallet.create({
    data: {
      workspaceId: workspace.id,
      kind,
      name: String(formData.get('name') ?? ''),
      institution: optionalString(formData, 'institution'),
      numberMasked: optionalString(formData, 'numberMasked'),
      currencyCode: String(formData.get('currencyCode') || 'KRW').toUpperCase(),
      openingBalanceMinor: normalizeWonInput(String(formData.get('openingBalanceMinor') ?? '0')),
      billingDay: numberFromForm(formData, 'billingDay') || null,
      creditLimitWon: numberFromForm(formData, 'creditLimitWon') || null,
    },
  });
  revalidateFinance(slug);
}

async function createLedgerLine(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, userId } = await assertWorkspace(slug, 'MANAGER');
  const entryType = String(formData.get('entryType') || 'OTHER');
  const walletId = String(formData.get('walletId') ?? '');
  const wallet = await prisma.financeWallet.findFirst({
    where: { id: walletId, workspaceId: workspace.id, deletedAt: null, active: true },
    select: { id: true },
  });
  if (!wallet) return;

  const amountMinor = signedAmount(
    entryType,
    normalizeWonInput(String(formData.get('amountMinor') ?? '0')),
  );
  await prisma.financeLedgerLine.create({
    data: {
      workspaceId: workspace.id,
      walletId,
      entryType: entryType as never,
      lineDatetime: dateTimeFromForm(formData, 'lineDatetime'),
      amountMinor,
      note: optionalString(formData, 'note'),
      createdById: userId,
    },
  });
  revalidateFinance(slug);
}

export default async function FinancePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { kind?: string };
}) {
  const activeKind = parseKind(searchParams?.kind);
  const { workspace, role } = await requireWorkspace(params.slug, 'VIEWER');
  const canCreateWallet = canMutateFinanceWallet(role);
  const canCreateLedger = canMutateSettlement(role);

  const [wallets, lines, rates] = await Promise.all([
    prisma.financeWallet.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, active: true },
      include: { ledgerLines: true },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    }),
    prisma.financeLedgerLine.findMany({
      where: { workspaceId: workspace.id, wallet: { kind: activeKind, deletedAt: null } },
      include: { wallet: true },
      orderBy: { lineDatetime: 'desc' },
      take: 50,
    }),
    prisma.exchangeRate.findMany({
      where: { quoteCurrency: 'KRW' },
      orderBy: { effectiveDate: 'desc' },
      take: 20,
    }),
  ]);

  const walletOptions: WalletOption[] = wallets.map((wallet) => ({
    id: wallet.id,
    label: `${wallet.name} · ${wallet.currencyCode}`,
  }));

  const activeWallets = wallets.filter((wallet) => wallet.kind === activeKind);
  const walletBalances = activeWallets.map((wallet) => ({
    wallet,
    balance: computeWalletBalance({
      openingBalanceMinor: wallet.openingBalanceMinor,
      ledgerLines: wallet.ledgerLines,
      currentBalanceMinor: null,
    }),
  }));

  const rateMap = new Map(rates.map((rate) => [rate.baseCurrency, rate.rate]));
  const totalKrw = walletBalances.reduce((sum, item) => {
    if (item.wallet.currencyCode === 'KRW') return sum + item.balance;
    return sum + Math.round(item.balance * (rateMap.get(item.wallet.currencyCode) ?? 0));
  }, 0);

  const rows: LedgerRow[] = lines.map((line) => ({
    id: line.id,
    dateLabel: line.lineDatetime.toISOString().slice(5, 16).replace('T', ' '),
    walletName: line.wallet.name,
    entryType: line.entryType,
    note: line.note ?? '-',
    amountMinor: line.amountMinor,
    currencyCode: line.wallet.currencyCode,
  }));

  const columns = [
    { key: 'date', header: '일시', cell: (row: LedgerRow) => row.dateLabel },
    { key: 'wallet', header: '지갑', cell: (row: LedgerRow) => row.walletName },
    {
      key: 'entryType',
      header: '유형',
      cell: (row: LedgerRow) => <Badge tone="slate">{row.entryType}</Badge>,
    },
    { key: 'note', header: '적요', cell: (row: LedgerRow) => row.note },
    {
      key: 'amount',
      header: '금액',
      align: 'right' as const,
      cell: (row: LedgerRow) => (
        <span
          className={row.amountMinor < 0 ? 'font-bold text-red-600' : 'font-bold text-green-600'}
        >
          {formatMoney(row.amountMinor, row.currencyCode)}
        </span>
      ),
    },
  ];

  const tabs: Array<{ key: WalletKind; label: string }> = [
    { key: 'CARD', label: '카드' },
    { key: 'BANK', label: '은행 계좌' },
    { key: 'FX', label: '외화·환전' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-navy-900">은행·카드</h1>
          <p className="text-xs text-slate-500">
            지갑 {wallets.length}개 · 최근 거래 {rows.length}건
          </p>
        </div>
        <div className="flex gap-2">
          <WalletFormButton
            action={createWallet}
            canMutate={canCreateWallet}
            workspaceSlug={params.slug}
          />
          <LedgerLineFormButton
            action={createLedgerLine}
            canMutate={canCreateLedger}
            wallets={walletOptions}
            workspaceSlug={params.slug}
          />
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/w/${params.slug}/finance?kind=${tab.key}`}
            className={
              tab.key === activeKind
                ? 'border-b-2 border-navy-900 px-5 py-3 text-sm font-semibold text-navy-900'
                : 'border-b-2 border-transparent px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-700'
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label={`${activeKind} 합계(KRW 환산)`}
          value={formatWonDisplay(totalKrw, { roundStep: 5000 })}
          unit="원"
        />
        <KpiCard label="지갑 수" value={activeWallets.length} unit="개" />
        <KpiCard label="거래 수" value={rows.length} unit="건" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {walletBalances.map(({ wallet, balance }) => {
          const usedWon =
            wallet.kind === 'CARD'
              ? Math.abs(
                  wallet.ledgerLines
                    .filter((line) => line.amountMinor < 0)
                    .reduce((sum, line) => sum + line.amountMinor, 0),
                )
              : 0;
          const remaining =
            wallet.kind === 'CARD' && wallet.creditLimitWon
              ? computeCardRemainingLimit({
                  creditLimitWon: wallet.creditLimitWon,
                  usedWon,
                  scheduledWon: 0,
                })
              : null;
          return (
            <Card
              key={wallet.id}
              padding="lg"
              className={wallet.kind === 'CARD' ? 'bg-navy-900 text-white' : ''}
            >
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <div
                    className={
                      wallet.kind === 'CARD' ? 'font-bold text-white' : 'font-bold text-navy-900'
                    }
                  >
                    {wallet.name}
                  </div>
                  <div
                    className={
                      wallet.kind === 'CARD' ? 'text-xs text-white/70' : 'text-xs text-slate-500'
                    }
                  >
                    {wallet.institution ?? '-'} · {wallet.numberMasked ?? wallet.currencyCode}
                  </div>
                </div>
                <Badge tone={wallet.kind === 'CARD' ? 'orange' : 'slate'}>{wallet.kind}</Badge>
              </div>
              <div className="text-2xl font-bold num-tabular">
                {formatMoney(balance, wallet.currencyCode)}
              </div>
              {remaining != null && (
                <div className="mt-2 text-xs text-orange-300">
                  잔여 한도 {formatWonDisplay(remaining, { roundStep: 5000 })}원
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card padding="none" className="hidden overflow-hidden md:block">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          empty={<EmptyState title="거래 내역이 없습니다" />}
        />
      </Card>

      <MobileCardList
        className="md:hidden"
        rows={rows}
        rowKey={(row) => row.id}
        empty={<EmptyState title="거래 내역이 없습니다" />}
        renderCard={(row) => (
          <div className="space-y-1">
            <div className="flex justify-between">
              <div className="font-bold text-navy-900">{row.walletName}</div>
              <Badge tone="slate">{row.entryType}</Badge>
            </div>
            <div className="text-xs text-slate-500">{row.dateLabel}</div>
            <div
              className={
                row.amountMinor < 0 ? 'font-bold text-red-600' : 'font-bold text-green-600'
              }
            >
              {formatMoney(row.amountMinor, row.currencyCode)}
            </div>
          </div>
        )}
      />
    </div>
  );
}
