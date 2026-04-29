import type { SidebarGroup } from '@bttour/ui';

/**
 * 도면(BTTOUR_SAAS/dashboard.html)의 사이드바 메뉴 5그룹 13항목을
 * SaaS 라우트 구조에 맞춰 정리한 단일 진실 소스.
 *
 * 워크스페이스 라우트는 /w/[slug]/... 형태.
 * - settings, billing은 도면에서 alert만 띄우는 placeholder였으나 신규는 실제 라우트로.
 */
interface SidebarLabels {
  operations: string;
  settlement: string;
  accounting: string;
  statisticsGroup: string;
  admin: string;
  dashboard: string;
  schedule: string;
  teamTimeline: string;
  hotelCalendar: string;
  guideSettlement: string;
  vehicle: string;
  shoppingFee: string;
  receivables: string;
  finance: string;
  expense: string;
  revenue: string;
  statistics: string;
  monthlyInsight: string;
  hermesSupervisor: string;
  guideRecommend: string;
  userManagement: string;
  settings: string;
  billing: string;
}

const defaultLabels: SidebarLabels = {
  operations: '운영',
  settlement: '정산',
  accounting: '회계',
  statisticsGroup: '통계',
  admin: '관리자',
  dashboard: '대시보드',
  schedule: '일정현황',
  teamTimeline: '팀 타임라인',
  hotelCalendar: '호텔 캘린더',
  guideSettlement: '가이드 정산',
  vehicle: '차량비',
  shoppingFee: '쇼핑 수수료',
  receivables: '미수금',
  finance: '은행·카드',
  expense: '비용 처리',
  revenue: '매출 대시보드',
  statistics: '통합 통계',
  monthlyInsight: '월말 인사이트',
  hermesSupervisor: 'Hermes Supervisor',
  guideRecommend: '가이드 추천',
  userManagement: '사용자 관리',
  settings: '워크스페이스 설정',
  billing: '결제·플랜',
};

export function buildSidebarGroups(
  workspaceSlug: string,
  labels: SidebarLabels = defaultLabels,
): SidebarGroup[] {
  const w = `/w/${workspaceSlug}`;
  return [
    {
      key: 'operations',
      label: labels.operations,
      items: [
        { key: 'dashboard', label: labels.dashboard, emoji: '📊', href: `${w}/dashboard` },
        { key: 'schedule', label: labels.schedule, emoji: '📅', href: `${w}/schedule` },
        {
          key: 'team-timeline',
          label: labels.teamTimeline,
          emoji: '👥',
          href: `${w}/team-timeline`,
        },
        {
          key: 'hotel-calendar',
          label: labels.hotelCalendar,
          emoji: '🏨',
          href: `${w}/hotel-calendar`,
        },
      ],
    },
    {
      key: 'settlement',
      label: labels.settlement,
      items: [
        {
          key: 'guide-settlement',
          label: labels.guideSettlement,
          emoji: '💰',
          href: `${w}/guide-settlement`,
        },
        { key: 'vehicle', label: labels.vehicle, emoji: '🚗', href: `${w}/vehicle` },
        { key: 'shopping-fee', label: labels.shoppingFee, emoji: '🛒', href: `${w}/shopping-fee` },
        { key: 'receivables', label: labels.receivables, emoji: '💳', href: `${w}/receivables` },
      ],
    },
    {
      key: 'accounting',
      label: labels.accounting,
      items: [
        { key: 'finance', label: labels.finance, emoji: '🏦', href: `${w}/finance` },
        { key: 'expense', label: labels.expense, emoji: '🧾', href: `${w}/expense` },
      ],
    },
    {
      key: 'statistics',
      label: labels.statisticsGroup,
      items: [
        { key: 'revenue', label: labels.revenue, emoji: '📈', href: `${w}/revenue` },
        { key: 'statistics', label: labels.statistics, emoji: '📊', href: `${w}/statistics` },
        { key: 'insights', label: labels.monthlyInsight, emoji: '✨', href: `${w}/insights` },
        { key: 'automation', label: labels.hermesSupervisor, emoji: '🤖', href: `${w}/automation` },
        {
          key: 'guide-recommend',
          label: labels.guideRecommend,
          emoji: '🎯',
          href: `${w}/guide-recommend`,
        },
      ],
    },
    {
      key: 'admin',
      label: labels.admin,
      items: [
        {
          key: 'user-management',
          label: labels.userManagement,
          emoji: '👤',
          href: `${w}/user-management`,
        },
        {
          key: 'workspace-settings',
          label: labels.settings,
          emoji: '⚙️',
          href: `${w}/settings`,
        },
        { key: 'billing', label: labels.billing, emoji: '💎', href: `${w}/billing` },
      ],
    },
  ];
}
