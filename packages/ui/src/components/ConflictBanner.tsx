import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type ConflictSeverity = 'info' | 'warning' | 'danger';

export interface ConflictBannerItem {
  id: string;
  severity: ConflictSeverity;
  title: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
}

export interface ConflictBannerProps {
  items: ConflictBannerItem[];
  /** 0건일 때 success chip을 표시할지 */
  showWhenEmpty?: boolean;
  emptyMessage?: ReactNode;
  className?: string;
}

const severityClass: Record<ConflictSeverity, string> = {
  info: 'bg-slate-50 border-slate-200 text-slate-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  danger: 'bg-red-50 border-red-200 text-red-800',
};

const severityIcon: Record<ConflictSeverity, string> = {
  info: 'i',
  warning: '⚠',
  danger: '!',
};

/**
 * 가이드 중복 배정 / 객실 충돌 / 미배정 등 운영 경고 모음.
 * team-timeline / hotel-calendar 상단에 사용.
 */
export function ConflictBanner({
  items,
  showWhenEmpty = false,
  emptyMessage = '충돌 없음',
  className,
}: ConflictBannerProps) {
  if (items.length === 0) {
    if (!showWhenEmpty) return null;
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-1.5 text-xs font-semibold',
          className,
        )}
      >
        <span>✓</span> {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'border rounded-lg px-4 py-3 flex items-start gap-3',
            severityClass[item.severity],
          )}
        >
          <span className="w-6 h-6 grid place-items-center rounded-full bg-white text-sm font-bold shrink-0">
            {severityIcon[item.severity]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{item.title}</div>
            {item.detail && (
              <div className="text-xs mt-0.5 text-slate-600">{item.detail}</div>
            )}
          </div>
          {item.action && <div className="shrink-0">{item.action}</div>}
        </div>
      ))}
    </div>
  );
}
