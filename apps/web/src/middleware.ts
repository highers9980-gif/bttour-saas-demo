import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const SUPPORTED_LOCALES = ['ko', 'en', 'zh'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE = 'ko';

function pickLocale(value: string | undefined | null): SupportedLocale {
  if (!value) return DEFAULT_LOCALE;
  const locale = value.toLowerCase().split('-')[0];
  return SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])
    ? (locale as SupportedLocale)
    : DEFAULT_LOCALE;
}

function localeFromAcceptLanguage(value: string | null): SupportedLocale {
  const candidates = value?.split(',') ?? [];
  for (const candidate of candidates) {
    const locale = pickLocale(candidate.trim().split(';')[0]);
    if (locale !== DEFAULT_LOCALE || candidate.toLowerCase().startsWith(DEFAULT_LOCALE)) {
      return locale;
    }
  }
  return DEFAULT_LOCALE;
}

/**
 * /w 이하 라우트는 모두 로그인 필요. 비로그인 시 /signin으로.
 * 더 세밀한 RBAC 가드는 페이지/Layout 단에서 처리.
 *
 * Locale prefix는 쓰지 않고 쿠키 기반으로만 처리한다.
 * 우선순위: NEXT_LOCALE 쿠키 > Accept-Language > ko.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = pathname.startsWith('/w');
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value;
  const nextLocale = cookieLocale
    ? pickLocale(cookieLocale)
    : localeFromAcceptLanguage(req.headers.get('accept-language'));

  if (isProtected && !req.auth) {
    const signinUrl = new URL('/signin', req.url);
    signinUrl.searchParams.set('callbackUrl', pathname);
    const response = NextResponse.redirect(signinUrl);
    if (!cookieLocale) response.cookies.set('NEXT_LOCALE', nextLocale, { path: '/' });
    return response;
  }

  const response = NextResponse.next();
  if (!cookieLocale) response.cookies.set('NEXT_LOCALE', nextLocale, { path: '/' });
  return response;
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
