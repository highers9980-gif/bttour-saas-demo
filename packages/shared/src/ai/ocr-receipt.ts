export type ReceiptOcrProvider = 'OPENAI' | 'GEMINI' | 'ANTHROPIC';

export interface ReceiptExtractionResult {
  storeName: string | null;
  totalAmount: number | null;
  taxAmount: number | null;
  receiptDate: string | null;
  items: { name: string; quantity?: number; price?: number }[];
  rawText: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ExtractReceiptInput {
  provider: ReceiptOcrProvider;
  modelName: string;
  apiKey: string;
  imageMimeType: string;
  imageBase64: string;
  timeoutMs?: number;
}

export type ExtractReceiptResult =
  | { ok: true; data: ReceiptExtractionResult; latencyMs: number }
  | {
      ok: false;
      errorCode: 'AUTH' | 'RATE_LIMIT' | 'TIMEOUT' | 'INVALID_IMAGE' | 'UNKNOWN';
      errorMessage: string;
      latencyMs: number;
    };

const DEFAULT_TIMEOUT_MS = 30000;

const RECEIPT_PROMPT =
  '다음 영수증 이미지에서 정보를 추출해 JSON으로만 답해주세요.\n' +
  '키: storeName, totalAmount, taxAmount, receiptDate (YYYY-MM-DD), items (배열, name/quantity/price), confidence (high|medium|low).\n' +
  '한국어 영수증을 우선 가정하되 영문 OCR도 처리하세요. 인식 못한 필드는 null. 설명/마크다운 X. JSON만.';

export async function extractReceipt(input: ExtractReceiptInput): Promise<ExtractReceiptResult> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const started = Date.now();

  try {
    validateImage(input.imageMimeType, input.imageBase64);
    const data = await withTimeout(callProvider(input), timeoutMs);
    return { ok: true, data, latencyMs: Date.now() - started };
  } catch (err) {
    const normalized = normalizeOcrError(err, timeoutMs);
    return { ok: false, ...normalized, latencyMs: Date.now() - started };
  }
}

async function callProvider(input: ExtractReceiptInput): Promise<ReceiptExtractionResult> {
  switch (input.provider) {
    case 'OPENAI':
      return callOpenAi(input);
    case 'GEMINI':
      return callGemini(input);
    case 'ANTHROPIC':
      return callAnthropic(input);
  }
}

async function callOpenAi(input: ExtractReceiptInput): Promise<ReceiptExtractionResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: input.modelName,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: RECEIPT_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:${input.imageMimeType};base64,${input.imageBase64}`,
              },
            },
          ],
        },
      ],
    }),
  });

  const json = await readJsonOrThrow(res, 'OpenAI');
  const content = json.choices?.[0]?.message?.content;
  return normalizeReceiptPayload(parseJsonText(content));
}

async function callGemini(input: ExtractReceiptInput): Promise<ReceiptExtractionResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    input.modelName,
  )}:generateContent?key=${encodeURIComponent(input.apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: RECEIPT_PROMPT },
            {
              inline_data: {
                mime_type: input.imageMimeType,
                data: input.imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: { response_mime_type: 'application/json' },
    }),
  });

  const json = await readJsonOrThrow(res, 'Gemini');
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  return normalizeReceiptPayload(parseJsonText(text));
}

async function callAnthropic(input: ExtractReceiptInput): Promise<ReceiptExtractionResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': input.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: input.modelName,
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: RECEIPT_PROMPT },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: input.imageMimeType,
                data: input.imageBase64,
              },
            },
          ],
        },
      ],
    }),
  });

  const json = await readJsonOrThrow(res, 'Anthropic');
  const text = json.content?.find((part: { type?: string }) => part.type === 'text')?.text;
  return normalizeReceiptPayload(parseJsonText(text));
}

async function readJsonOrThrow(res: Response, provider: string): Promise<Record<string, any>> {
  const text = await safeReadBody(res);
  if (!res.ok) {
    const err = new Error(`${provider} ${res.status}: ${text}`);
    err.name = `HTTP_${res.status}`;
    throw err;
  }
  return parseJsonText(text);
}

function parseJsonText(raw: unknown): Record<string, any> {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('INVALID_IMAGE: OCR 응답이 비어 있습니다.');
  }

  const trimmed = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error('INVALID_IMAGE: OCR 응답을 JSON으로 해석할 수 없습니다.');
  }
}

function normalizeReceiptPayload(raw: Record<string, any>): ReceiptExtractionResult {
  const confidence = raw.confidence;
  const items = Array.isArray(raw.items)
    ? raw.items
        .map((item) => ({
          name: typeof item?.name === 'string' ? item.name : '',
          quantity: toOptionalNumber(item?.quantity),
          price: toOptionalNumber(item?.price),
        }))
        .filter((item) => item.name)
    : [];

  return {
    storeName: toNullableString(raw.storeName),
    totalAmount: toOptionalNumber(raw.totalAmount) ?? null,
    taxAmount: toOptionalNumber(raw.taxAmount) ?? null,
    receiptDate: normalizeDate(raw.receiptDate),
    items,
    rawText: typeof raw.rawText === 'string' ? raw.rawText : '',
    confidence:
      confidence === 'high' || confidence === 'medium' || confidence === 'low' ? confidence : 'low',
  };
}

function validateImage(imageMimeType: string, imageBase64: string) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(imageMimeType)) {
    throw new Error('INVALID_IMAGE: JPG, PNG, WebP 이미지만 업로드할 수 있습니다.');
  }
  if (!imageBase64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    throw new Error('INVALID_IMAGE: 이미지 파일을 읽을 수 없습니다.');
  }
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? value : null;
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string' && value.trim()) {
    const normalized = Number(value.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(normalized)) return Math.round(normalized);
  }
  return undefined;
}

async function safeReadBody(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 1000);
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

function normalizeOcrError(
  err: unknown,
  timeoutMs: number,
): {
  errorCode: 'AUTH' | 'RATE_LIMIT' | 'TIMEOUT' | 'INVALID_IMAGE' | 'UNKNOWN';
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
  if (/INVALID_IMAGE|image|media|mime|JSON/i.test(redacted)) {
    return {
      errorCode: 'INVALID_IMAGE',
      errorMessage:
        '영수증 이미지를 인식하지 못했습니다. 더 선명한 JPG/PNG/WebP로 다시 시도해 주세요.',
    };
  }

  return {
    errorCode: 'UNKNOWN',
    errorMessage: redacted.slice(0, 200) || '알 수 없는 오류로 영수증 분석에 실패했습니다.',
  };
}
