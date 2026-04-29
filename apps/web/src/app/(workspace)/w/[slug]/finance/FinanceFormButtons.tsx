'use client';

import { Button, Field, Modal, TextField } from '@bttour/ui';
import { useState } from 'react';

export interface WalletOption {
  id: string;
  label: string;
}

export function WalletFormButton({
  action,
  canMutate,
  workspaceSlug,
}: {
  action: (formData: FormData) => void | Promise<void>;
  canMutate: boolean;
  workspaceSlug: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" disabled={!canMutate} onClick={() => setOpen(true)}>
        + 지갑/카드
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="지갑·카드 추가"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" form="wallet-form">
              저장
            </Button>
          </>
        }
      >
        <form id="wallet-form" action={action} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <Field label="종류" required>
            <select
              name="kind"
              required
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-base md:text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
              defaultValue="BANK"
            >
              <option value="BANK">BANK</option>
              <option value="CARD">CARD</option>
              <option value="FX">FX</option>
            </select>
          </Field>
          <Field label="이름" required>
            <TextField name="name" required />
          </Field>
          <Field label="기관">
            <TextField name="institution" />
          </Field>
          <Field label="마스킹 번호">
            <TextField name="numberMasked" placeholder="111-***-1234" />
          </Field>
          <Field label="통화">
            <TextField name="currencyCode" defaultValue="KRW" />
          </Field>
          <Field label="기초 잔액">
            <TextField name="openingBalanceMinor" type="number" defaultValue={0} />
          </Field>
          <Field label="결제일">
            <TextField name="billingDay" type="number" min={1} max={31} />
          </Field>
          <Field label="카드 한도">
            <TextField name="creditLimitWon" type="number" />
          </Field>
        </form>
      </Modal>
    </>
  );
}

export function LedgerLineFormButton({
  action,
  canMutate,
  wallets,
  workspaceSlug,
}: {
  action: (formData: FormData) => void | Promise<void>;
  canMutate: boolean;
  wallets: WalletOption[];
  workspaceSlug: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        disabled={!canMutate || wallets.length === 0}
        onClick={() => setOpen(true)}
      >
        + 거래 입력
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="거래 입력"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" form="ledger-line-form">
              저장
            </Button>
          </>
        }
      >
        <form id="ledger-line-form" action={action} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <Field label="지갑" required>
            <select
              name="walletId"
              required
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-base md:text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
              defaultValue=""
            >
              <option value="">선택</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="거래 유형" required>
            <select
              name="entryType"
              required
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-base md:text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
              defaultValue="DEPOSIT"
            >
              <option value="DEPOSIT">DEPOSIT</option>
              <option value="WITHDRAWAL">WITHDRAWAL</option>
              <option value="CARD_USE">CARD_USE</option>
              <option value="CARD_PAYMENT">CARD_PAYMENT</option>
              <option value="FX_IN">FX_IN</option>
              <option value="FX_OUT">FX_OUT</option>
              <option value="BALANCE_ADJUSTMENT">BALANCE_ADJUSTMENT</option>
              <option value="OTHER">OTHER</option>
            </select>
          </Field>
          <Field label="일시" required>
            <TextField name="lineDatetime" type="datetime-local" required />
          </Field>
          <Field label="금액" required>
            <TextField name="amountMinor" type="number" required />
          </Field>
          <Field label="적요" className="sm:col-span-2">
            <TextField name="note" />
          </Field>
        </form>
      </Modal>
    </>
  );
}
