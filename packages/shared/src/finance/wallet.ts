/**
 * 지갑/카드 잔액 계산. Codex 02-settlement-formula-spec §7 반영.
 */

export interface LedgerLineMinor {
  amountMinor: number; // 입금 양수, 출금 음수
}

export function computeWalletBalance(input: {
  openingBalanceMinor: number;
  ledgerLines: LedgerLineMinor[];
  /** 외부 동기화/수동 보정 잔액. 있으면 우선. (현 SaaS는 외부 sync 미사용 — 보통 null) */
  currentBalanceMinor?: number | null;
}): number {
  if (input.currentBalanceMinor != null) return input.currentBalanceMinor;
  return (
    input.openingBalanceMinor +
    input.ledgerLines.reduce((s, l) => s + l.amountMinor, 0)
  );
}

export function computeCardRemainingLimit(input: {
  creditLimitWon: number;
  usedWon: number;
  scheduledWon: number;
}): number {
  return Math.max(
    0,
    input.creditLimitWon - input.usedWon - input.scheduledWon,
  );
}
