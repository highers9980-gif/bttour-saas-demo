import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 모노레포: 워크스페이스 패키지를 transpile
  transpilePackages: ['@bttour/ui', '@bttour/shared', '@bttour/db'],
  // Prisma query engine .so 파일을 함수 번들에 강제 포함 (Vercel rhel-openssl-3.0.x)
  outputFileTracingIncludes: {
    '/**/*': [
      '../../packages/db/src/generated/client/**/*',
      '../../packages/db/prisma/schema.prisma',
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
};

export default withNextIntl(nextConfig);
