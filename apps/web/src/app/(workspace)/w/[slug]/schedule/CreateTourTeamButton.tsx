'use client';

import { Button, Field, Modal, TextField } from '@bttour/ui';
import { useState } from 'react';

export interface PartnerOption {
  id: string;
  name: string;
}

export function CreateTourTeamButton({
  action,
  canMutate,
  month,
  partners,
  workspaceSlug,
}: {
  action: (formData: FormData) => void | Promise<void>;
  canMutate: boolean;
  month: string;
  partners: PartnerOption[];
  workspaceSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const [year, monthNo] = month.split('-').map(Number);

  return (
    <>
      <Button variant="secondary" disabled={!canMutate} onClick={() => setOpen(true)}>
        + 신규 팀
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="신규 팀 등록"
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" form="create-tour-team-form" disabled={!canMutate}>
              저장
            </Button>
          </>
        }
      >
        <form id="create-tour-team-form" action={action} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <Field label="연도" required>
            <TextField name="year" type="number" defaultValue={year} required />
          </Field>
          <Field label="월" required>
            <TextField
              name="month"
              type="number"
              min={1}
              max={12}
              defaultValue={monthNo}
              required
            />
          </Field>
          <Field label="팀 번호" required>
            <TextField name="teamNo" type="number" min={1} required />
          </Field>
          <Field label="거래처">
            <select
              name="partnerId"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
              defaultValue=""
            >
              <option value="">직접 입력</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="거래처명 직접 입력">
            <TextField name="partnerNameSnapshot" placeholder="마스터 미연결 시 입력" />
          </Field>
          <Field label="시작일" required>
            <TextField name="startDate" type="date" required />
          </Field>
          <Field label="종료일" required>
            <TextField name="endDate" type="date" required />
          </Field>
          <Field label="성인">
            <TextField name="paxAdult" type="number" min={0} defaultValue={0} />
          </Field>
          <Field label="아동">
            <TextField name="paxChild" type="number" min={0} defaultValue={0} />
          </Field>
          <Field label="TC">
            <TextField name="paxTc" type="number" min={0} defaultValue={0} />
          </Field>
          <Field label="출발지 코드">
            <TextField name="originCode" placeholder="TYO / BKK / MNL" />
          </Field>
          <Field label="입국편">
            <TextField name="flightIn" placeholder="KE123" />
          </Field>
          <Field label="출국편">
            <TextField name="flightOut" placeholder="KE124" />
          </Field>
          <Field label="투어 타입" className="sm:col-span-2">
            <TextField name="tourType" placeholder="패키지 / 인센티브 / FIT" />
          </Field>
        </form>
      </Modal>
    </>
  );
}
