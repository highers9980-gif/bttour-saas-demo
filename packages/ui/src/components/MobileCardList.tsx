import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface MobileCardListProps<T> {
  rows: T[];
  /** 카드 한 장 렌더 함수 */
  renderCard: (row: T, index: number) => ReactNode;
  rowKey: (row: T, index: number) => string;
  empty?: ReactNode;
  className?: string;
}

/**
 * 도면이 데스크톱 위주라 모바일 조회 뷰는 별도 설계 필요.
 * 운영 뷰에서 표형(DataTable) 대신 모바일에서 카드형으로 폴백할 때 사용.
 *
 * 핸드오프 문서의 "모바일은 조회용" 정책을 반영.
 */
export function MobileCardList<T>({
  rows,
  renderCard,
  rowKey,
  empty,
  className,
}: MobileCardListProps<T>) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {rows.map((row, idx) => (
        <div
          key={rowKey(row, idx)}
          className="bg-white border border-slate-100 rounded-xl p-3 shadow-soft"
        >
          {renderCard(row, idx)}
        </div>
      ))}
    </div>
  );
}
