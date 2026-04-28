'use client';

import { Button, Field, Modal, TextField } from '@bttour/ui';
import { useState } from 'react';

export interface HotelStayTeamOption {
  id: string;
  label: string;
}

export interface HotelStayHotelOption {
  id: string;
  name: string;
}

export function CreateHotelStayButton({
  action,
  canMutate,
  hotels,
  teams,
  workspaceSlug,
}: {
  action: (formData: FormData) => void | Promise<void>;
  canMutate: boolean;
  hotels: HotelStayHotelOption[];
  teams: HotelStayTeamOption[];
  workspaceSlug: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" disabled={!canMutate} onClick={() => setOpen(true)}>
        + 수동 예약
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="호텔 수동 예약"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" form="create-hotel-stay-form" disabled={!canMutate}>
              저장
            </Button>
          </>
        }
      >
        <form id="create-hotel-stay-form" action={action} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <Field label="팀" required>
            <select
              name="teamId"
              required
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
              defaultValue=""
            >
              <option value="">선택</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="호텔">
            <select
              name="hotelId"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
              defaultValue=""
            >
              <option value="">직접 입력</option>
              {hotels.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="호텔명 직접 입력">
            <TextField name="hotelNameSnapshot" placeholder="마스터 미연결 시 입력" />
          </Field>
          <Field label="예약번호">
            <TextField name="reservationNo" />
          </Field>
          <Field label="체크인" required>
            <TextField name="checkIn" type="date" required />
          </Field>
          <Field label="체크아웃" required>
            <TextField name="checkOut" type="date" required />
          </Field>
          <Field label="객실 수">
            <TextField name="roomCount" type="number" min={0} defaultValue={0} />
          </Field>
        </form>
      </Modal>
    </>
  );
}
