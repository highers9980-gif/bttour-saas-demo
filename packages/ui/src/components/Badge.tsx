import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

type Tone =
  | 'navy'
  | 'orange'
  | 'green'
  | 'red'
  | 'amber'
  | 'blue'
  | 'pink'
  | 'purple'
  | 'cyan'
  | 'slate'
  | 'yellow';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  pulse?: boolean;
  children: ReactNode;
}

const toneClass: Record<Tone, string> = {
  navy: 'bg-navy-900 text-white',
  orange: 'bg-orange-500 text-white',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  pink: 'bg-pink-100 text-pink-700',
  purple: 'bg-purple-100 text-purple-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  slate: 'bg-slate-100 text-slate-700',
  yellow: 'bg-yellow-100 text-yellow-800',
};

export function Badge({
  className,
  tone = 'slate',
  pulse = false,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
        toneClass[tone],
        pulse && 'animate-pulse',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
