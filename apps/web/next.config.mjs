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
  // 모노레포 루트 명시 — Vercel이 ../../packages/db도 trace 영역에 포함시키도록
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Prisma .prisma/client (hoisted 루트 위치)를 함수 번들에 강제 포함
  outputFileTracingIncludes: {
    '/**/*': [
      '../../node_modules/.prisma/client/**/*',
      '../../node_modules/@prisma/client/**/*',
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
    // Prisma client를 server bundle에서 제외 → 외부 모듈로 처리하여 native binary 자동 처리
    serverComponentsExternalPackages: ['@prisma/client', '.prisma/client'],
  },
};

export default withNextIntl(nextConfig);
