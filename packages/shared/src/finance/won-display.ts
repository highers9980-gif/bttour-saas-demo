/**
 * 원화 표시/입력 헬퍼.
 * Codex 02-settlement-formula-spec §1 "금액 표시와 반올림" 반영.
 *
 * 정책 결정: 5,000원 반올림은 **표시 전용**. DB에는 원 단위 그대로 저장.
 * 입력 필드에서는 5,000원 반올림을 적용하지 않는다.
 */

export type MetricType =
  | 'AMOUNT_WON' // 일반 금액 (반올림 대상)
  | 'PAX' // 인원/명/pax
  | 'PER_PAX_MINUS_USD' // 인당 마이너스
  | 'EXCHANGE_RATE'
  | 'PERCENT'
  | 'NIGHTS' // 박/일수
  | 'SEQUENCE'; // 연도/월/행/번호

export interface FormatWonOptions {
  roundStep?: number; // 기본 5,000. 0이면 반올림 안 함.
  withSuffix?: boolean; // "원" 접미사
}

export function shouldRoundWonForMetric(metric: MetricType): boolean {
  return metric === 'AMOUNT_WON';
}

export function formatWonDisplay(
  amountWon: number,
  options: FormatWonOptions = {},
): string {
  const { roundStep = 5000, withSuffix = false } = options;
  const trimmed = Math.trunc(amountWon);
  const rounded =
    roundStep > 0 ? Math.round(trimmed / roundStep) * roundStep : trimmed;
  const formatted = new Intl.NumberFormat('ko-KR').format(rounded);
  return withSuffix ? `${formatted}원` : formatted;
}

/** 사용자 입력 정규화. 콤마/공백/원 접미사 제거 후 정수 반환. */
export function normalizeWonInput(input: string | number): number {
  if (typeof input === 'number') return Math.trunc(input);
  const cleaned = input
    .replace(/[원\s,]/g, '')
    .replace(/[^\-0-9.]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
