import { cn } from '../lib/cn';

export interface MonthNavigatorProps {
  year: number;
  month: number; // 1~12
  onChange: (next: { year: number; month: number }) => void;
  className?: string;
}

/**
 * 일정현황(ScheduleView) 기준 인라인 월 네비게이터 스타일.
 * 다른 운영 뷰의 상단 헤더에서 일관되게 재사용한다.
 */
export function MonthNavigator({
  year,
  month,
  onChange,
  className,
}: MonthNavigatorProps) {
  const prev = () => {
    const m = month - 1;
    onChange(m < 1 ? { year: year - 1, month: 12 } : { year, month: m });
  };
  const next = () => {
    const m = month + 1;
    onChange(m > 12 ? { year: year + 1, month: 1 } : { year, month: m });
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 border border-slate-200 rounded-md p-0.5',
        className,
      )}
    >
      <button
        type="button"
        onClick={prev}
        aria-label="이전 달"
        className="w-7 h-7 grid place-items-center rounded hover:bg-slate-100 text-slate-600"
      >
        ‹
      </button>
      <span className="text-sm font-semibold text-navy-900 num-tabular px-2">
        {year}년 {month}월
      </span>
      <button
        type="button"
        onClick={next}
        aria-label="다음 달"
        className="w-7 h-7 grid place-items-center rounded hover:bg-slate-100 text-slate-600"
      >
        ›
      </button>
    </div>
  );
}
