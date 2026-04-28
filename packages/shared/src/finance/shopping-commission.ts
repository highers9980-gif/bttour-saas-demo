/**
 * 쇼핑 수수료 집계.
 * Codex 02-settlement-formula-spec §5 반영.
 */

export interface ShoppingCommissionLine {
  centerId: string;
  commissionWon: number;
}

export interface ShoppingCommissionTotals {
  totalByCenter: Map<string, number>;
  grandTotalWon: number;
}

export function computeShoppingCommissionTotals(
  lines: ShoppingCommissionLine[],
): ShoppingCommissionTotals {
  const totalByCenter = new Map<string, number>();
  let grandTotalWon = 0;

  for (const line of lines) {
    const prev = totalByCenter.get(line.centerId) ?? 0;
    totalByCenter.set(line.centerId, prev + line.commissionWon);
    grandTotalWon += line.commissionWon;
  }

  return { totalByCenter, grandTotalWon };
}
