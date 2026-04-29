'use client';

import { Button, Field, Modal, TextField } from '@bttour/ui';
import { useState } from 'react';

export interface ReceivableOption {
  id: string;
  label: string;
}

export interface ReceivableFormValue {
  id: string;
  teamId?: string;
  partnerId?: string;
  partnerNameSnapshot: string;
  title: string;
  currencyCode: string;
  amountMinor: number;
  periodYear: number;
  periodMonth: number;
  dueDate?: string;
  dueNote?: string;
  memo?: string;
}

export function ReceivableFormButton({
  action,
  canMutate,
  defaultMonth,
  defaultYear,
  partners,
  teams,
  value,
  workspaceSlug,
}: {
  action: (formData: FormData) => void | Promise<void>;
  canMutate: boolean;
  defaultMonth: number;
  defaultYear: number;
  partners: ReceivableOption[];
  teams: ReceivableOption[];
  value?: ReceivableFormValue;
  workspaceSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(value);

  return (
    <>
      <Button
        size={isEdit ? 'sm' : 'md'}
        variant={isEdit ? 'outline' : 'secondary'}
        disabled={!canMutate}
        onClick={() => setOpen(true)}
      >
        {isEdit ? '수정' : '+ 미수금 등록'}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isEdit ? '미수금 수정' : '미수금 등록'}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" form={`receivable-form-${value?.id ?? 'new'}`}>
              저장
            </Button>
          </>
        }
      >
        <form
          id={`receivable-form-${value?.id ?? 'new'}`}
          action={action}
          className="grid gap-4 sm:grid-cols-2"
        >
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          {value && <input type="hidden" name="id" value={value.id} />}
          <Field label="정산 연도" required>
            <TextField
              name="periodYear"
              type="number"
              defaultValue={value?.periodYear ?? defaultYear}
              required
            />
          </Field>
          <Field label="정산 월" required>
            <TextField
              name="periodMonth"
              type="number"
              min={1}
              max={12}
              defaultValue={value?.periodMonth ?? defaultMonth}
              required
            />
          </Field>
          <Field label="거래처">
            <select
              name="partnerId"
              defaultValue={value?.partnerId ?? ''}
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-base md:text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="">직접 입력</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="거래처명" required>
            <TextField
              name="partnerNameSnapshot"
              defaultValue={value?.partnerNameSnapshot ?? ''}
              required
            />
          </Field>
          <Field label="팀">
            <select
              name="teamId"
              defaultValue={value?.teamId ?? ''}
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-base md:text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="">선택 없음</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="제목" required>
            <TextField name="title" defaultValue={value?.title ?? ''} required />
          </Field>
          <Field label="통화" required>
            <TextField name="currencyCode" defaultValue={value?.currencyCode ?? 'KRW'} required />
          </Field>
          <Field label="청구액" required>
            <TextField
              name="amountMinor"
              type="number"
              defaultValue={value?.amountMinor ?? 0}
              required
            />
          </Field>
          <Field label="입금 기한">
            <TextField name="dueDate" type="date" defaultValue={value?.dueDate ?? ''} />
          </Field>
          <Field label="기한 메모">
            <TextField name="dueNote" defaultValue={value?.dueNote ?? ''} />
          </Field>
          <Field label="메모" className="sm:col-span-2">
            <textarea
              name="memo"
              defaultValue={value?.memo ?? ''}
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}

export function ReceivablePaymentButton({
  action,
  balanceMinor,
  canMutate,
  currencyCode,
  receivableId,
  workspaceSlug,
}: {
  action: (formData: FormData) => void | Promise<void>;
  balanceMinor: number;
  canMutate: boolean;
  currencyCode: string;
  receivableId: string;
  workspaceSlug: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={!canMutate || balanceMinor <= 0}
        onClick={() => setOpen(true)}
      >
        입금
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="입금 추가"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" form={`receivable-payment-form-${receivableId}`}>
              저장
            </Button>
          </>
        }
      >
        <form id={`receivable-payment-form-${receivableId}`} action={action} className="space-y-4">
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <input type="hidden" name="receivableId" value={receivableId} />
          <input type="hidden" name="currencyCode" value={currencyCode} />
          <Field label="입금액" required>
            <TextField name="amountMinor" type="number" max={balanceMinor} required />
          </Field>
          <Field label="입금일" required>
            <TextField
              name="paidAt"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </Field>
          <Field label="메모">
            <TextField name="note" />
          </Field>
        </form>
      </Modal>
    </>
  );
}
