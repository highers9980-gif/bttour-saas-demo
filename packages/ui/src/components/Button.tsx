import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClass: Record<Variant, string> = {
  primary:
    'bg-orange-500 hover:bg-orange-600 text-white shadow-glow disabled:bg-orange-300',
  secondary: 'bg-navy-900 hover:bg-navy-950 text-white',
  outline:
    'border border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-10 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', type = 'button', ...rest },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex min-w-[44px] items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...rest}
    />
  ),
);

Button.displayName = 'Button';
