import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  variant?: 'card' | 'inline';
}

/**
 * 데이터 없음 상태. 신규 워크스페이스, 빈 정산 월, 검색 결과 0건 등에 사용.
 */
export function EmptyState({
  emoji = '📭',
  title,
  description,
  action,
  className,
  variant = 'card',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'text-center',
        variant === 'card' &&
          'bg-white rounded-2xl border border-dashed border-slate-200 p-10',
        variant === 'inline' && 'py-8',
        className,
      )}
    >
      <div className="text-4xl mb-4">{emoji}</div>
      <div className="text-base font-semibold text-navy-900 mb-1">{title}</div>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
