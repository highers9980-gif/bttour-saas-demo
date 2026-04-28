import { DEFAULT_VAT_POLICY, type VatPolicy } from '../types/money';

/**
 * 부가세 10% 계산. 한국 SaaS 회계 정책 통일을 위한 단일 진입점.
 *
 * Codex 02-settlement-formula-spec §4 차량비, §5 쇼핑수수료에서 지적한
 * `round` vs `trunc` 불일치를 정책 객체로 통일.
 */
export function computeVat10(
  amountWon: number,
  policy: VatPolicy = DEFAULT_VAT_POLICY,
): number {
  const raw = amountWon * policy.rate;
  switch (policy.rounding) {
    case 'round':
      return Math.round(raw);
    case 'trunc':
      return Math.trunc(raw);
    case 'floor':
      return Math.floor(raw);
  }
}

export function computeVatIncluded(
  amountWon: number,
  policy: VatPolicy = DEFAULT_VAT_POLICY,
): number {
  return amountWon + computeVat10(amountWon, policy);
}
