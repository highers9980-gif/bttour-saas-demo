'use client';

import { Button, Field, Modal, TextField } from '@bttour/ui';
import { useState } from 'react';

export interface SettlementOption {
  id: string;
  label: string;
}

export interface GuideSettlementFormValue {
  id: string;
  guideId?: string;
  teamId?: string;
  partnerId?: string;
  guideNameSnapshot: string;
  partnerNameSnapshot?: string;
  periodYear: number;
  periodMonth: number;
  totalWon: number;
  memo?: string;
}

export function GuideSettlementFormButton({
  action,
  canMutate,
  defaultMonth,
  defaultYear,
  guides,
  partners,
  teams,
  value,
  workspaceSlug,
}: {
  action: (formData: FormData) => void | Promise<void>;
  canMutate: boolean;
  defaultMonth: number;
  defaultYear: number;
  guides: SettlementOption[];
  partners: SettlementOption[];
  teams: SettlementOption[];
  value?: GuideSettlementFormValue;
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
        {isEdit ? '수정' : '+ 정산 등록'}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isEdit ? '가이드 정산 수정' : '가이드 정산 등록'}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" form={`guide-settlement-form-${value?.id ?? 'new'}`}>
              저장
            </Button>
          </>
        }
      >
        <form
          id={`guide-settlement-form-${value?.id ?? 'new'}`}
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
          <Field label="가이드">
            <select
              name="guideId"
              defaultValue={value?.guideId ?? ''}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="">직접 입력</option>
              {guides.map((guide) => (
                <option key={guide.id} value={guide.id}>
                  {guide.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="가이드명 직접 입력" required>
            <TextField
              name="guideNameSnapshot"
              defaultValue={value?.guideNameSnapshot ?? ''}
              placeholder="마스터 미연결 시 입력"
              required
            />
          </Field>
          <Field label="담당 팀">
            <select
              name="teamId"
              defaultValue={value?.teamId ?? ''}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="">선택 없음</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="거래처">
            <select
              name="partnerId"
              defaultValue={value?.partnerId ?? ''}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="">직접 입력</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="거래처명 직접 입력">
            <TextField name="partnerNameSnapshot" defaultValue={value?.partnerNameSnapshot ?? ''} />
          </Field>
          <Field label="정산 금액" required>
            <TextField name="totalWon" type="number" defaultValue={value?.totalWon ?? 0} required />
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

export function GuideSettlementPaymentButton({
  action,
  balanceWon,
  canMutate,
  settlementId,
  workspaceSlug,
}: {
  action: (formData: FormData) => void | Promise<void>;
  balanceWon: number;
  canMutate: boolean;
  settlementId: string;
  workspaceSlug: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={!canMutate || balanceWon <= 0}
        onClick={() => setOpen(true)}
      >
        지급
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="지급 추가"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" form={`guide-payment-form-${settlementId}`}>
              저장
            </Button>
          </>
        }
      >
        <form id={`guide-payment-form-${settlementId}`} action={action} className="space-y-4">
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <input type="hidden" name="settlementId" value={settlementId} />
          <Field label="지급액" required>
            <TextField name="amountWon" type="number" max={balanceWon} required />
          </Field>
          <Field label="지급일" required>
            <TextField
              name="paidAt"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </Field>
          <Field label="메모">
            <TextField name="note" placeholder="계좌이체 / 현금 / 보정 등" />
          </Field>
        </form>
      </Modal>
    </>
  );
}
