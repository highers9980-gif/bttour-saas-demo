import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/** 폼 필드 라벨 + 본문 + 힌트/에러 묶음. */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
        {label}
        {required && <span className="text-orange-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement>;

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-lg border border-slate-200 px-3 text-base md:text-sm',
        'focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900',
        'placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500',
        className,
      )}
      {...rest}
    />
  ),
);
TextField.displayName = 'TextField';
