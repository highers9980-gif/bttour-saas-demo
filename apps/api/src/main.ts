import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * NestJS API — Phase 0 골격.
 * 도메인 모듈은 Phase 2 이후 추가 (가이드정산/차량/쇼핑/미수금/회계 등).
 * Phase 0~1에서는 apps/web의 Server Actions로 가입/로그인/워크스페이스 처리.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api');

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  console.log(`[api] listening on http://localhost:${port}/api`);
}
void bootstrap();
