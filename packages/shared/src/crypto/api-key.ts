/**
 * API 키 envelope encryption (AES-256-GCM)
 *
 * 정책 (Codex 08-phase4-integration-panels.md §1 결정):
 *   - 워크스페이스별 DEK (Data Encryption Key) — 매 키마다 새로 생성
 *   - 시스템 KEK (Key Encryption Key) — process.env.AI_KEY_ENCRYPTION_SECRET에서 파생
 *   - DEK는 KEK로 암호화해서 DB의 encryptedDek 컬럼에 저장
 *   - 실제 API 키는 DEK로 암호화해서 apiKeyCiphertext에 저장
 *   - DEK 분실 시 그 워크스페이스 키만 영향, 다른 워크스페이스는 영향 없음
 *   - KEK 회전 시 dekKeyVersion 증가 + 모든 DEK 재암호화 (운영 작업)
 */

import * as crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // GCM 권장 96bit
const AUTH_TAG_LEN = 16; // 128bit
const DEK_LEN = 32; // AES-256
const CURRENT_KEK_VERSION = 1;

export interface EncryptedApiKey {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  encryptedDek: Buffer;
  dekKeyVersion: number;
  masked: string;
}

/** 마스터 KEK 파생 (32 bytes). AI_KEY_ENCRYPTION_SECRET를 SHA-256 해시. */
function getKek(): Buffer {
  const secret = process.env.AI_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error(
      'AI_KEY_ENCRYPTION_SECRET 환경변수가 설정되지 않았습니다. .env 또는 Vercel 환경변수에 등록하세요.',
    );
  }
  if (secret.length < 32) {
    throw new Error('AI_KEY_ENCRYPTION_SECRET는 최소 32자 이상이어야 합니다.');
  }
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
}

/** AES-256-GCM 암호화 wrapper. iv (12) + authTag (16) + ciphertext 형태 묶음 반환. */
function encryptGcm(key: Buffer, plaintext: Buffer): { iv: Buffer; authTag: Buffer; ciphertext: Buffer } {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { iv, authTag, ciphertext };
}

function decryptGcm(key: Buffer, iv: Buffer, authTag: Buffer, ciphertext: Buffer): Buffer {
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * API 키 평문을 받아 envelope 암호화 결과 반환.
 * 호출 직후 평문 변수는 가비지 컬렉션에 맡기고, DB에는 결과만 저장.
 */
export function encryptApiKey(plaintext: string): EncryptedApiKey {
  if (!plaintext || plaintext.length < 8) {
    throw new Error('API 키가 너무 짧습니다 (최소 8자).');
  }

  // 1. 새 DEK 생성
  const dek = crypto.randomBytes(DEK_LEN);

  // 2. DEK로 평문 암호화
  const { iv, authTag, ciphertext } = encryptGcm(dek, Buffer.from(plaintext, 'utf8'));

  // 3. KEK로 DEK 암호화
  const kek = getKek();
  const dekEnc = encryptGcm(kek, dek);
  // encryptedDek = dekIv (12) + dekAuthTag (16) + dekCiphertext
  const encryptedDek = Buffer.concat([dekEnc.iv, dekEnc.authTag, dekEnc.ciphertext]);

  return {
    ciphertext,
    iv,
    authTag,
    encryptedDek,
    dekKeyVersion: CURRENT_KEK_VERSION,
    masked: maskApiKey(plaintext),
  };
}

/** 암호화된 API 키 → 평문. 호출 직후 즉시 사용하고 변수 폐기. */
export function decryptApiKey(input: {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  encryptedDek: Buffer;
  dekKeyVersion: number;
}): string {
  if (input.dekKeyVersion !== CURRENT_KEK_VERSION) {
    throw new Error(
      `DEK key version mismatch (저장: v${input.dekKeyVersion}, 현재 KEK: v${CURRENT_KEK_VERSION}). KEK 회전이 필요합니다.`,
    );
  }

  // 1. KEK로 DEK 복호화
  const kek = getKek();
  const dekIv = input.encryptedDek.subarray(0, IV_LEN);
  const dekAuthTag = input.encryptedDek.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
  const dekCiphertext = input.encryptedDek.subarray(IV_LEN + AUTH_TAG_LEN);
  const dek = decryptGcm(kek, dekIv, dekAuthTag, dekCiphertext);

  // 2. DEK로 평문 복호화
  const plaintextBuf = decryptGcm(dek, input.iv, input.authTag, input.ciphertext);
  return plaintextBuf.toString('utf8');
}

/**
 * API 키 마스킹 — 화면 표시용.
 * 예: "sk-abc...****wxyz" (앞 7자 + suffix 4자)
 */
export function maskApiKey(plaintext: string): string {
  if (!plaintext) return '***';
  if (plaintext.length <= 11) return '***';
  const prefix = plaintext.slice(0, 7);
  const suffix = plaintext.slice(-4);
  return `${prefix}***...****${suffix}`;
}
