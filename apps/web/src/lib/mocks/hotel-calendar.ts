import type { MonthGridBarTone } from '@bttour/ui';

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
  source: 'manual' | 'schedule_auto';
  tone: MonthGridBarTone;
  warning?: boolean;
}

export const hotelCalendarMonth = '2026-04';

export const hotelRows: HotelCalendarRow[] = [
  { hotelId: 'plaza', hotelName: 'Plaza Hotel', roomCount: 62, locationLabel: 'Seoul' },
  { hotelId: 'bay-view', hotelName: 'Bay View', roomCount: 88, locationLabel: 'Incheon' },
  { hotelId: 'crown', hotelName: 'Crown Hotel', roomCount: 45, locationLabel: 'Seoul' },
  { hotelId: 'royal-park', hotelName: 'Royal Park', roomCount: 72, locationLabel: 'Busan' },
  { hotelId: 'icn-plaza', hotelName: 'ICN-Plaza', roomCount: 40, locationLabel: 'Incheon' },
  { hotelId: 'pus-marina', hotelName: 'PUS-Marina', roomCount: 54, locationLabel: 'Busan' },
];

export const hotelBookings: HotelBookingCalendarItem[] = [
  {
    id: 'booking-19',
    hotelId: 'plaza',
    fromDay: 1,
    toDay: 5,
    checkInDate: '2026-04-01',
    checkOutDate: '2026-04-05',
    teamLabel: 'Pacific Travel #19',
    reservationNo: 'A249451',
    source: 'manual',
    tone: 'pink',
  },
  {
    id: 'booking-22',
    hotelId: 'bay-view',
    fromDay: 2,
    toDay: 6,
    checkInDate: '2026-04-02',
    checkOutDate: '2026-04-06',
    teamLabel: 'Skyline Tours #22',
    reservationNo: '192605',
    source: 'manual',
    tone: 'amber',
  },
  {
    id: 'booking-20',
    hotelId: 'crown',
    fromDay: 1,
    toDay: 3,
    checkInDate: '2026-04-01',
    checkOutDate: '2026-04-03',
    teamLabel: 'Coastal Express #20',
    reservationNo: 'A249452',
    source: 'manual',
    tone: 'purple',
  },
  {
    id: 'booking-24',
    hotelId: 'royal-park',
    fromDay: 10,
    toDay: 15,
    checkInDate: '2026-04-10',
    checkOutDate: '2026-04-15',
    teamLabel: 'Summit Travel #24',
    reservationNo: '192608',
    source: 'manual',
    tone: 'amber',
  },
  {
    id: 'auto-27',
    hotelId: 'bay-view',
    fromDay: 25,
    toDay: 28,
    checkInDate: '2026-04-25',
    checkOutDate: '2026-04-28',
    teamLabel: 'Pacific #27',
    source: 'schedule_auto',
    tone: 'blue',
  },
  {
    id: 'auto-29',
    hotelId: 'bay-view',
    fromDay: 26,
    toDay: 30,
    checkInDate: '2026-04-26',
    checkOutDate: '2026-04-30',
    teamLabel: 'Skyline Tours #29',
    source: 'schedule_auto',
    tone: 'red',
    warning: true,
  },
  {
    id: 'auto-30',
    hotelId: 'plaza',
    fromDay: 27,
    toDay: 30,
    checkInDate: '2026-04-27',
    checkOutDate: '2026-04-30',
    teamLabel: 'Horizon #30',
    source: 'schedule_auto',
    tone: 'blue',
  },
];

export const hotelConflicts = [
  {
    id: 'hotel-bay-view-overlap',
    severity: 'warning' as const,
    title: 'Bay View 자동 예약 겹침',
    detail: '04/27~04/28에 #27, #29, #31 예약이 같은 row에 겹칩니다. 객실 수 확인이 필요합니다.',
  },
] as const;
