'use client';

import { Button, Field, Modal, TextField } from '@bttour/ui';
import { useState } from 'react';

export interface ExpenseOption {
  id: string;
  label: string;
}

export interface ExpenseFormValue {
  id: string;
  teamId?: string;
  title: string;
  category?: string;
  vendorName?: string;
  expenseDate: string;
  currencyCode: string;
  amountMinor: number;
  vatMinor: number;
  memo?: string;
}

export function ExpenseFormButton({
  action,
  canMutate,
  teams,
  value,
  workspaceSlug,
}: {
  action: (formData: FormData) => void | Promise<void>;
  canMutate: boolean;
  teams: ExpenseOption[];
  value?: ExpenseFormValue;
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
        {isEdit ? '수정' : '+ 비용 등록'}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isEdit ? '비용 수정' : '비용 등록'}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" form={`expense-form-${value?.id ?? 'new'}`}>
              저장
            </Button>
          </>
        }
      >
        <form
          id={`expense-form-${value?.id ?? 'new'}`}
          action={action}
          className="grid gap-4 sm:grid-cols-2"
        >
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          {value && <input type="hidden" name="id" value={value.id} />}
          <Field label="비용일" required>
            <TextField
              name="expenseDate"
              type="date"
              defaultValue={value?.expenseDate ?? ''}
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
          <Field label="분류">
            <TextField name="category" defaultValue={value?.category ?? ''} />
          </Field>
          <Field label="거래처">
            <TextField name="vendorName" defaultValue={value?.vendorName ?? ''} />
          </Field>
          <Field label="통화" required>
            <TextField name="currencyCode" defaultValue={value?.currencyCode ?? 'KRW'} required />
          </Field>
          <Field label="금액" required>
            <TextField
              name="amountMinor"
              type="number"
              defaultValue={value?.amountMinor ?? 0}
              required
            />
          </Field>
          <Field label="VAT">
            <TextField name="vatMinor" type="number" defaultValue={value?.vatMinor ?? ''} />
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
