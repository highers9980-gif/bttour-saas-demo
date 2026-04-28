import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  /** 셀 렌더 함수. 기본은 row[key as keyof T] */
  cell?: (row: T, index: number) => ReactNode;
  /** 우측 정렬 (금액·숫자 컬럼에 권장) */
  align?: 'left' | 'right' | 'center';
  /** 모바일에서 숨길 컬럼 */
  hideOnMobile?: boolean;
  /** 폭 (Tailwind 클래스 또는 css width) */
  className?: string;
  /** 숫자 표 정렬 */
  numeric?: boolean;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T, index: number) => string;
  /** 행 클릭 시 콜백 (선택) */
  onRowClick?: (row: T, index: number) => void;
  /** 헤더 sticky 여부 */
  stickyHeader?: boolean;
  /** 빈 상태 노드 — 0건일 때 표 대신 표시 */
  empty?: ReactNode;
  /** 추가 클래스 */
  className?: string;
}

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

/**
 * 운영 뷰 표형(table) 베이스. 정산/미수금/사용자 관리 등에서 재사용.
 * 모바일에서는 호출 측에서 MobileCardList로 교체하는 게 권장 동선.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  stickyHeader = false,
  empty,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead
          className={cn(
            'bg-slate-50',
            stickyHeader && 'sticky top-0 z-10',
          )}
        >
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-2.5 text-xs font-semibold text-slate-600 border-b border-slate-200',
                  alignClass[col.align ?? 'left'],
                  col.numeric && 'num-tabular',
                  col.hideOnMobile && 'hidden md:table-cell',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={rowKey(row, idx)}
              onClick={onRowClick ? () => onRowClick(row, idx) : undefined}
              className={cn(
                'hover:bg-slate-50 transition',
                onRowClick && 'cursor-pointer',
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-4 py-3 border-b border-slate-100 text-slate-700',
                    alignClass[col.align ?? 'left'],
                    col.numeric && 'num-tabular',
                    col.hideOnMobile && 'hidden md:table-cell',
                  )}
                >
                  {col.cell
                    ? col.cell(row, idx)
                    : (row[col.key as keyof T] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
