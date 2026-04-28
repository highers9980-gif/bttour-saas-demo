import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: { direction: 'up' | 'down' | 'flat'; text: string };
  emoji?: string;
  highlight?: boolean;
  footer?: ReactNode;
  className?: string;
}

const deltaClass = {
  up: 'text-green-600',
  down: 'text-red-500',
  flat: 'text-slate-500',
} as const;

const deltaIcon = {
  up: '▲',
  down: '▼',
  flat: '─',
} as const;

/**
 * 도면 dashboard.html의 KPI 카드 4개 패턴을 컴포넌트화한 것.
 * 이번달 매출/이번달 이익/진행 중인 팀/미수금 잔액 등에 사용.
 */
export function KpiCard({
  label,
  value,
  unit,
  delta,
  emoji,
  highlight = false,
  footer,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white p-5 shadow-soft border border-slate-100',
        className,
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-slate-500">{label}</span>
        {emoji && <span className="text-xl">{emoji}</span>}
      </div>
      <div
        className={cn(
          'text-2xl font-bold num-tabular',
          highlight ? 'text-orange-500' : 'text-navy-900',
        )}
      >
        {value}
        {unit && <span className="text-sm text-slate-500 ml-1">{unit}</span>}
      </div>
      {delta && (
        <div
          className={cn(
            'text-xs font-semibold mt-1.5',
            deltaClass[delta.direction],
          )}
        >
          {deltaIcon[delta.direction]} {delta.text}
        </div>
      )}
      {footer && <div className="text-xs text-slate-500 mt-1.5">{footer}</div>}
    </div>
  );
}
