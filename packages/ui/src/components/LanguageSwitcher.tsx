'use client';

import { cn } from '../lib/cn';

export type LanguageCode = 'ko' | 'en' | 'zh';

export interface LanguageSwitcherProps {
  current: LanguageCode;
  onChange: (lang: LanguageCode) => void;
  variant?: 'light' | 'dark';
  className?: string;
}

const LABEL: Record<LanguageCode, string> = {
  ko: 'KO',
  en: 'EN',
  zh: '中文',
};

/**
 * 도면의 KO/EN/中文 토글. floating fab 스타일과 inline 스타일 둘 다 가능.
 *
 * onChange는 외부에서 cookie 갱신(`document.cookie = 'NEXT_LOCALE=...'`) +
 * `router.refresh()` 또는 페이지 reload 처리.
 */
export function LanguageSwitcher({
  current,
  onChange,
  variant = 'light',
  className,
}: LanguageSwitcherProps) {
  const baseBtn =
    'px-2.5 py-1 rounded text-xs font-semibold transition leading-none';
  const isDark = variant === 'dark';
  const wrapperClass = cn(
    'inline-flex items-center gap-1 rounded-lg p-1',
    isDark
      ? 'bg-navy-950/80 border border-white/10'
      : 'bg-white border border-slate-200 shadow-soft',
    className,
  );

  const btnClass = (lang: LanguageCode) =>
    cn(
      baseBtn,
      lang === current
        ? isDark
          ? 'bg-orange-500 text-white'
          : 'bg-navy-900 text-white'
        : isDark
          ? 'text-slate-300 hover:text-white'
          : 'text-slate-600 hover:text-navy-900',
    );

  return (
    <div className={wrapperClass}>
      {(['ko', 'en', 'zh'] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          className={btnClass(lang)}
          aria-pressed={lang === current}
        >
          {LABEL[lang]}
        </button>
      ))}
    </div>
  );
}
