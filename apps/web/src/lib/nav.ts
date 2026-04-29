import type { SidebarGroup } from '@bttour/ui';

/**
 * 도면(BTTOUR_SAAS/dashboard.html)의 사이드바 메뉴 5그룹 13항목을
 * SaaS 라우트 구조에 맞춰 정리한 단일 진실 소스.
 *
 * 워크스페이스 라우트는 /w/[slug]/... 형태.
 * - settings, billing은 도면에서 alert만 띄우는 placeholder였으나 신규는 실제 라우트로.
 */
export function buildSidebarGroups(workspaceSlug: string): SidebarGroup[] {
  const w = `/w/${workspaceSlug}`;
  return [
    {
      key: 'operations',
      label: '운영',
      items: [
        { key: 'dashboard', label: '대시보드', emoji: '📊', href: `${w}/dashboard` },
        { key: 'schedule', label: '일정현황', emoji: '📅', href: `${w}/schedule` },
        { key: 'team-timeline', label: '팀 타임라인', emoji: '👥', href: `${w}/team-timeline` },
        { key: 'hotel-calendar', label: '호텔 캘린더', emoji: '🏨', href: `${w}/hotel-calendar` },
      ],
    },
    {
      key: 'settlement',
      label: '정산',
      items: [
        {
          key: 'guide-settlement',
          label: '가이드 정산',
          emoji: '💰',
          href: `${w}/guide-settlement`,
        },
        { key: 'vehicle', label: '차량비', emoji: '🚗', href: `${w}/vehicle` },
        { key: 'shopping-fee', label: '쇼핑 수수료', emoji: '🛒', href: `${w}/shopping-fee` },
        { key: 'receivables', label: '미수금', emoji: '💳', href: `${w}/receivables` },
      ],
    },
    {
      key: 'accounting',
      label: '회계',
      items: [
        { key: 'finance', label: '은행·카드', emoji: '🏦', href: `${w}/finance` },
        { key: 'expense', label: '비용 처리', emoji: '🧾', href: `${w}/expense` },
      ],
    },
    {
      key: 'statistics',
      label: '통계',
      items: [
        { key: 'revenue', label: '매출 대시보드', emoji: '📈', href: `${w}/revenue` },
        { key: 'statistics', label: '통합 통계', emoji: '📊', href: `${w}/statistics` },
        { key: 'insights', label: '월말 인사이트', emoji: '✨', href: `${w}/insights` },
        { key: 'automation', label: 'Hermes Supervisor', emoji: '🤖', href: `${w}/automation` },
        { key: 'guide-recommend', label: '가이드 추천', emoji: '🎯', href: `${w}/guide-recommend` },
      ],
    },
    {
      key: 'admin',
      label: '관리자',
      items: [
        { key: 'user-management', label: '사용자 관리', emoji: '👤', href: `${w}/user-management` },
        {
          key: 'workspace-settings',
          label: '워크스페이스 설정',
          emoji: '⚙️',
          href: `${w}/settings`,
        },
        { key: 'billing', label: '결제·플랜', emoji: '💎', href: `${w}/billing` },
      ],
    },
  ];
}
