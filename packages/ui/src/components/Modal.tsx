'use client';

import { useEffect, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 백드롭 클릭으로 닫기 허용 */
  closeOnBackdrop?: boolean;
}

const sizeClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const;

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-50 grid place-items-center p-4"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        className={cn(
          'relative w-full bg-white rounded-2xl shadow-float',
          sizeClass[size],
        )}
      >
        {title && (
          <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2
              id="modal-title"
              className="text-lg font-bold text-navy-900"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="w-8 h-8 grid place-items-center rounded hover:bg-slate-100 text-slate-500"
            >
              ✕
            </button>
          </header>
        )}
        <div className="p-6">{children}</div>
        {footer && (
          <footer className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
