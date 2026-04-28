import {
  Sidebar,
  TopHeader,
  type SidebarGroup,
  type WorkspaceOption,
} from '@bttour/ui';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { AppLink } from './AppLink';

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
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        LinkComponent={AppLink}
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
          rightSlot={rightSlot}
        />
        <div className="flex-1 overflow-y-auto p-8 scroll-thin bg-slate-100">
          {children}
        </div>
      </div>
    </div>
  );
}
