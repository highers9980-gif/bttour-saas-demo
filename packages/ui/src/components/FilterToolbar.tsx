import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface FilterToolbarProps {
  /** 좌측 슬롯 — 보통 MonthNavigator + 주요 필터 */
  primary?: ReactNode;
  /** 우측 슬롯 — 검색·뷰토글·CTA 버튼 */
  secondary?: ReactNode;
  /** 두 번째 줄 — 추가 필터 (가이드/호텔/상태) */
  extraRow?: ReactNode;
  className?: string;
}

/**
 * 운영 뷰 상단 필터 카드. schedule / team-timeline / hotel-calendar 모두 공통 사용.
 * 모바일에서는 primary는 표시, secondary/extraRow는 collapse 권장 (호출 측 제어).
 */
export function FilterToolbar({
  primary,
  secondary,
  extraRow,
  className,
}: FilterToolbarProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-100 shadow-soft px-4 py-3 space-y-3',
        className,
      )}
    >
      {(primary || secondary) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {primary && (
            <div className="flex items-center gap-2 flex-wrap">{primary}</div>
          )}
          {secondary && (
            <div className="flex items-center gap-2 flex-wrap">{secondary}</div>
          )}
        </div>
      )}
      {extraRow && (
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
          {extraRow}
        </div>
      )}
    </div>
  );
}
