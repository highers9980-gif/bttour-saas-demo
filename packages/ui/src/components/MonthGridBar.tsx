import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type MonthGridBarTone =
  | 'navy'
  | 'orange'
  | 'green'
  | 'amber'
  | 'red'
  | 'blue'
  | 'pink'
  | 'purple'
  | 'cyan'
  | 'slate';

const toneClass: Record<MonthGridBarTone, string> = {
  navy: 'bg-navy-900 text-white',
  orange: 'bg-orange-500 text-white',
  green: 'bg-green-500 text-white',
  amber: 'bg-amber-500 text-white',
  red: 'bg-red-500 text-white',
  blue: 'bg-blue-500 text-white',
  pink: 'bg-pink-500 text-white',
  purple: 'bg-purple-500 text-white',
  cyan: 'bg-cyan-500 text-white',
  slate: 'bg-slate-500 text-white',
};

export interface MonthGridBarProps {
  /** 표시 라벨. 짧을수록 좋음 (가로폭 좁을 수 있음) */
  label: ReactNode;
  tone?: MonthGridBarTone;
  /** dashed 외곽선 (자동 표시 항목에 사용 — 호텔 캘린더 auto booking) */
  dashed?: boolean;
  /** 경고 외곽선 (충돌·미배정 강조) */
  warning?: boolean;
  /** 인터랙션 가능 (hover/cursor) */
  clickable?: boolean;
  className?: string;
  title?: string; // tooltip
}

/**
 * 월간 그리드 안에 들어가는 막대.
 * MonthGridScroller가 위치(left/width)를 잡아 주고, 이 컴포넌트는 외양만 담당.
 */
export function MonthGridBar({
  label,
  tone = 'navy',
  dashed = false,
  warning = false,
  clickable = false,
  className,
  title,
}: MonthGridBarProps) {
  return (
    <div
      title={title}
      className={cn(
        'h-7 rounded-md px-2 flex items-center text-xs font-semibold truncate shadow-soft',
        toneClass[tone],
        dashed && 'border-2 border-white/70 border-dashed bg-opacity-70',
        warning && 'ring-2 ring-red-400 ring-offset-1 ring-offset-white',
        clickable && 'cursor-pointer hover:opacity-90 transition',
        className,
      )}
    >
      {label}
    </div>
  );
}
