'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface BottomTabLinkItem {
  key: string;
  emoji: string;
  label: string;
  href: string;
  active?: boolean;
  kind?: 'link';
}

export interface BottomTabMoreItem {
  key: string;
  emoji: string;
  label: string;
  active?: boolean;
  kind: 'more';
}

export type BottomTabItem = BottomTabLinkItem | BottomTabMoreItem;

export interface BottomTabBarProps {
  items: BottomTabItem[];
  onMoreClick?: () => void;
  className?: string;
  LinkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    'aria-current'?: 'page';
    children: ReactNode;
  }>;
}

export function BottomTabBar({
  items,
  onMoreClick,
  className,
  LinkComponent,
}: BottomTabBarProps) {
  const Link =
    LinkComponent ??
    (({ href, className: linkClassName, children, 'aria-current': ariaCurrent }) => (
      <a href={href} className={linkClassName} aria-current={ariaCurrent}>
        {children}
      </a>
    ));

  const visibleItems = items.slice(0, 5);

  return (
    <nav
      aria-label="모바일 주요 메뉴"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30 h-16 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-soft md:hidden',
        className,
      )}
    >
      <div className="flex h-full items-stretch">
        {visibleItems.map((item) => {
          const itemClassName = cn(
            'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-center transition',
            item.active ? 'text-orange-500' : 'text-slate-500',
          );
          const content = (
            <>
              <span className="text-xl leading-none" aria-hidden="true">
                {item.emoji}
              </span>
              <span className="max-w-full truncate text-[11px] font-semibold leading-tight">
                {item.label}
              </span>
            </>
          );

          if (item.kind === 'more') {
            return (
              <button
                key={item.key}
                type="button"
                onClick={onMoreClick}
                className={itemClassName}
                aria-current={item.active ? 'page' : undefined}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              className={itemClassName}
              aria-current={item.active ? 'page' : undefined}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
