'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '../lib/cn';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  duration?: number; // ms, 기본 3000
}

interface ToastContextValue {
  show: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastContextValue['show']>(
    (toast) => {
      const id = Math.random().toString(36).slice(2, 11);
      const duration = toast.duration ?? 3000;
      setToasts((prev) => [...prev, { ...toast, id }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const toneClass: Record<ToastTone, string> = {
  success: 'border-green-200 bg-green-50',
  error: 'border-red-200 bg-red-50',
  info: 'border-slate-200 bg-white',
  warning: 'border-amber-200 bg-amber-50',
};

const toneIcon: Record<ToastTone, string> = {
  success: '✓',
  error: '!',
  info: 'i',
  warning: '⚠',
};

const toneIconColor: Record<ToastTone, string> = {
  success: 'text-green-600',
  error: 'text-red-600',
  info: 'text-slate-600',
  warning: 'text-amber-600',
};

function ToastViewport({
  toasts,
  dismiss,
}: {
  toasts: ToastItem[];
  dismiss: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg border shadow-float',
            toneClass[t.tone],
          )}
        >
          <span
            className={cn(
              'w-6 h-6 grid place-items-center rounded-full bg-white font-bold text-sm shrink-0',
              toneIconColor[t.tone],
            )}
          >
            {toneIcon[t.tone]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-navy-900">
              {t.title}
            </div>
            {t.description && (
              <div className="text-xs text-slate-600 mt-0.5">
                {t.description}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="닫기"
            className="text-slate-400 hover:text-slate-700 text-sm"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
