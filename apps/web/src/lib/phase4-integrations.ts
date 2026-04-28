import {
  canExportWorkspaceData as sharedCanExportWorkspaceData,
  canMutateIntegrationSettings as sharedCanMutateIntegrationSettings,
  canTestIntegrationConnection as sharedCanTestIntegrationConnection,
  canViewIntegrationSettings as sharedCanViewIntegrationSettings,
  decryptApiKey,
  encryptApiKey,
  testConnection,
  type Role,
} from '@bttour/shared';

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
  return sharedCanViewIntegrationSettings(role);
}

export function canMutateIntegrationSettings(role: Role) {
  return sharedCanMutateIntegrationSettings(role);
}

export function canTestIntegrationConnection(role: Role) {
  return sharedCanTestIntegrationConnection(role);
}

export function canExportWorkspaceData(role: Role) {
  return sharedCanExportWorkspaceData(role);
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
  return encryptApiKey(secret);
}

export interface ConnectionTestResult {
  status: 'SUCCESS' | 'FAILED';
  message: string;
  latencyMs: number;
}

export async function testProviderConnection({
  encryptedKey,
  modelName,
  provider,
}: {
  encryptedKey?: {
    ciphertext: Buffer;
    iv: Buffer;
    authTag: Buffer;
    encryptedDek: Buffer;
    dekKeyVersion: number;
  } | null;
  modelName: string;
  provider: IntegrationProvider;
}): Promise<ConnectionTestResult> {
  if (!encryptedKey) {
    return {
      status: 'FAILED',
      message: '저장된 API 키가 없습니다.',
      latencyMs: 0,
    };
  }

  if (!modelName.trim()) {
    return {
      status: 'FAILED',
      message: '모델명을 입력해야 연결 테스트를 실행할 수 있습니다.',
      latencyMs: 0,
    };
  }

  const apiKey = decryptApiKey(encryptedKey);
  return testConnection({ provider, modelName, apiKey, timeoutMs: 8000 });
}

export function auditMetadata(data: Record<string, unknown>) {
  return data;
}
