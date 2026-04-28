import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface MonthlyOpsPageShellProps {
  /** 페이지 상단 헤더 (OpsHeader 또는 자체 헤더) */
  header?: ReactNode;
  /** 필터 툴바 (FilterToolbar) */
  toolbar?: ReactNode;
  /** KPI 카드 그리드 (선택) */
  kpis?: ReactNode;
  /** 충돌·경고 배너 (선택) */
  banner?: ReactNode;
  /** 본문 — 표/간트/캘린더 */
  children: ReactNode;
  /** 페이지 하단 모달/팝오버 등 portals */
  portals?: ReactNode;
  className?: string;
}

/**
 * schedule / team-timeline / hotel-calendar / 정산 운영 페이지의 공통 레이아웃 셸.
 * 도면의 운영 페이지 8할이 같은 구조이므로 셸을 통일해 일관성 보장.
 */
export function MonthlyOpsPageShell({
  header,
  toolbar,
  kpis,
  banner,
  children,
  portals,
  className,
}: MonthlyOpsPageShellProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {header}
      {toolbar}
      {kpis}
      {banner}
      <div>{children}</div>
      {portals}
    </div>
  );
}
