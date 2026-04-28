import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface SidebarItem {
  key: string;
  label: string;
  emoji?: string;
  href: string;
  active?: boolean;
}

export interface SidebarGroup {
  key: string;
  label: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  brand?: ReactNode;
  workspaceLabel?: string;
  workspaceName?: string;
  groups: SidebarGroup[];
  footer?: ReactNode;
  className?: string;
  /** 라우팅 라이브러리 차이를 흡수하기 위한 Link 슬롯. 미지정 시 기본 a 태그 사용. */
  LinkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    children: ReactNode;
  }>;
}

/**
 * 도면(dashboard.html)의 좌측 네비. navy-900 배경, orange-500 active.
 * Next.js 라우팅에 묶이지 않도록 LinkComponent를 주입받는다.
 */
export function Sidebar({
  brand,
  workspaceLabel = '워크스페이스',
  workspaceName,
  groups,
  footer,
  className,
  LinkComponent,
}: SidebarProps) {
  const Link =
    LinkComponent ??
    (({ href, className: c, children }) => (
      <a href={href} className={c}>
        {children}
      </a>
    ));

  return (
    <aside
      className={cn(
        'w-64 bg-navy-900 text-white flex flex-col h-screen sticky top-0',
        className,
      )}
    >
      <div className="px-5 py-5 border-b border-white/10">
        {brand}
        {workspaceName && (
          <div className="mt-3 px-2 py-1.5 bg-white/5 rounded-md text-xs flex items-center justify-between">
            <span className="text-slate-300">{workspaceLabel}</span>
            <span className="font-semibold">{workspaceName}</span>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-3 scroll-thin">
        {groups.map((group) => (
          <div key={group.key}>
            <div className="px-3 py-2 mt-1 text-xs font-semibold text-slate-400 tracking-wider">
              {group.label}
            </div>
            {group.items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-sm transition',
                  item.active
                    ? 'bg-orange-500 text-white font-semibold'
                    : 'text-slate-300 hover:bg-white/5',
                )}
              >
                {item.emoji && <span>{item.emoji}</span>}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>
      {footer && (
        <div className="border-t border-white/10 p-3">{footer}</div>
      )}
    </aside>
  );
}
