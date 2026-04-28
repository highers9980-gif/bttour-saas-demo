/**
 * 미수금 잔액. Codex 02-settlement-formula-spec §6 반영.
 *
 * 정책 결정: 메모 문자열에서 수금액을 파싱하던 레거시 방식은 폐기.
 * 모든 수금은 ReceivablePayment 테이블 라인으로 분리 기록. minor 단위 사용.
 */

export interface ReceivablePaymentMinor {
  amountMinor: number;
}

export function computeReceivableBalance(input: {
  amountMinor: number;
  payments: ReceivablePaymentMinor[];
}): number {
  const received = input.payments.reduce((s, p) => s + p.amountMinor, 0);
  return input.amountMinor - received;
}
