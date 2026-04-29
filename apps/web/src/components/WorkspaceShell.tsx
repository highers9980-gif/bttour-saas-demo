'use client';

import {
  BottomTabBar,
  Sidebar,
  TopHeader,
  type BottomTabItem,
  type SidebarGroup,
  type WorkspaceOption,
} from '@bttour/ui';
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppLink } from './AppLink';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMoreMenu } from './MobileMoreMenu';

export interface WorkspaceShellProps {
  workspaces: WorkspaceOption[];
  currentWorkspace: WorkspaceOption;
  groups: SidebarGroup[];
  user: { name: string; role: string; email: string };
  pageTitle: string;
  pageSubtitle?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}

/**
 * 워크스페이스 진입 후 모든 페이지가 사용하는 셸.
 * 도면 dashboard.html의 좌측 사이드바 + 상단 헤더 구조를 컴포넌트화.
 */
export function WorkspaceShell({
  currentWorkspace,
  groups,
  user,
  pageTitle,
  pageSubtitle,
  rightSlot,
  children,
}: WorkspaceShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const userInitial = user.name.slice(0, 1);
  const workspaceSlug = currentWorkspace.slug ?? currentWorkspace.id;
  const bottomTabs: BottomTabItem[] = [
    {
      key: 'dashboard',
      emoji: '📊',
      label: '대시보드',
      href: `/w/${workspaceSlug}/dashboard`,
      active: pathname === `/w/${workspaceSlug}/dashboard`,
    },
    {
      key: 'schedule',
      emoji: '📅',
      label: '일정',
      href: `/w/${workspaceSlug}/schedule`,
      active: pathname.startsWith(`/w/${workspaceSlug}/schedule`),
    },
    {
      key: 'settlement',
      emoji: '💰',
      label: '정산',
      href: `/w/${workspaceSlug}/guide-settlement`,
      active: pathname.startsWith(`/w/${workspaceSlug}/guide-settlement`),
    },
    {
      key: 'expense',
      emoji: '🧾',
      label: '비용',
      href: `/w/${workspaceSlug}/expense`,
      active: pathname.startsWith(`/w/${workspaceSlug}/expense`),
    },
    {
      key: 'more',
      emoji: '☰',
      label: '더보기',
      kind: 'more',
      active: moreOpen,
    },
  ];

  useEffect(() => {
    if (!sidebarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="메뉴 닫기"
          className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar
        LinkComponent={AppLink}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        brand={
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-lg">BT TOUR ERP</span>
          </div>
        }
        workspaceName={currentWorkspace.name}
        groups={groups}
        footer={
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-500 grid place-items-center font-bold text-white">
              {user.name.slice(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user.name}</div>
              <div className="text-xs text-slate-400">{user.role}</div>
            </div>
          </div>
        }
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader
          title={pageTitle}
          subtitle={pageSubtitle}
          workspaceName={currentWorkspace.name}
          userInitial={userInitial}
          onMenuClick={() => setSidebarOpen(true)}
          rightSlot={
            <>
              <LanguageSwitcher />
              {rightSlot}
            </>
          }
        />
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 pb-[88px] scroll-thin md:pb-8 md:p-8">{children}</div>
      </div>
      <BottomTabBar
        LinkComponent={AppLink}
        items={bottomTabs}
        onMoreClick={() => setMoreOpen(true)}
      />
      <MobileMoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} groups={groups} />
    </div>
  );
}
