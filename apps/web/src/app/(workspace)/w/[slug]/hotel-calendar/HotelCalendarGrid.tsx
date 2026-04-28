'use client';

import { MonthGridBar, MonthGridScroller, type MonthDay, type MonthGridBarTone } from '@bttour/ui';

export interface HotelCalendarRow {
  hotelId: string;
  hotelName: string;
  roomCount?: number;
  locationLabel?: string;
}

export interface HotelBookingCalendarItem {
  id: string;
  hotelId: string;
  fromDay: number;
  toDay: number;
  checkInDate: string;
  checkOutDate: string;
  teamLabel: string;
  reservationNo?: string;
  source: 'MANUAL' | 'SCHEDULE_AUTO';
  tone: MonthGridBarTone;
  warning?: boolean;
}

export function HotelCalendarGrid({
  bookings,
  days,
  hotels,
  month,
}: {
  days: MonthDay[];
  hotels: HotelCalendarRow[];
  bookings: HotelBookingCalendarItem[];
  month: string;
}) {
  return (
    <MonthGridScroller
      month={month}
      days={days}
      rows={hotels}
      bars={bookings}
      labelColumnWidth={200}
      dayColumnWidth={40}
      maxHeight="calc(100vh - 300px)"
      getRowId={(row) => row.hotelId}
      renderRowLabel={(row) => (
        <div className="min-w-0">
          <div className="truncate font-bold text-navy-900">{row.hotelName}</div>
          <div className="text-xs text-slate-400">
            {row.locationLabel ?? '-'} · {row.roomCount ?? 0} rooms
          </div>
        </div>
      )}
      getBarRowId={(bar) => bar.hotelId}
      getBarRange={(bar) => ({ fromDay: bar.fromDay, toDay: bar.toDay })}
      renderBar={(bar) => (
        <MonthGridBar
          label={`${bar.teamLabel}${bar.reservationNo ? ` #${bar.reservationNo}` : ''}`}
          tone={bar.tone}
          dashed={bar.source === 'SCHEDULE_AUTO'}
          warning={bar.warning}
          clickable
          title={`${bar.teamLabel} · ${bar.checkInDate}~${bar.checkOutDate}`}
        />
      )}
    />
  );
}
