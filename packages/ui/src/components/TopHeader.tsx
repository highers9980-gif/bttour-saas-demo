'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface TopHeaderProps {
  title: string;
  subtitle?: string;
  workspaceName?: string;
  userInitial?: string;
  onMenuClick?: () => void;
  /** 도면 dashboard.html의 AI 크레딧 위젯 + 알림 + 검색 등이 이 슬롯에 들어감. */
  rightSlot?: ReactNode;
  className?: string;
}

export function TopHeader({
  title,
  subtitle,
  workspaceName,
  userInitial,
  onMenuClick,
  rightSlot,
  className,
}: TopHeaderProps) {
  return (
    <header
      className={cn(
        'bg-white border-b border-slate-200 h-16 px-4 lg:px-8',
        className,
      )}
    >
      <div className="flex h-full items-center justify-between gap-3 lg:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="메뉴 열기"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-navy-900"
        >
          <span className="flex flex-col gap-1.5" aria-hidden="true">
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wide text-orange-500">
            BT TOUR ERP
          </div>
          <div className="truncate text-sm font-bold text-navy-900">
            {workspaceName ?? title}
          </div>
        </div>

        {rightSlot && (
          <div className="flex shrink-0 items-center gap-2">{rightSlot}</div>
        )}
        {userInitial && (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-500 text-sm font-bold text-white">
            {userInitial}
          </div>
        )}
      </div>
      <div className="hidden h-full items-center justify-between gap-4 lg:flex">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-navy-900">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        {rightSlot && (
          <div className="flex items-center gap-3">{rightSlot}</div>
        )}
      </div>
    </header>
  );
}
