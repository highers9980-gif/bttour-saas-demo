import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@bttour/db';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { buildSidebarGroups } from '@/lib/nav';

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

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id, status: 'ACTIVE' },
    include: { workspace: true },
  });

  const current = memberships.find(
    (m: (typeof memberships)[number]) => m.workspace.slug === params.slug,
  );
  if (!current) redirect('/w');

  const groups = buildSidebarGroups(params.slug);

  return (
    <WorkspaceShell
      workspaces={memberships.map((m: (typeof memberships)[number]) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        role: m.role,
      }))}
      currentWorkspace={{
        id: current.workspace.id,
        name: current.workspace.name,
        role: current.role,
      }}
      groups={groups}
      user={{
        name: session.user.name ?? session.user.email ?? '사용자',
        email: session.user.email ?? '',
        role: current.role,
      }}
      pageTitle="대시보드"
      pageSubtitle={new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      })}
    >
      {children}
    </WorkspaceShell>
  );
}
