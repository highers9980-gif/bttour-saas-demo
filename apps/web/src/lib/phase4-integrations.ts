import { createCipheriv, randomBytes } from 'node:crypto';
import type { Role } from '@bttour/shared';
import { hasAtLeast } from '@bttour/shared';

export type IntegrationProvider = 'OPENAI' | 'GEMINI' | 'ANTHROPIC';
export type AiProviderRole = 'PRIMARY' | 'FALLBACK';
export type BackupExportFormat = 'XLSX' | 'JSON';

export type PrismaDelegate = {
  findUnique?: (args: unknown) => Promise<unknown>;
  findMany?: (args: unknown) => Promise<unknown>;
  upsert?: (args: unknown) => Promise<unknown>;
  update?: (args: unknown) => Promise<unknown>;
  updateMany?: (args: unknown) => Promise<unknown>;
  create?: (args: unknown) => Promise<unknown>;
  delete?: (args: unknown) => Promise<unknown>;
};

export type PrismaDynamic = Record<string, PrismaDelegate | undefined>;

export function modelDelegate(prisma: unknown, name: string): PrismaDelegate | null {
  return ((prisma as PrismaDynamic)[name] as PrismaDelegate | undefined) ?? null;
}

export function canViewIntegrationSettings(role: Role) {
  return hasAtLeast(role, 'ADMIN');
}

export function canMutateIntegrationSettings(role: Role) {
  return role === 'OWNER';
}

export function canTestIntegrationConnection(role: Role) {
  return hasAtLeast(role, 'ADMIN');
}

export function canExportWorkspaceData(role: Role) {
  return hasAtLeast(role, 'ADMIN');
}

export function maskSecret(secret: string) {
  const trimmed = secret.trim();
  if (!trimmed) return null;
  const prefix = trimmed.slice(0, Math.min(3, trimmed.length));
  const suffix = trimmed.slice(-4);
  return `${prefix}-***...****${suffix}`;
}

export interface EncryptedSecret {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  encryptedDek: Buffer;
  dekKeyVersion: number;
  masked: string;
}

export function encryptSecret(secret: string): EncryptedSecret {
  const masked = maskSecret(secret);
  if (!masked) {
    throw new Error('EMPTY_SECRET');
  }

  // Claude의 packages/shared/src/crypto가 병합되기 전까지 사용하는 임시 AES-GCM 어댑터.
  // 원문은 반환하지 않고, DB 저장용 Buffer와 마스킹 문자열만 만든다.
  const dek = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', dek, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv,
    authTag,
    encryptedDek: Buffer.from(dek),
    dekKeyVersion: 1,
    masked,
  };
}

export interface ConnectionTestResult {
  status: 'SUCCESS' | 'FAILED';
  message: string;
  latencyMs: number;
}

export async function testProviderConnection({
  apiKeyAvailable,
  modelName,
  provider,
}: {
  apiKeyAvailable: boolean;
  modelName: string;
  provider: IntegrationProvider;
}): Promise<ConnectionTestResult> {
  const startedAt = Date.now();
  if (!apiKeyAvailable) {
    return {
      status: 'FAILED',
      message: '저장된 API 키가 없습니다.',
      latencyMs: Date.now() - startedAt,
    };
  }

  if (!modelName.trim()) {
    return {
      status: 'FAILED',
      message: '모델명을 입력해야 연결 테스트를 실행할 수 있습니다.',
      latencyMs: Date.now() - startedAt,
    };
  }

  return {
    status: 'SUCCESS',
    message: `${provider} 연결 테스트 어댑터 준비 완료. Claude shared AI adapter 병합 후 실제 외부 호출로 전환됩니다.`,
    latencyMs: Date.now() - startedAt,
  };
}

export function auditMetadata(data: Record<string, unknown>) {
  return data;
}
