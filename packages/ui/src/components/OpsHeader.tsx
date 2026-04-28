import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface OpsHeaderProps {
  emoji?: string;
  title: string;
  subtitle?: string;
  monthNavigator?: ReactNode;
  rightSlot?: ReactNode;
  className?: string;
}

/**
 * 운영 뷰 공용 상단 헤더.
 * 일정현황(ScheduleView)의 erp-sch-header 스타일을 표준으로 함:
 *   [emoji + 타이틀 + 인라인 월 네비게이터] | [우측 슬롯(동기화 시각·새로고침 등)]
 */
export function OpsHeader({
  emoji,
  title,
  subtitle,
  monthNavigator,
  rightSlot,
  className,
}: OpsHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between gap-4 px-5 py-4 bg-white border-b border-slate-200',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {emoji && <span className="text-lg shrink-0">{emoji}</span>}
        <div className="min-w-0">
          <h1 className="text-base font-bold text-navy-900 truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 truncate">{subtitle}</p>
          )}
        </div>
        {monthNavigator && <div className="ml-2">{monthNavigator}</div>}
      </div>
      {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
    </header>
  );
}
