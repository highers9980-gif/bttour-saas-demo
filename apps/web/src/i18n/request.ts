import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const SUPPORTED_LOCALES = ['ko', 'en', 'zh'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const DEFAULT_LOCALE: SupportedLocale = 'ko';

function pickLocale(value: string | undefined | null): SupportedLocale {
  if (!value) return DEFAULT_LOCALE;
  return SUPPORTED_LOCALES.includes(value as SupportedLocale)
    ? (value as SupportedLocale)
    : DEFAULT_LOCALE;
}

/**
 * 로케일 결정 우선순위:
 *   1. 쿠키 `NEXT_LOCALE` (사용자가 LanguageSwitcher로 명시 선택한 값)
 *   2. Accept-Language 헤더의 첫 매치
 *   3. KO 기본
 *
 * 워크스페이스 기본 로케일(`Workspace.defaultLocale`)은 워크스페이스 진입 후
 * layout에서 cookie를 덮어 쓰는 방식으로 적용. 여기는 전역 진입점.
 */
export default getRequestConfig(async () => {
  const cookieLocale = cookies().get('NEXT_LOCALE')?.value;
  if (cookieLocale) {
    const locale = pickLocale(cookieLocale);
    return { locale, messages: await loadMessages(locale) };
  }

  const accept = headers().get('accept-language');
  const headerLocale = accept?.split(',')[0]?.split('-')[0];
  const locale = pickLocale(headerLocale);

  return {
    locale,
    messages: await loadMessages(locale),
  };
});

async function loadMessages(locale: SupportedLocale) {
  return (await import(`../messages/${locale}.json`)).default;
}
