// Prisma client 싱글턴 (Next.js dev hot-reload 대응)
// schema.prisma의 generator output에 맞춰 패키지 내부 경로에서 import.
import { PrismaClient } from './generated/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from './generated/client';
