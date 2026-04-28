export const ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

/** 역할 우선순위 (큰 값이 더 높은 권한). */
export const ROLE_RANK: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  MANAGER: 2,
  VIEWER: 1,
};

export function hasAtLeast(actual: Role, required: Role): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

// ─────────────────────────────────────────────────────────────────────────
// 정책 함수 — docs/POLICY_DECISIONS.md §10 결정 반영
// "DB 권한 매트릭스 없음, 인-코드 정책 함수만"
// 도면 user-management.html의 권한 매트릭스 표는 이 함수들의 결과를 렌더해서 만든다.
// ─────────────────────────────────────────────────────────────────────────

/**
 * actor가 target의 역할을 newRole로 변경할 수 있는가.
 *
 * 규칙:
 * - OWNER는 모든 변경 가능 (단 자기 자신을 OWNER가 아닌 역할로 강등할 때 별도 확인)
 * - ADMIN은 MANAGER/VIEWER 사이에서만 변경 가능. ADMIN/OWNER는 못 만짐
 * - MANAGER/VIEWER는 권한 변경 불가
 * - 자기 자신의 역할은 강등만 가능 (승격 불가)
 */
export function canChangeRole(args: {
  actor: Role;
  actorIsSelf: boolean;
  targetCurrent: Role;
  targetNewRole: Role;
}): boolean {
  const { actor, actorIsSelf, targetCurrent, targetNewRole } = args;

  if (actorIsSelf) {
    // 자기 자신: 강등(현재보다 낮거나 같음)만 허용
    return ROLE_RANK[targetNewRole] <= ROLE_RANK[targetCurrent];
  }

  if (actor === 'OWNER') return true;

  if (actor === 'ADMIN') {
    // ADMIN은 MANAGER/VIEWER만 관리. ADMIN/OWNER 대상 변경 불가
    const canTouchTarget =
      targetCurrent === 'MANAGER' || targetCurrent === 'VIEWER';
    const canAssignRole =
      targetNewRole === 'MANAGER' || targetNewRole === 'VIEWER';
    return canTouchTarget && canAssignRole;
  }

  return false;
}

/** 결제·구독·해지 권한. OWNER 전용. */
export function canManageBilling(role: Role): boolean {
  return role === 'OWNER';
}

/** 멤버십 가입 신청 승인/거부. ADMIN 이상. */
export function canApproveMembership(role: Role): boolean {
  return hasAtLeast(role, 'ADMIN');
}

/** 다른 사용자 초대 발송. ADMIN 이상. */
export function canInviteMember(role: Role): boolean {
  return hasAtLeast(role, 'ADMIN');
}

/** 정산 입력/수정/삭제(가이드/차량/쇼핑/미수금). MANAGER 이상. */
export function canMutateSettlement(role: Role): boolean {
  return hasAtLeast(role, 'MANAGER');
}

/** 마스터(가이드/호텔/차량/거래처) 등록·수정. MANAGER 이상. */
export function canMutateMaster(role: Role): boolean {
  return hasAtLeast(role, 'MANAGER');
}

/** 데이터 export(엑셀/PDF). VIEWER 이상 (즉 모든 멤버). */
export function canExportData(role: Role): boolean {
  return hasAtLeast(role, 'VIEWER');
}

/** 워크스페이스 설정 변경 (이름/로고/사업자정보 등). ADMIN 이상. */
export function canMutateWorkspaceSettings(role: Role): boolean {
  return hasAtLeast(role, 'ADMIN');
}

/** AI 크레딧 충전. OWNER 전용 (결제 책임자). */
export function canRechargeAiCredit(role: Role): boolean {
  return role === 'OWNER';
}

/**
 * 정산 확정 (DRAFT → CONFIRMED). ADMIN 이상.
 * 단순 입력은 MANAGER가, 확정 책임은 ADMIN이 지는 분리.
 */
export function canConfirmSettlement(role: Role): boolean {
  return hasAtLeast(role, 'ADMIN');
}

/** 정산 취소 (CANCELLED 상태로 변경). ADMIN 이상. */
export function canCancelSettlement(role: Role): boolean {
  return hasAtLeast(role, 'ADMIN');
}

/** 비용 승인 (Expense PENDING_APPROVAL → APPROVED/REJECTED). ADMIN 이상. */
export function canApproveExpense(role: Role): boolean {
  return hasAtLeast(role, 'ADMIN');
}

/** FinanceWallet/Card 생성·수정. ADMIN 이상 (회계 마스터 책임자). */
export function canMutateFinanceWallet(role: Role): boolean {
  return hasAtLeast(role, 'ADMIN');
}

/**
 * 권한 매트릭스 한 행 — 도면의 "권한 매트릭스" 표를 렌더할 때 사용.
 * matrix를 코드 함수로 한 번에 생성해서 UI에서 표 형태로 보여준다.
 */
export interface PermissionMatrixRow {
  key: string;
  label: string;
  roles: Record<Role, boolean>;
}

export function buildPermissionMatrix(): PermissionMatrixRow[] {
  const rolesOf = (
    fn: (role: Role) => boolean,
  ): Record<Role, boolean> => ({
    OWNER: fn('OWNER'),
    ADMIN: fn('ADMIN'),
    MANAGER: fn('MANAGER'),
    VIEWER: fn('VIEWER'),
  });

  return [
    {
      key: 'billing',
      label: 'admin.users.billing_permission',
      roles: rolesOf(canManageBilling),
    },
    {
      key: 'member',
      label: 'admin.users.member_permission',
      roles: rolesOf(canApproveMembership),
    },
    {
      key: 'settlement',
      label: 'admin.users.settlement_permission',
      roles: rolesOf(canMutateSettlement),
    },
    {
      key: 'master',
      label: 'admin.users.master_permission',
      roles: rolesOf(canMutateMaster),
    },
    {
      key: 'export',
      label: 'admin.users.export_permission',
      roles: rolesOf(canExportData),
    },
  ];
}
