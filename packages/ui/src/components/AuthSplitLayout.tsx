import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface AuthSplitLayoutProps {
  /** 좌측 폼 패널 (로그인/가입 폼) */
  left: ReactNode;
  /** 우측 브랜드 패널 (배경 그라디언트 + 카피) — 모바일에서는 숨김 */
  right: ReactNode;
  /** 우측 상단 언어 토글 */
  langSwitcher?: ReactNode;
}

/**
 * 도면 login.html / signup.html의 좌·우 분할 레이아웃.
 * - 모바일: 우측 브랜드 패널 숨김, 좌측 폼만 풀화면
 * - 데스크톱: 50:50 분할, 우측은 navy 그라디언트
 */
export function AuthSplitLayout({
  left,
  right,
  langSwitcher,
}: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen flex bg-slate-50 relative">
      {langSwitcher && (
        <div className="absolute top-4 right-4 z-10">{langSwitcher}</div>
      )}
      <div className="flex-1 grid place-items-center p-6 md:p-12">
        <div className="w-full max-w-md">{left}</div>
      </div>
      <div className="hidden md:flex flex-1 grad-navy text-white relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-orange-500/20 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-md p-12">{right}</div>
      </div>
    </div>
  );
}

export interface AuthBrandPanelProps {
  badge?: string;
  titleLines: ReactNode[];
  description: string;
  kpis?: Array<{ value: string; label: string; tone?: 'default' | 'orange' }>;
  copyright?: string;
}

/** AuthSplitLayout의 우측에 들어갈 브랜드 카피 패널. */
export function AuthBrandPanel({
  badge,
  titleLines,
  description,
  kpis,
  copyright,
}: AuthBrandPanelProps) {
  return (
    <div className="space-y-8">
      {badge && (
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm">
          <span className="w-2 h-2 bg-orange-500 rounded-full" />
          {badge}
        </div>
      )}
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
        {titleLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </h1>
      <p className="text-lg text-slate-300 leading-relaxed">{description}</p>
      {kpis && kpis.length > 0 && (
        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
          {kpis.map((kpi, i) => (
            <div key={i}>
              <div
                className={cn(
                  'text-2xl font-bold num-tabular',
                  kpi.tone === 'orange' && 'text-orange-400',
                )}
              >
                {kpi.value}
              </div>
              <div className="text-xs text-slate-400 mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>
      )}
      {copyright && (
        <div className="text-xs text-slate-500 pt-4">{copyright}</div>
      )}
    </div>
  );
}

export interface AuthFormPanelProps {
  /** 상단 로고/브랜드 영역 */
  brand?: ReactNode;
  /** 폼 제목 */
  title: string;
  /** 폼 부제 (선택) */
  subtitle?: string;
  /** 폼 본문 */
  children: ReactNode;
  /** 하단 보조 영역 (가입 안내·비밀번호 찾기 등) */
  footer?: ReactNode;
}

/** AuthSplitLayout의 좌측에 들어갈 폼 카드. */
export function AuthFormPanel({
  brand,
  title,
  subtitle,
  children,
  footer,
}: AuthFormPanelProps) {
  return (
    <div className="space-y-6">
      {brand && <div className="mb-2">{brand}</div>}
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
      <div>{children}</div>
      {footer && (
        <div className="pt-4 border-t border-slate-200 text-sm text-center text-slate-500">
          {footer}
        </div>
      )}
    </div>
  );
}
