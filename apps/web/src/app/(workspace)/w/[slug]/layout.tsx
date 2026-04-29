import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@bttour/db';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { buildSidebarGroups } from '@/lib/nav';
import { getLocale, getTranslations } from 'next-intl/server';

/**
 * 워크스페이스 컨텍스트 게이트.
 * - 비로그인: /signin으로
 * - 슬러그가 사용자 멤버십에 없으면: /w 진입 페이지로
 * - 통과 시 사이드바/헤더가 적용된 셸 안에 자식 라우트 렌더.
 *
 * Phase 1 이후 RBAC 가드(role 검증)를 페이지별로 추가.
 */
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  const [locale, t] = await Promise.all([getLocale(), getTranslations()]);

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id, status: 'ACTIVE' },
    include: { workspace: true },
  });

  const current = memberships.find(
    (m: (typeof memberships)[number]) => m.workspace.slug === params.slug,
  );
  if (!current) redirect('/w');

  const groups = buildSidebarGroups(params.slug, {
    operations: t('nav.group_operations'),
    settlement: t('nav.group_settlement'),
    accounting: t('nav.group_accounting'),
    statisticsGroup: t('nav.group_statistics'),
    admin: t('nav.group_admin'),
    dashboard: t('nav.dashboard'),
    schedule: t('nav.schedule'),
    teamTimeline: t('nav.team_timeline'),
    hotelCalendar: t('nav.hotel_calendar'),
    guideSettlement: t('nav.guide_settlement'),
    vehicle: t('nav.vehicle'),
    shoppingFee: t('nav.shopping_fee'),
    receivables: t('nav.receivables'),
    finance: t('nav.finance'),
    expense: t('nav.expense'),
    revenue: t('nav.revenue'),
    statistics: t('nav.statistics'),
    monthlyInsight: t('nav.monthly_insight'),
    hermesSupervisor: t('nav.hermes_supervisor'),
    guideRecommend: t('nav.guide_recommend'),
    userManagement: t('nav.user_management'),
    settings: t('nav.settings'),
    billing: t('nav.billing'),
  });

  return (
    <WorkspaceShell
      workspaces={memberships.map((m: (typeof memberships)[number]) => ({
        id: m.workspace.id,
        slug: m.workspace.slug,
        name: m.workspace.name,
        role: m.role,
      }))}
      currentWorkspace={{
        id: current.workspace.id,
        slug: current.workspace.slug,
        name: current.workspace.name,
        role: current.role,
      }}
      groups={groups}
      user={{
        name: session.user.name ?? session.user.email ?? '사용자',
        email: session.user.email ?? '',
        role: current.role,
      }}
      pageTitle={t('nav.dashboard')}
      pageSubtitle={new Date().toLocaleDateString(
        locale === 'zh' ? 'zh-CN' : locale === 'en' ? 'en-US' : 'ko-KR',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        },
      )}
    >
      {children}
    </WorkspaceShell>
  );
}
