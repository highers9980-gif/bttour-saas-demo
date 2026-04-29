import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runHermesSupervisor } from '@/lib/hermes/supervisor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

function safeEquals(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET 환경변수가 설정되지 않았습니다.' },
      { status: 500 },
    );
  }

  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!token || !safeEquals(token, secret)) {
    return NextResponse.json({ ok: false, error: '인증에 실패했습니다.' }, { status: 401 });
  }

  const result = await runHermesSupervisor();
  return NextResponse.json(result);
}
