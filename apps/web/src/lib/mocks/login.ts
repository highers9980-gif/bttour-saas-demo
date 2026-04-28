export const loginSeedAccounts = [
  {
    id: 'admin',
    email: 'admin@example.com',
    passwordHint: 'password1234',
    label: 'ADMIN',
  },
  {
    id: 'owner',
    email: 'owner@example.com',
    passwordHint: 'password1234',
    label: 'OWNER',
  },
  {
    id: 'manager',
    email: 'manager@example.com',
    passwordHint: 'password1234',
    label: 'MANAGER',
  },
  {
    id: 'viewer',
    email: 'viewer@example.com',
    passwordHint: 'password1234',
    label: 'VIEWER',
  },
] as const;

export const authBrandKpis = [
  { value: '11%', label: '정산담당자 인건비 대비' },
  { value: '93%', label: '반복 업무 자동화', tone: 'orange' as const },
  { value: '24/7', label: '실시간 모니터링' },
] as const;
