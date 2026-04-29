'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

type LanguageCode = 'ko' | 'en' | 'zh';

const labels: Record<LanguageCode, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
};

function normalizeLocale(locale: string): LanguageCode {
  return locale === 'en' || locale === 'zh' ? locale : 'ko';
}

export function LanguageSwitcher() {
  const router = useRouter();
  const locale = normalizeLocale(useLocale());

  function changeLocale(nextLocale: LanguageCode) {
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(event) => changeLocale(event.target.value as LanguageCode)}
      className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-soft focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
    >
      {(['ko', 'en', 'zh'] as const).map((code) => (
        <option key={code} value={code}>
          {labels[code]}
        </option>
      ))}
    </select>
  );
}
