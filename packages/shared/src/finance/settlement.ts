/**
 * 가이드/차량 정산 잔액 계산.
 * Codex 02-settlement-formula-spec §3, §4 반영.
 *
 * 정책 결정: 과지급(잔액 < 0) 금지 — 새 정산 추가 시 누적 지급액이 totalWon을 넘으면 거부.
 * (마이너스 잔액 허용 정책으로 바꾸려면 docs/POLICY_DECISIONS.md 갱신 후 변경.)
 */

export interface SettlementPayment {
  amountWon: number;
}

export interface SettlementBalance {
  paidTotalWon: number;
  balanceWon: number;
}

export function computeSettlementBalance(
  totalWon: number,
  payments: SettlementPayment[],
): SettlementBalance {
  const paidTotalWon = payments.reduce((sum, p) => sum + p.amountWon, 0);
  return {
    paidTotalWon,
    balanceWon: totalWon - paidTotalWon,
  };
}

export class OverpaymentError extends Error {
  constructor(
    public readonly totalWon: number,
    public readonly paidSoFarWon: number,
    public readonly nextPaymentWon: number,
  ) {
    super(
      `과지급 금지: total=${totalWon}, paid=${paidSoFarWon}, next=${nextPaymentWon}`,
    );
    this.name = 'OverpaymentError';
  }
}

export function validateSettlementPayment(input: {
  totalWon: number;
  paidSoFarWon: number;
  nextPaymentWon: number;
}): void {
  if (input.nextPaymentWon <= 0) {
    throw new Error(
      `정산 지급액은 0보다 커야 합니다: ${input.nextPaymentWon}`,
    );
  }
  if (input.paidSoFarWon + input.nextPaymentWon > input.totalWon) {
    throw new OverpaymentError(
      input.totalWon,
      input.paidSoFarWon,
      input.nextPaymentWon,
    );
  }
}
