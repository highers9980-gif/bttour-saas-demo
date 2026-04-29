export type MonthlyInsightProvider = 'OPENAI' | 'GEMINI' | 'ANTHROPIC';

export interface MonthlyInsightStatistics {
  workspaceName: string;
  periodLabel: string;
  revenue: {
    totalMinor: number;
    teamCount: number;
    topPartners: { name: string; amountMinor: number }[];
  };
  expense: {
    totalMinor: number;
    topCategories: { name: string; amountMinor: number }[];
  };
  guides: { name: string; teamCount: number; settlementMinor: number }[];
  receivables: { totalOutstandingMinor: number; overdueCount: number };
  momChange?: { revenueDeltaPct: number; expenseDeltaPct: number };
}

export interface GenerateMonthlyInsightInput {
  provider: MonthlyInsightProvider;
  modelName: string;
  apiKey: string;
  statistics: MonthlyInsightStatistics;
  timeoutMs?: number;
}

export type GenerateMonthlyInsightResult =
  | { ok: true; summaryMarkdown: string; latencyMs: number }
  | {
      ok: false;
      errorCode: 'AUTH' | 'RATE_LIMIT' | 'TIMEOUT' | 'UNKNOWN';
      errorMessage: string;
      latencyMs: number;
    };

const DEFAULT_TIMEOUT_MS = 30000;

const INSIGHT_PROMPT =
  '당신은 한국 인바운드 여행사의 회계/운영 분석가입니다.\n' +
  '다음 통계 JSON을 보고 운영자가 즉시 행동할 수 있는 월말 인사이트를 한국어 마크다운으로 작성해주세요.\n\n' +
  '구조 (이 순서로):\n' +
  '## 핵심 지표\n' +
  "- 매출, 비용, 손익을 3-5줄로 요약. 천단위 콤마 + '원'.\n\n" +
  '## 전월 대비 변화\n' +
  '- 증감 % + 원인 추정 2-3줄.\n\n' +
  '## 주목할 점 3가지\n' +
  '- 가이드/파트너/미수금 중 눈에 띄는 점.\n\n' +
  '## 권고사항 3가지\n' +
  '- 운영자가 다음 달 실행할 구체적 액션.\n\n' +
  '문체: 짧고 명확. 마크다운 코드펜스(```) 없이 본문만.';

export async function generateMonthlyInsight(
  input: GenerateMonthlyInsightInput,
): Promise<GenerateMonthlyInsightResult> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const started = Date.now();

  try {
    const summaryMarkdown = await withTimeout(callProvider(input), timeoutMs);
    return {
      ok: true,
      summaryMarkdown: cleanupMarkdown(summaryMarkdown),
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    const normalized = normalizeInsightError(err, timeoutMs);
    return { ok: false, ...normalized, latencyMs: Date.now() - started };
  }
}

async function callProvider(input: GenerateMonthlyInsightInput): Promise<string> {
  switch (input.provider) {
    case 'OPENAI':
      return callOpenAi(input);
    case 'GEMINI':
      return callGemini(input);
    case 'ANTHROPIC':
      return callAnthropic(input);
  }
}

function userPrompt(statistics: MonthlyInsightStatistics) {
  return `${INSIGHT_PROMPT}\n\n통계 JSON:\n${JSON.stringify(statistics)}`;
}

async function callOpenAi(input: GenerateMonthlyInsightInput): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: input.modelName,
      messages: [{ role: 'user', content: userPrompt(input.statistics) }],
      temperature: 0.2,
    }),
  });

  const json = await readJsonOrThrow(res, 'OpenAI');
  return String(json.choices?.[0]?.message?.content ?? '');
}

async function callGemini(input: GenerateMonthlyInsightInput): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    input.modelName,
  )}:generateContent?key=${encodeURIComponent(input.apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: userPrompt(input.statistics) }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });

  const json = await readJsonOrThrow(res, 'Gemini');
  return String(json.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
}

async function callAnthropic(input: GenerateMonthlyInsightInput): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': input.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: input.modelName,
      max_tokens: 1600,
      messages: [{ role: 'user', content: userPrompt(input.statistics) }],
      temperature: 0.2,
    }),
  });

  const json = await readJsonOrThrow(res, 'Anthropic');
  return String(json.content?.find((part: { type?: string }) => part.type === 'text')?.text ?? '');
}

async function readJsonOrThrow(res: Response, provider: string): Promise<Record<string, any>> {
  const text = await safeReadBody(res);
  if (!res.ok) {
    const err = new Error(`${provider} ${res.status}: ${text}`);
    err.name = `HTTP_${res.status}`;
    throw err;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${provider}: 응답 JSON을 해석할 수 없습니다.`);
  }
}

function cleanupMarkdown(raw: string) {
  return raw
    .trim()
    .replace(/^```markdown\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

async function safeReadBody(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 2000);
  } catch {
    return '응답 본문 읽기 실패';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`TIMEOUT: ${ms}ms`)), ms);
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

function normalizeInsightError(
  err: unknown,
  timeoutMs: number,
): {
  errorCode: 'AUTH' | 'RATE_LIMIT' | 'TIMEOUT' | 'UNKNOWN';
  errorMessage: string;
} {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const redacted = raw
    .replace(/sk-[A-Za-z0-9_\-]+/g, '[REDACTED]')
    .replace(/AIza[0-9A-Za-z_\-]+/g, '[REDACTED]')
    .replace(/sk-ant-[A-Za-z0-9_\-]+/g, '[REDACTED]');

  if (/TIMEOUT|Timeout/i.test(redacted)) {
    return {
      errorCode: 'TIMEOUT',
      errorMessage: `AI가 ${Math.round(timeoutMs / 1000)}초 안에 응답하지 않았습니다.`,
    };
  }
  if (/40[13]|unauthorized|invalid.*key|permission/i.test(redacted)) {
    return {
      errorCode: 'AUTH',
      errorMessage: 'API 키 인증에 실패했습니다. 설정 > AI에서 키를 다시 확인해 주세요.',
    };
  }
  if (/429|rate.?limit|quota/i.test(redacted)) {
    return {
      errorCode: 'RATE_LIMIT',
      errorMessage: 'AI provider 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.',
    };
  }

  return {
    errorCode: 'UNKNOWN',
    errorMessage: redacted.slice(0, 240) || '알 수 없는 오류로 월말 인사이트 생성에 실패했습니다.',
  };
}
