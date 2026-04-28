import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddingClass = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
} as const;

export function Card({
  className,
  children,
  padding = 'md',
  hover = false,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white border border-slate-100 shadow-soft',
        hover && 'hover:shadow-float transition',
        paddingClass[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
