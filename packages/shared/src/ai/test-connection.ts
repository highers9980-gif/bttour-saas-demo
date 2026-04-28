/**
 * AI provider 연결 테스트.
 *
 * Codex 08-phase4-integration-panels.md §2 권장안 반영:
 *   - Provider별 가장 가벼운 호출 (모델명 검증까지)
 *   - timeout 8초, retry 없음
 *   - 실패 시 친절한 한국어 메시지로 정규화
 *   - 연결 테스트 결과는 호출자가 WorkspaceAiSettings.lastTest*에 저장
 */

export type AiProvider = 'OPENAI' | 'GEMINI' | 'ANTHROPIC';

export interface TestConnectionInput {
  provider: AiProvider;
  modelName: string;
  apiKey: string; // 평문 — decryptApiKey()로 미리 복호화한 값
  timeoutMs?: number;
}

export interface TestConnectionResult {
  status: 'SUCCESS' | 'FAILED';
  message: string;
  latencyMs: number;
}

const DEFAULT_TIMEOUT = 8000;

export async function testConnection(
  input: TestConnectionInput,
): Promise<TestConnectionResult> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT;
  const started = Date.now();

  try {
    await withTimeout(callProviderTest(input), timeoutMs);
    return {
      status: 'SUCCESS',
      message: `연결 정상 — ${input.provider} / ${input.modelName}`,
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    return {
      status: 'FAILED',
      message: normalizeError(err),
      latencyMs: Date.now() - started,
    };
  }
}

async function callProviderTest(input: TestConnectionInput): Promise<void> {
  switch (input.provider) {
    case 'OPENAI':
      return testOpenAi(input);
    case 'GEMINI':
      return testGemini(input);
    case 'ANTHROPIC':
      return testAnthropic(input);
  }
}

/** OpenAI: GET /v1/models/{model} — 모델명 접근 권한까지 확인 */
async function testOpenAi(input: TestConnectionInput): Promise<void> {
  const url = `https://api.openai.com/v1/models/${encodeURIComponent(input.modelName)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${input.apiKey}` },
  });
  if (!res.ok) {
    const body = await safeReadBody(res);
    throw new Error(`OpenAI ${res.status}: ${body}`);
  }
}

/** Gemini: GET /v1beta/models — 키 유효성 가벼운 확인 */
async function testGemini(input: TestConnectionInput): Promise<void> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
    input.apiKey,
  )}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await safeReadBody(res);
    throw new Error(`Gemini ${res.status}: ${body}`);
  }
}

/** Anthropic: 최소 messages 호출 (max_tokens=1) — 모델명까지 검증 */
async function testAnthropic(input: TestConnectionInput): Promise<void> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': input.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: input.modelName,
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    }),
  });
  if (!res.ok) {
    const body = await safeReadBody(res);
    throw new Error(`Anthropic ${res.status}: ${body}`);
  }
}

async function safeReadBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 200);
  } catch {
    return '응답 본문 읽기 실패';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout after ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** 외부 provider 에러 메시지를 사용자 친화 한국어로 정규화. 키 원문/디테일 노출 금지. */
function normalizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : '';

  if (/Timeout/.test(raw)) return '응답 시간 초과 (8초)';
  if (/40[13]/.test(raw) || /unauthorized/i.test(raw) || /invalid.*key/i.test(raw)) {
    return 'API 키 인증 실패 — 키를 다시 확인하세요';
  }
  if (/404/.test(raw) || /model.*not.*found/i.test(raw)) {
    return '모델 이름을 찾을 수 없습니다 — 철자 또는 권한을 확인하세요';
  }
  if (/429/.test(raw) || /rate.?limit/i.test(raw)) {
    return '쿼터 초과 — 잠시 후 다시 시도하거나 결제 한도 확인';
  }
  if (/5\d{2}/.test(raw)) return 'Provider 서버 오류 — 잠시 후 다시 시도';
  if (/network|fetch failed|ECONNREFUSED/i.test(raw)) {
    return '네트워크 오류 — 인터넷 연결 확인';
  }

  // 기본값: 200자 이내로 자르고 키 원문 패턴 제거
  return raw.replace(/sk-[A-Za-z0-9_\-]+/g, '[REDACTED]').slice(0, 200) || '알 수 없는 오류';
}
