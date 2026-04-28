import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * /w 이하 라우트는 모두 로그인 필요. 비로그인 시 /signin으로.
 * 더 세밀한 RBAC 가드는 페이지/Layout 단에서 처리.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = pathname.startsWith('/w');

  if (isProtected && !req.auth) {
    const signinUrl = new URL('/signin', req.url);
    signinUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signinUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/w/:path*'],
};
