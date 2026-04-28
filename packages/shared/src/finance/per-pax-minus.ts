/**
 * 인당 마이너스 USD 계산.
 * Codex 02-settlement-formula-spec §2 그대로 옮김.
 *
 * 식:
 *   인당마이너스 USD =
 *     round( trunc((지출합계 - 가이드인센티브 - 투어피원화) / 인원) / 환율(KRW per USD) )
 */

export interface PerPaxMinusInput {
  expenseTotalWon: number;
  guideIncentiveWon: number;
  tourFeeWon: number;
  pax: number;
  /** 1 USD당 KRW. 0.0007처럼 역수로 들어오면 호출 전에 1/rate 보정. */
  exchangeRateKrwPerUsd: number;
}

export function computePerPaxMinusUsd(input: PerPaxMinusInput): number | null {
  if (input.pax <= 0) return null;
  if (input.exchangeRateKrwPerUsd <= 0) return null;

  const lossWonPerPax = Math.trunc(
    (input.expenseTotalWon - input.guideIncentiveWon - input.tourFeeWon) /
      input.pax,
  );
  return Math.round(lossWonPerPax / input.exchangeRateKrwPerUsd);
}
