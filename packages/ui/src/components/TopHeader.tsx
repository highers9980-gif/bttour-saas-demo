import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface TopHeaderProps {
  title: string;
  subtitle?: string;
  /** 도면 dashboard.html의 AI 크레딧 위젯 + 알림 + 검색 등이 이 슬롯에 들어감. */
  rightSlot?: ReactNode;
  className?: string;
}

export function TopHeader({
  title,
  subtitle,
  rightSlot,
  className,
}: TopHeaderProps) {
  return (
    <header
      className={cn(
        'bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-navy-900 truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-slate-500 truncate">{subtitle}</p>
        )}
      </div>
      {rightSlot && <div className="flex items-center gap-3">{rightSlot}</div>}
    </header>
  );
}
