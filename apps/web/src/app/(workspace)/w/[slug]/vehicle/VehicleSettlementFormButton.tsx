'use client';

import { Button, Field, Modal, TextField } from '@bttour/ui';
import { useState } from 'react';

export interface VehicleOption {
  id: string;
  label: string;
}

export interface VehicleSettlementFormValue {
  id: string;
  teamId?: string;
  vehicleId?: string;
  partnerId?: string;
  vehicleLabelSnapshot: string;
  periodYear: number;
  periodMonth: number;
  supplyAmountWon: number;
  memo?: string;
}

export function VehicleSettlementFormButton({
  action,
  canMutate,
  defaultMonth,
  defaultYear,
  partners,
  teams,
  value,
  vehicles,
  workspaceSlug,
}: {
  action: (formData: FormData) => void | Promise<void>;
  canMutate: boolean;
  defaultMonth: number;
  defaultYear: number;
  partners: VehicleOption[];
  teams: VehicleOption[];
  value?: VehicleSettlementFormValue;
  vehicles: VehicleOption[];
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
        {isEdit ? '수정' : '+ 운행 등록'}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isEdit ? '차량비 수정' : '차량 운행 등록'}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" form={`vehicle-settlement-form-${value?.id ?? 'new'}`}>
              저장
            </Button>
          </>
        }
      >
        <form
          id={`vehicle-settlement-form-${value?.id ?? 'new'}`}
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
          <Field label="팀">
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
          <Field label="차량">
            <select
              name="vehicleId"
              defaultValue={value?.vehicleId ?? ''}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="">직접 입력</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="차량 라벨" required>
            <TextField
              name="vehicleLabelSnapshot"
              defaultValue={value?.vehicleLabelSnapshot ?? ''}
              required
            />
          </Field>
          <Field label="거래처">
            <select
              name="partnerId"
              defaultValue={value?.partnerId ?? ''}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="">선택 없음</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="공급가" required>
            <TextField
              name="supplyAmountWon"
              type="number"
              defaultValue={value?.supplyAmountWon ?? 0}
              required
            />
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

export function VehiclePaymentButton({
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
        title="차량비 지급 추가"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" form={`vehicle-payment-form-${settlementId}`}>
              저장
            </Button>
          </>
        }
      >
        <form id={`vehicle-payment-form-${settlementId}`} action={action} className="space-y-4">
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
            <TextField name="note" />
          </Field>
        </form>
      </Modal>
    </>
  );
}
