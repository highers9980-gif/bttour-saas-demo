import {
  Badge,
  ConflictBanner,
  FilterToolbar,
  MobileCardList,
  MonthlyOpsPageShell,
  buildMonthDays,
  dateToDayInMonth,
  shiftMonth,
  todayIso,
  type ConflictBannerItem,
  type MonthGridBarTone,
} from '@bttour/ui';
import { canMutateMaster } from '@bttour/shared';
import { prisma } from '@bttour/db';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';
import {
  CreateHotelStayButton,
  type HotelStayHotelOption,
  type HotelStayTeamOption,
} from './CreateHotelStayButton';
import {
  HotelCalendarGrid,
  type HotelBookingCalendarItem,
  type HotelCalendarRow,
} from './HotelCalendarGrid';

const toneBySource: Record<'MANUAL' | 'SCHEDULE_AUTO', MonthGridBarTone> = {
  MANUAL: 'pink',
  SCHEDULE_AUTO: 'blue',
};

function parseMonth(raw?: string) {
  const fallback = todayIso().slice(0, 7);
  return raw && /^\d{4}-\d{2}$/.test(raw) ? raw : fallback;
}

function monthBounds(month: string) {
  const [year = new Date().getFullYear(), monthNo = new Date().getMonth() + 1] = month
    .split('-')
    .map(Number);
  return {
    start: new Date(Date.UTC(year, monthNo - 1, 1)),
    end: new Date(Date.UTC(year, monthNo, 0, 23, 59, 59, 999)),
  };
}

function dateFromForm(formData: FormData, key: string) {
  return new Date(`${String(formData.get(key) ?? '')}T00:00:00.000Z`);
}

function numberFromForm(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key) ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) || '') || null;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getTeamLabel(team: {
  teamNo: number;
  partner?: { name: string } | null;
  partnerNameSnapshot?: string | null;
  agentLabel?: string | null;
}) {
  const agent = team.partner?.name ?? team.partnerNameSnapshot ?? team.agentLabel ?? '팀';
  return `${agent} #${team.teamNo}`;
}

function rangesOverlap(left: HotelBookingCalendarItem, right: HotelBookingCalendarItem) {
  return left.checkInDate <= right.checkOutDate && right.checkInDate <= left.checkOutDate;
}

function buildHotelConflicts(bookings: HotelBookingCalendarItem[]) {
  const warningIds = new Set<string>();
  const conflictMap = new Map<string, HotelBookingCalendarItem[]>();

  for (let i = 0; i < bookings.length; i += 1) {
    for (let j = i + 1; j < bookings.length; j += 1) {
      const left = bookings[i];
      const right = bookings[j];
      if (!left || !right) continue;
      if (left.hotelId !== right.hotelId || !rangesOverlap(left, right)) continue;
      warningIds.add(left.id);
      warningIds.add(right.id);
      conflictMap.set(left.hotelId, [...(conflictMap.get(left.hotelId) ?? []), left, right]);
    }
  }

  const items: ConflictBannerItem[] = [...conflictMap.entries()].map(([hotelId, rows]) => {
    const uniqueRows = [...new Map(rows.map((row) => [row.id, row])).values()];
    const first = uniqueRows[0];
    if (!first) {
      return {
        id: `hotel-overlap-${hotelId}`,
        severity: 'warning',
        title: '호텔 예약 겹침',
      };
    }
    return {
      id: `hotel-overlap-${hotelId}`,
      severity: 'warning',
      title: `${first.teamLabel.split(' #')[0]} 계열 호텔 예약 겹침`,
      detail: uniqueRows
        .map((row) => `${row.teamLabel}(${row.checkInDate.slice(5)}~${row.checkOutDate.slice(5)})`)
        .join(', '),
    };
  });

  return { items, warningIds };
}

function revalidateHotelOps(slug: string) {
  revalidatePath(`/w/${slug}/hotel-calendar`);
  revalidatePath(`/w/${slug}/schedule`);
}

async function createHotelStay(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  const teamId = String(formData.get('teamId') ?? '');
  const hotelId = optionalString(formData, 'hotelId');
  const [team, hotel] = await Promise.all([
    prisma.tourTeam.findFirst({
      where: { id: teamId, workspaceId: workspace.id, deletedAt: null },
    }),
    hotelId
      ? prisma.hotel.findFirst({
          where: { id: hotelId, workspaceId: workspace.id, deletedAt: null },
        })
      : null,
  ]);

  if (!team) return;

  await prisma.teamHotelStay.create({
    data: {
      workspaceId: workspace.id,
      teamId: team.id,
      hotelId: hotel?.id,
      hotelNameSnapshot:
        optionalString(formData, 'hotelNameSnapshot') ?? hotel?.name ?? '미지정 호텔',
      checkIn: dateFromForm(formData, 'checkIn'),
      checkOut: dateFromForm(formData, 'checkOut'),
      roomCount: numberFromForm(formData, 'roomCount'),
      reservationNo: optionalString(formData, 'reservationNo'),
      source: 'MANUAL',
      status: 'TENTATIVE',
    },
  });

  revalidateHotelOps(slug);
}

export default async function HotelCalendarPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { month?: string };
}) {
  const t = await getTranslations();
  const month = parseMonth(searchParams?.month);
  const { start, end } = monthBounds(month);
  const { workspace, role } = await requireWorkspace(params.slug, 'VIEWER');
  const canCreate = canMutateMaster(role);
  const days = buildMonthDays(month, todayIso());

  const [hotels, teams, stays] = await Promise.all([
    prisma.hotel.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, active: true },
      orderBy: [{ region: 'asc' }, { name: 'asc' }],
    }),
    prisma.tourTeam.findMany({
      where: {
        workspaceId: workspace.id,
        deletedAt: null,
        startDate: { lte: end },
        endDate: { gte: start },
      },
      include: { partner: true },
      orderBy: [{ startDate: 'asc' }, { teamNo: 'asc' }],
    }),
    prisma.teamHotelStay.findMany({
      where: {
        workspaceId: workspace.id,
        status: { not: 'CANCELLED' },
        checkIn: { lte: end },
        checkOut: { gte: start },
        team: { deletedAt: null },
      },
      include: {
        hotel: true,
        team: { include: { partner: true } },
      },
      orderBy: [{ checkIn: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  const hotelRowsMap = new Map<string, HotelCalendarRow>();
  hotels.forEach((hotel) => {
    hotelRowsMap.set(hotel.id, {
      hotelId: hotel.id,
      hotelName: hotel.name,
      locationLabel: hotel.region ?? undefined,
    });
  });

  stays.forEach((stay) => {
    const rowId = stay.hotelId ?? `snapshot:${stay.hotelNameSnapshot}`;
    if (!hotelRowsMap.has(rowId)) {
      hotelRowsMap.set(rowId, {
        hotelId: rowId,
        hotelName: stay.hotel?.name ?? stay.hotelNameSnapshot,
        locationLabel: stay.hotel?.region ?? undefined,
      });
    }
  });

  const hotelRows = [...hotelRowsMap.values()];
  const bookings: HotelBookingCalendarItem[] = stays.map((stay) => {
    const rowId = stay.hotelId ?? `snapshot:${stay.hotelNameSnapshot}`;
    const checkInDate = toIsoDate(stay.checkIn);
    const checkOutDate = toIsoDate(stay.checkOut);
    return {
      id: stay.id,
      hotelId: rowId,
      fromDay: dateToDayInMonth(checkInDate, month) ?? 1,
      toDay: dateToDayInMonth(checkOutDate, month) ?? days.length,
      checkInDate,
      checkOutDate,
      teamLabel: getTeamLabel(stay.team),
      reservationNo: stay.reservationNo ?? undefined,
      source: stay.source,
      tone: toneBySource[stay.source],
    };
  });

  const { items: conflictItems, warningIds } = buildHotelConflicts(bookings);
  const bookingsWithWarnings = bookings.map((booking) =>
    warningIds.has(booking.id) ? { ...booking, warning: true } : booking,
  );

  const teamOptions: HotelStayTeamOption[] = teams.map((team) => ({
    id: team.id,
    label: getTeamLabel(team),
  }));
  const hotelOptions: HotelStayHotelOption[] = hotels.map((hotel) => ({
    id: hotel.id,
    name: hotel.name,
  }));

  return (
    <MonthlyOpsPageShell
      header={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-navy-900">
              {t('schedule.hotel_calendar.title')}
            </h1>
            <p className="text-xs text-slate-500">
              {month.replace('-', '년 ')}월 · 호텔 {hotelRows.length}곳 점유 현황
            </p>
          </div>
          <CreateHotelStayButton
            action={createHotelStay}
            canMutate={canCreate}
            hotels={hotelOptions}
            teams={teamOptions}
            workspaceSlug={params.slug}
          />
        </div>
      }
      toolbar={
        <FilterToolbar
          primary={
            <>
              <Link
                href={`/w/${params.slug}/hotel-calendar?month=${shiftMonth(month, -1)}`}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                ‹
              </Link>
              <span className="px-3 text-lg font-bold text-navy-900 num-tabular">
                {month.replace('-', '년 ')}월
              </span>
              <Link
                href={`/w/${params.slug}/hotel-calendar?month=${shiftMonth(month, 1)}`}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                ›
              </Link>
            </>
          }
          secondary={
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" defaultChecked className="h-4 w-4" />
              일정현황 자동 표시 (
              {bookings.filter((booking) => booking.source === 'SCHEDULE_AUTO').length})
            </label>
          }
          extraRow={
            <>
              <select className="h-9 rounded-lg border border-slate-300 px-3 text-sm">
                <option>{t('schedule.filter.hotel_all')}</option>
                {hotelRows.map((hotel) => (
                  <option key={hotel.hotelId}>{hotel.hotelName}</option>
                ))}
              </select>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-4 rounded border border-pink-200 bg-pink-100" />
                  수동 예약
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-4 rounded border border-dashed border-sky-400 bg-sky-100" />
                  일정현황 자동
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-amber-200 bg-yellow-50" />
                  주말
                </span>
              </div>
            </>
          }
        />
      }
      banner={<ConflictBanner items={conflictItems} showWhenEmpty />}
    >
      <div className="hidden md:block">
        <HotelCalendarGrid
          days={days}
          hotels={hotelRows}
          bookings={bookingsWithWarnings}
          month={month}
        />
      </div>

      <MobileCardList
        className="md:hidden"
        rows={bookingsWithWarnings}
        rowKey={(booking) => booking.id}
        renderCard={(booking) => {
          const hotel = hotelRows.find((row) => row.hotelId === booking.hotelId);
          return (
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-navy-900">{hotel?.hotelName}</div>
                  <div className="text-xs text-slate-500">
                    {booking.checkInDate.slice(5)}~{booking.checkOutDate.slice(5)}
                  </div>
                </div>
                <Badge tone={booking.source === 'MANUAL' ? 'pink' : 'blue'}>
                  {booking.source === 'MANUAL' ? '수동' : '자동'}
                </Badge>
              </div>
              <div className="text-sm font-semibold text-slate-700">{booking.teamLabel}</div>
              {booking.warning && <Badge tone="red">확인 필요</Badge>}
            </div>
          );
        }}
      />
    </MonthlyOpsPageShell>
  );
}
