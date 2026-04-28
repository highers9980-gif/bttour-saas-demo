'use client';

import { Button, Field, Modal, TextField } from '@bttour/ui';
import { useMemo, useState } from 'react';

export interface ShoppingOption {
  id: string;
  label: string;
  ratePercent?: number | null;
}

export interface ShoppingSaleFormValue {
  id: string;
  visitDate: string;
  teamId?: string;
  guideId?: string;
  centerId: string;
  paxCount: number;
  buyerCount: number;
  salesWon: number;
  commissionRatePercent?: number | null;
  commissionWon?: number;
  category?: string;
  memo?: string;
}

export function ShoppingSaleFormButton({
  action,
  canMutate,
  centers,
  guides,
  teams,
  value,
  workspaceSlug,
}: {
  action: (formData: FormData) => void | Promise<void>;
  canMutate: boolean;
  centers: ShoppingOption[];
  guides: ShoppingOption[];
  teams: ShoppingOption[];
  value?: ShoppingSaleFormValue;
  workspaceSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedCenterId, setSelectedCenterId] = useState(value?.centerId ?? '');
  const [salesWon, setSalesWon] = useState(value?.salesWon ?? 0);
  const [commissionRatePercent, setCommissionRatePercent] = useState(
    value?.commissionRatePercent?.toString() ?? '',
  );
  const [commissionWon, setCommissionWon] = useState(value?.commissionWon?.toString() ?? '');
  const isEdit = Boolean(value);
  const selectedCenter = useMemo(
    () => centers.find((center) => center.id === selectedCenterId),
    [centers, selectedCenterId],
  );
  const effectiveRate =
    Number.isFinite(Number(commissionRatePercent)) && Number(commissionRatePercent) > 0
      ? Number(commissionRatePercent)
      : (selectedCenter?.ratePercent ?? 15);
  const previewCommissionWon = commissionWon.trim()
    ? Number(commissionWon)
    : Math.round(Number(salesWon || 0) * effectiveRate * 0.01);

  return (
    <>
      <Button
        size={isEdit ? 'sm' : 'md'}
        variant={isEdit ? 'outline' : 'secondary'}
        disabled={!canMutate || centers.length === 0}
        onClick={() => setOpen(true)}
      >
        {isEdit ? '수정' : '+ 매출 등록'}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isEdit ? '쇼핑 매출 수정' : '쇼핑 매출 등록'}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" form={`shopping-sale-form-${value?.id ?? 'new'}`}>
              저장
            </Button>
          </>
        }
      >
        <form
          id={`shopping-sale-form-${value?.id ?? 'new'}`}
          action={action}
          className="grid gap-4 sm:grid-cols-2"
        >
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          {value && <input type="hidden" name="id" value={value.id} />}
          <Field label="방문일" required>
            <TextField
              name="visitDate"
              type="date"
              defaultValue={value?.visitDate ?? ''}
              required
            />
          </Field>
          <Field label="쇼핑센터" required>
            <select
              name="centerId"
              required
              value={selectedCenterId}
              onChange={(event) => {
                const nextCenter = centers.find((center) => center.id === event.target.value);
                setSelectedCenterId(event.target.value);
                if (!commissionRatePercent.trim() && nextCenter?.ratePercent != null) {
                  setCommissionRatePercent(String(nextCenter.ratePercent));
                }
              }}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="">선택</option>
              {centers.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.label}
                </option>
              ))}
            </select>
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
          <Field label="가이드">
            <select
              name="guideId"
              defaultValue={value?.guideId ?? ''}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="">선택 없음</option>
              {guides.map((guide) => (
                <option key={guide.id} value={guide.id}>
                  {guide.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="카테고리">
            <TextField
              name="category"
              defaultValue={value?.category ?? ''}
              placeholder="인삼 / 적송 / 화장품 / 영지"
            />
          </Field>
          <Field label="인원">
            <TextField name="paxCount" type="number" min={0} defaultValue={value?.paxCount ?? 0} />
          </Field>
          <Field label="구매 인원">
            <TextField
              name="buyerCount"
              type="number"
              min={0}
              defaultValue={value?.buyerCount ?? 0}
            />
          </Field>
          <Field label="매출액" required>
            <TextField
              name="salesWon"
              type="number"
              min={0}
              value={salesWon}
              onChange={(event) => setSalesWon(Number(event.target.value || 0))}
              required
            />
          </Field>
          <Field label="수수료율 (%)">
            <TextField
              name="commissionRatePercent"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={commissionRatePercent}
              onChange={(event) => setCommissionRatePercent(event.target.value)}
              placeholder={
                selectedCenter?.ratePercent != null ? String(selectedCenter.ratePercent) : '15'
              }
            />
          </Field>
          <Field label="수수료(원)">
            <TextField
              name="commissionWon"
              type="number"
              min={0}
              value={commissionWon}
              onChange={(event) => setCommissionWon(event.target.value)}
              placeholder={String(previewCommissionWon || 0)}
            />
          </Field>
          <p className="text-xs text-slate-500 sm:col-span-2">
            수수료(원)을 직접 입력하면 비율보다 우선 적용 · 예상 수수료{' '}
            {Number.isFinite(previewCommissionWon)
              ? new Intl.NumberFormat('ko-KR').format(previewCommissionWon)
              : 0}
            원
          </p>
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
