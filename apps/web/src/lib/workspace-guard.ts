import { redirect } from 'next/navigation';
import { auth } from './auth';
import { prisma } from '@bttour/db';
import { hasAtLeast, type Role } from '@bttour/shared';

/**
 * 워크스페이스 접근 가드.
 *
 * 사용 패턴(서버 컴포넌트 / Server Action 모두 호환):
 * ```ts
 * const { workspace, membership, user } = await requireWorkspace(slug, 'MANAGER');
 * ```
 *
 * 통과 못 하면 적절한 라우트로 redirect 한다.
 * - 비로그인 → /signin
 * - 멤버십 없음 → /w (워크스페이스 선택)
 * - 권한 부족 → /w/[slug]/dashboard (또는 추후 권한없음 페이지)
 */
export async function requireWorkspace(slug: string, minRole: Role = 'VIEWER') {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/w/${slug}`)}`);
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      status: 'ACTIVE',
      workspace: { slug },
    },
    include: { workspace: true, user: true },
  });

  if (!membership) {
    redirect('/w');
  }

  if (!hasAtLeast(membership.role as Role, minRole)) {
    redirect(`/w/${slug}/dashboard?error=permission_denied`);
  }

  return {
    workspace: membership.workspace,
    membership,
    user: membership.user,
    role: membership.role as Role,
    userId: session.user.id,
  };
}

/**
 * RBAC 검증 실패 시 throw하는 변형 — Server Action 안에서 사용.
 * (redirect는 Server Action 안에서 throw처럼 동작하지만, 명시적 throw가 더 의도가 분명함)
 */
export class WorkspaceGuardError extends Error {
  constructor(
    public readonly code:
      | 'UNAUTHENTICATED'
      | 'WORKSPACE_NOT_FOUND'
      | 'PERMISSION_DENIED',
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'WorkspaceGuardError';
  }
}

export async function assertWorkspace(slug: string, minRole: Role = 'VIEWER') {
  const session = await auth();
  if (!session?.user?.id) {
    throw new WorkspaceGuardError('UNAUTHENTICATED');
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      status: 'ACTIVE',
      workspace: { slug },
    },
    include: { workspace: true, user: true },
  });

  if (!membership) {
    throw new WorkspaceGuardError('WORKSPACE_NOT_FOUND');
  }

  if (!hasAtLeast(membership.role as Role, minRole)) {
    throw new WorkspaceGuardError('PERMISSION_DENIED');
  }

  return {
    workspace: membership.workspace,
    membership,
    user: membership.user,
    role: membership.role as Role,
    userId: session.user.id,
  };
}

/**
 * 모든 워크스페이스 멤버십을 가져온다 — `/w` 워크스페이스 선택 페이지용.
 */
export async function getMyWorkspaces() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.membership.findMany({
    where: { userId: session.user.id, status: 'ACTIVE' },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });
}
