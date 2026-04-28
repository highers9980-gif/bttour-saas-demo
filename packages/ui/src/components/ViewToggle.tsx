import { cn } from '../lib/cn';

export interface ViewToggleOption<T extends string> {
  value: T;
  label: string;
  emoji?: string;
}

export interface ViewToggleProps<T extends string> {
  options: ViewToggleOption<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * 도면의 카드형/표형, 목록/캘린더/간트 같은 뷰 모드 토글.
 * 일정현황 ScheduleView의 view-toggle 패턴을 표준화.
 */
export function ViewToggle<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: ViewToggleProps<T>) {
  const btnSize = size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm';

  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5',
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={opt.value === value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md font-semibold transition',
            btnSize,
            opt.value === value
              ? 'bg-white text-navy-900 shadow-soft'
              : 'text-slate-500 hover:text-navy-900',
          )}
        >
          {opt.emoji && <span>{opt.emoji}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
