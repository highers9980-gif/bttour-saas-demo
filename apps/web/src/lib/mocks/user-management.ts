import type { Role } from '@bttour/shared';

export type MemberStatus = 'ACTIVE' | 'PENDING' | 'SUSPICIOUS';

export interface MockMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
  lastLogin: string;
  status: MemberStatus;
  avatar: string;
  requestedRole?: Role;
  phone?: string;
  team?: string;
  intro?: string;
  suspiciousReasonKey?: string;
}

export const activeMembers: MockMember[] = [
  {
    id: 'u-owner',
    name: 'CEO',
    email: 'contact@bttour-erp.com',
    role: 'OWNER',
    joinedAt: '2026-01-15',
    lastLogin: '방금 전',
    status: 'ACTIVE',
    avatar: '박',
  },
  {
    id: 'u-admin',
    name: '관리자',
    email: 'admin@example.com',
    role: 'ADMIN',
    joinedAt: '2026-02-03',
    lastLogin: '5분 전',
    status: 'ACTIVE',
    avatar: '관',
  },
  {
    id: 'u-manager',
    name: '정산담당 John K.',
    email: 'manager@example.com',
    role: 'MANAGER',
    joinedAt: '2026-02-20',
    lastLogin: '2시간 전',
    status: 'ACTIVE',
    avatar: '정',
  },
  {
    id: 'u-ops',
    name: '운영팀 Steve L.',
    email: 'ops@example.com',
    role: 'MANAGER',
    joinedAt: '2026-03-10',
    lastLogin: '어제',
    status: 'ACTIVE',
    avatar: '운',
  },
  {
    id: 'u-cpa',
    name: 'External Accountant',
    email: 'cpa@example.com',
    role: 'VIEWER',
    joinedAt: '2026-04-01',
    lastLogin: '3일 전',
    status: 'ACTIVE',
    avatar: '회',
  },
];

export const pendingMembers: MockMember[] = [
  {
    id: 'p-new',
    name: 'New Member',
    email: 'newbie@example.com',
    role: 'VIEWER',
    requestedRole: 'MANAGER',
    joinedAt: '2시간 전 신청',
    lastLogin: '-',
    status: 'PENDING',
    avatar: '강',
    phone: '010-1234-5678',
    team: 'Settlement Team',
    intro: '4월부터 정산팀에 합류했습니다. 가이드 정산 업무 담당으로 가입 신청합니다.',
  },
  {
    id: 'p-guide',
    name: 'Part-time Guide',
    email: 'guide@example.com',
    role: 'VIEWER',
    requestedRole: 'VIEWER',
    joinedAt: '8시간 전 신청',
    lastLogin: '-',
    status: 'PENDING',
    avatar: '최',
    phone: '010-9999-1111',
    team: 'Part-time Guide',
    intro: '본인 정산 내역만 조회 가능하면 됩니다.',
  },
  {
    id: 'p-spam',
    name: '알 수 없음',
    email: 'spam@unknown.xyz',
    role: 'VIEWER',
    requestedRole: 'ADMIN',
    joinedAt: '12시간 전 신청',
    lastLogin: '-',
    status: 'SUSPICIOUS',
    avatar: '알',
    suspiciousReasonKey: 'admin.users.suspicious_reason_external_admin',
  },
];

export const sentInvitations = [
  {
    id: 'i-junior',
    destination: 'junior@example.com',
    role: 'MANAGER' as Role,
    meta: '발송 2일 전 · 만료 D-5',
  },
  {
    id: 'i-phone',
    destination: '010-5555-6666',
    role: 'VIEWER' as Role,
    meta: '발송 1시간 전 · 카카오톡 전송됨',
  },
] as const;
