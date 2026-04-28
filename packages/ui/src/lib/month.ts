/**
 * 월간 운영 그리드(team-timeline / hotel-calendar)에서 공통으로 쓰는 날짜 유틸.
 * Codex 07 §공통 데이터 모델 후보 기반.
 */

export interface MonthDay {
  /** 1~31 */
  day: number;
  /** ISO 형식 YYYY-MM-DD */
  date: string;
  /** 0=일, 1=월, ... 6=토 */
  weekday: number;
  isWeekend: boolean;
  isToday: boolean;
}

/**
 * 입력: month = "2026-04", today = optional ISO date 문자열.
 * 출력: 해당 월의 1일부터 말일까지 MonthDay 배열.
 */
export function buildMonthDays(month: string, today?: string): MonthDay[] {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const m = Number(monthStr);
  if (!year || !m || m < 1 || m > 12) {
    throw new Error(`buildMonthDays: invalid month "${month}"`);
  }

  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const days: MonthDay[] = [];

  for (let d = 1; d <= lastDay; d++) {
    const date = `${year.toString().padStart(4, '0')}-${m
      .toString()
      .padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    const weekday = new Date(Date.UTC(year, m - 1, d)).getUTCDay();
    days.push({
      day: d,
      date,
      weekday,
      isWeekend: weekday === 0 || weekday === 6,
      isToday: today === date,
    });
  }

  return days;
}

/** "2026-04-15" → 15 ("2026-04" 컨텍스트에서). 다른 월이면 null. */
export function dateToDayInMonth(
  date: string,
  month: string,
): number | null {
  if (!date.startsWith(`${month}-`)) return null;
  const parsed = Number(date.slice(8, 10));
  return Number.isFinite(parsed) ? parsed : null;
}

/** 월 ISO YYYY-MM 시프트 (예: "2026-04" + 1 = "2026-05") */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) throw new Error(`shiftMonth: invalid "${month}"`);
  const total = y * 12 + (m - 1) + delta;
  const newY = Math.floor(total / 12);
  const newM = (total % 12) + 1;
  return `${newY.toString().padStart(4, '0')}-${newM.toString().padStart(2, '0')}`;
}

export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
}
