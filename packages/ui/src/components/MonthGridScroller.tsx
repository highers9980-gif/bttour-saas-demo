'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import type { MonthDay } from '../lib/month';

/**
 * 운영 월간 간트 공통 컴포넌트.
 * team-timeline / hotel-calendar 도면이 거의 같은 구조라 한 컴포넌트에서 처리.
 *
 * 핵심 UX:
 * - sticky 좌측 라벨 컬럼 (호텔명 / 가이드명)
 * - 가로 스크롤되는 날짜 헤더 + 셀 그리드
 * - bar는 row 내부의 absolute positioning, fromDay/toDay → left/width 계산
 * - 주말/오늘 highlight
 * - 같은 row에 bar 여러 개 겹칠 수 있음 (Phase 1B는 단일 row + 겹침 허용)
 */

const KEYS = {
  labelDefault: 220,
  dayDefault: 40,
  rowHeight: 56,
  headerHeight: 48,
} as const;

export interface MonthGridScrollerProps<Row, Bar> {
  month: string;
  days: MonthDay[];
  rows: Row[];
  bars: Bar[];
  labelColumnWidth?: number;
  dayColumnWidth?: number;
  rowHeight?: number;
  /** 컨테이너 max-height (스크롤 영역) */
  maxHeight?: string;

  getRowId(row: Row): string;
  renderRowLabel(row: Row): ReactNode;

  getBarRowId(bar: Bar): string;
  /** 1-indexed day 범위. fromDay <= toDay */
  getBarRange(bar: Bar): { fromDay: number; toDay: number };
  renderBar(bar: Bar): ReactNode;
  onBarClick?: (bar: Bar) => void;

  /** 헤더 영역 우측에 들어갈 추가 슬롯 (예: 범례) */
  legend?: ReactNode;
  emptyMessage?: ReactNode;
  className?: string;
}

const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function MonthGridScroller<Row, Bar>({
  days,
  rows,
  bars,
  labelColumnWidth = KEYS.labelDefault,
  dayColumnWidth = KEYS.dayDefault,
  rowHeight = KEYS.rowHeight,
  maxHeight = '70vh',
  getRowId,
  renderRowLabel,
  getBarRowId,
  getBarRange,
  renderBar,
  onBarClick,
  legend,
  emptyMessage,
  className,
}: MonthGridScrollerProps<Row, Bar>) {
  if (rows.length === 0) {
    return (
      <div
        className={cn(
          'rounded-2xl bg-white border border-slate-100 p-10 text-center text-sm text-slate-500',
          className,
        )}
      >
        {emptyMessage ?? '표시할 데이터가 없습니다'}
      </div>
    );
  }

  const totalGridWidth = days.length * dayColumnWidth;
  const barsByRow = new Map<string, Bar[]>();
  for (const bar of bars) {
    const rowId = getBarRowId(bar);
    const list = barsByRow.get(rowId) ?? [];
    list.push(bar);
    barsByRow.set(rowId, list);
  }

  return (
    <div
      className={cn(
        'relative rounded-2xl bg-white border border-slate-100 overflow-hidden',
        className,
      )}
    >
      {legend && (
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 text-xs flex items-center gap-3 flex-wrap">
          {legend}
        </div>
      )}
      <div className="overflow-auto scroll-thin" style={{ maxHeight }}>
        <div
          className="relative"
          style={{ width: labelColumnWidth + totalGridWidth }}
        >
          {/* 헤더 행: 좌측 sticky 라벨 + 우측 날짜 칸 */}
          <div
            className="sticky top-0 z-20 flex bg-white border-b border-slate-200"
            style={{ height: KEYS.headerHeight }}
          >
            <div
              className="sticky left-0 z-30 bg-white border-r border-slate-200 flex items-center px-4 text-xs font-semibold text-slate-600"
              style={{ width: labelColumnWidth, minWidth: labelColumnWidth }}
            >
              호텔 / 가이드
            </div>
            <div
              className="flex"
              style={{ width: totalGridWidth, minWidth: totalGridWidth }}
            >
              {days.map((d) => (
                <div
                  key={d.date}
                  className={cn(
                    'flex flex-col items-center justify-center border-r border-slate-100 text-xs',
                    d.isWeekend && 'bg-orange-50/40',
                    d.isToday && 'bg-orange-100',
                  )}
                  style={{ width: dayColumnWidth, minWidth: dayColumnWidth }}
                >
                  <span
                    className={cn(
                      'font-semibold num-tabular',
                      d.isToday ? 'text-orange-600' : 'text-navy-900',
                    )}
                  >
                    {d.day}
                  </span>
                  <span
                    className={cn(
                      'text-[10px]',
                      d.weekday === 0 && 'text-red-500',
                      d.weekday === 6 && 'text-blue-500',
                      d.weekday !== 0 && d.weekday !== 6 && 'text-slate-400',
                    )}
                  >
                    {WEEKDAY_LABEL[d.weekday]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 본문: 행 반복 */}
          {rows.map((row) => {
            const rowId = getRowId(row);
            const rowBars = barsByRow.get(rowId) ?? [];
            return (
              <div
                key={rowId}
                className="flex border-b border-slate-100 hover:bg-slate-50/50"
                style={{ height: rowHeight }}
              >
                {/* sticky 라벨 */}
                <div
                  className="sticky left-0 z-10 bg-white border-r border-slate-200 flex items-center px-4 text-sm"
                  style={{
                    width: labelColumnWidth,
                    minWidth: labelColumnWidth,
                  }}
                >
                  {renderRowLabel(row)}
                </div>
                {/* 날짜 셀 그리드 + bar 절대 배치 */}
                <div
                  className="relative"
                  style={{
                    width: totalGridWidth,
                    minWidth: totalGridWidth,
                  }}
                >
                  {/* 셀 가이드라인 (border) */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {days.map((d) => (
                      <div
                        key={d.date}
                        className={cn(
                          'border-r border-slate-100 h-full',
                          d.isWeekend && 'bg-orange-50/30',
                          d.isToday && 'bg-orange-100/40',
                        )}
                        style={{
                          width: dayColumnWidth,
                          minWidth: dayColumnWidth,
                        }}
                      />
                    ))}
                  </div>

                  {/* bar 렌더링 */}
                  {rowBars.map((bar, idx) => {
                    const { fromDay, toDay } = getBarRange(bar);
                    const left = (fromDay - 1) * dayColumnWidth + 2;
                    const width =
                      (toDay - fromDay + 1) * dayColumnWidth - 4;
                    return (
                      <div
                        key={`${rowId}-${idx}`}
                        className="absolute top-1/2 -translate-y-1/2 z-10"
                        style={{
                          left,
                          width: Math.max(width, dayColumnWidth - 4),
                        }}
                        onClick={
                          onBarClick ? () => onBarClick(bar) : undefined
                        }
                      >
                        {renderBar(bar)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
