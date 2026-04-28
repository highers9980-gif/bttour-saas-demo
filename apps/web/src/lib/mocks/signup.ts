export const signupPlanOptions = [
  { value: 'trial', label: '14일 무료 체험 (Pro AI)' },
  { value: 'starter', label: 'Starter - 월 199,000원' },
  { value: 'pro', label: 'Pro - 월 249,000원' },
  { value: 'pro_ai', label: 'Pro AI - 월 449,000원' },
  { value: 'business', label: 'Business AI - 월 799,000원' },
] as const;

export const requestedRoleOptions = [
  { value: 'MANAGER', label: 'MANAGER' },
  { value: 'VIEWER', label: 'VIEWER' },
  { value: 'ADMIN', label: 'ADMIN' },
] as const;

export const signupStepper = [
  { step: 1, key: 'auth.signup.step_company' },
  { step: 2, key: 'auth.signup.step_account' },
  { step: 3, key: 'auth.signup.step_done' },
] as const;
