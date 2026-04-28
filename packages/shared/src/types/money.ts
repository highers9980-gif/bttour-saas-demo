/**
 * 통화/금액 타입 — 회계 정확성을 위해 minor 단위(정수) 저장 + major 표시 변환.
 *
 * Codex docs/02-settlement-formula-spec.md §7 회계/원장 참고.
 * KRW: minor exponent 0 (정수 그대로)
 * USD/EUR/AUD/SGD: minor exponent 2 (센트)
 */

export type CurrencyCode = 'KRW' | 'USD' | 'EUR' | 'AUD' | 'SGD' | 'CNY' | 'VND';

export interface Money {
  /** minor 단위 정수 (KRW=원, USD=센트). 부호 있는 정수. */
  minor: number;
  currency: CurrencyCode;
}

export interface VatPolicy {
  /** 부가세 10%의 소수 처리. 정책 결정 필요 — docs/POLICY_DECISIONS.md 참고. */
  rounding: 'round' | 'trunc' | 'floor';
  rate: 0.1; // 한국 부가세 고정
}

/** 정책 디폴트. 변경 시 docs에 기록할 것. */
export const DEFAULT_VAT_POLICY: VatPolicy = {
  rounding: 'round',
  rate: 0.1,
};
