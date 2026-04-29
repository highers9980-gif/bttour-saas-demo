import path from 'path';
import { fileURLToPath } from 'url';
import createNextIntlPlugin from 'next-intl/plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 모노레포: 워크스페이스 패키지를 transpile
  transpilePackages: ['@bttour/ui', '@bttour/shared', '@bttour/db'],
  // Next.js 14.2부터 outputFileTracingRoot/Includes는 stable top-level 옵션으로 승격됨.
  // experimental에 두면 deprecation 경고 발생하므로 top-level로 이동.
  // 모노레포 루트 명시 — Vercel이 ../../packages/db도 trace 영역에 포함.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Prisma .prisma/client (hoisted 루트) + 한국어 폰트(woff2 subset)를 함수 번들에 강제 포함.
  // @fontsource/noto-sans-kr의 한국어 + Regular(400)/Bold(700) + woff2만 정확히 trace해서
  // 다른 weight/subset(latin/vietnamese/cyrillic 등)을 제외 → 빌드 사이즈 최소화.
  outputFileTracingIncludes: {
    '/**/*': [
      '../../node_modules/.prisma/client/**/*',
      '../../node_modules/@prisma/client/**/*',
      '../../node_modules/@fontsource/noto-sans-kr/files/noto-sans-kr-korean-400-normal.woff2',
      '../../node_modules/@fontsource/noto-sans-kr/files/noto-sans-kr-korean-700-normal.woff2',
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
    // Prisma client를 server bundle에서 제외 → 외부 모듈로 처리, native binary 자동 deploy.
    // Next.js 14.x에서는 experimental에 두는 것이 표준 (15부터 serverExternalPackages로 승격).
    serverComponentsExternalPackages: ['@prisma/client', '.prisma/client'],
  },
};

export default withNextIntl(nextConfig);
