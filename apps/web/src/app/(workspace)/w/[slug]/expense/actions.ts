'use server';

import { prisma, Prisma } from '@bttour/db';
import {
  canCreateExpense,
  computeVat10,
  decryptApiKey,
  extractReceipt,
  normalizeWonInput,
  type ReceiptExtractionResult,
} from '@bttour/shared';
import { revalidatePath } from 'next/cache';
import { assertWorkspace } from '@/lib/workspace-guard';

const MAX_RECEIPT_BYTES = 1024 * 1024;
const ALLOWED_RECEIPT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type ReceiptScanActionResult =
  | { ok: true; jobId: string; data: ReceiptExtractionResult }
  | { ok: false; jobId?: string; error: string };

function cleanString(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return text || null;
}

function dateFromInput(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date();
  }
  return new Date(`${text}T00:00:00.000Z`);
}

function wonFromInput(value: FormDataEntryValue | null) {
  return normalizeWonInput(String(value ?? '0'));
}

function receiptItemsFromForm(formData: FormData) {
  const names = formData.getAll('itemName').map((value) => String(value ?? '').trim());
  const quantities = formData.getAll('itemQuantity');
  const prices = formData.getAll('itemPrice');

  return names
    .map((name, index) => {
      if (!name) return null;
      const quantity = Number(String(quantities[index] ?? '').trim());
      const price = Number(String(prices[index] ?? '').trim());
      return {
        name,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : undefined,
        price: Number.isFinite(price) && price >= 0 ? Math.round(price) : undefined,
      };
    })
    .filter(Boolean);
}

function normalizeActionError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  if (/AI_KEY_ENCRYPTION_SECRET/.test(raw)) {
    return 'AI 키 암호화 환경변수가 설정되지 않았습니다. 운영 환경변수를 확인해 주세요.';
  }
  return (
    raw
      .replace(/sk-[A-Za-z0-9_\-]+/g, '[REDACTED]')
      .replace(/AIza[0-9A-Za-z_\-]+/g, '[REDACTED]')
      .replace(/sk-ant-[A-Za-z0-9_\-]+/g, '[REDACTED]')
      .slice(0, 240) || '요청을 처리하지 못했습니다.'
  );
}

function revalidateExpense(slug: string) {
  revalidatePath(`/w/${slug}/expense`);
}

export async function scanReceiptAction(
  slug: string,
  formData: FormData,
): Promise<ReceiptScanActionResult> {
  const { workspace, role, userId } = await assertWorkspace(slug, 'MANAGER');
  if (!canCreateExpense(role)) {
    return { ok: false, error: '비용을 생성할 권한이 없습니다.' };
  }

  const image = formData.get('image');
  if (!(image instanceof File) || image.size === 0) {
    return { ok: false, error: '영수증 이미지 파일을 선택해 주세요.' };
  }
  if (!ALLOWED_RECEIPT_MIME_TYPES.includes(image.type)) {
    return { ok: false, error: 'JPG, PNG, WebP 이미지만 업로드할 수 있습니다.' };
  }
  if (image.size > MAX_RECEIPT_BYTES) {
    return { ok: false, error: '영수증 이미지는 1MB 이하만 업로드할 수 있습니다.' };
  }

  const [settings, providerConfig] = await Promise.all([
    prisma.workspaceAiSettings.findUnique({ where: { workspaceId: workspace.id } }),
    prisma.workspaceAiProviderConfig.findUnique({
      where: { workspaceId_role: { workspaceId: workspace.id, role: 'PRIMARY' } },
    }),
  ]);

  if (!settings?.enabled || !providerConfig) {
    return {
      ok: false,
      error: '설정 > AI에서 키를 등록하고 Hermes AI를 활성화해 주세요.',
    };
  }

  const imageBuffer = Buffer.from(await image.arrayBuffer());
  const imageBase64 = imageBuffer.toString('base64');
  const job = await prisma.receiptOcrJob.create({
    data: {
      workspaceId: workspace.id,
      imageMimeType: image.type,
      imageBase64,
      imageBytes: image.size,
      provider: providerConfig.provider,
      modelName: providerConfig.modelName,
      keyVersion: providerConfig.apiKeyVersion,
      status: 'RUNNING',
      createdById: userId,
    },
  });

  try {
    const apiKey = decryptApiKey({
      ciphertext: providerConfig.apiKeyCiphertext,
      iv: providerConfig.apiKeyIv,
      authTag: providerConfig.apiKeyAuthTag,
      encryptedDek: providerConfig.encryptedDek,
      dekKeyVersion: providerConfig.dekKeyVersion,
    });

    const result = await extractReceipt({
      provider: providerConfig.provider,
      modelName: providerConfig.modelName,
      apiKey,
      imageMimeType: image.type,
      imageBase64,
      timeoutMs: 30000,
    });

    if (!result.ok) {
      await prisma.receiptOcrJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          latencyMs: result.latencyMs,
        },
      });
      await prisma.auditLog.create({
        data: {
          workspaceId: workspace.id,
          actorUserId: userId,
          action: 'expense.receipt_ocr.failed',
          targetType: 'ReceiptOcrJob',
          targetId: job.id,
          metadata: {
            provider: providerConfig.provider,
            modelName: providerConfig.modelName,
            errorCode: result.errorCode,
          },
        },
      });
      revalidateExpense(slug);
      return { ok: false, jobId: job.id, error: result.errorMessage };
    }

    await prisma.receiptOcrJob.update({
      where: { id: job.id },
      data: {
        status: 'SUCCESS',
        extractedData: result.data as unknown as Prisma.InputJsonObject,
        latencyMs: result.latencyMs,
      },
    });
    await prisma.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorUserId: userId,
        action: 'expense.receipt_ocr.success',
        targetType: 'ReceiptOcrJob',
        targetId: job.id,
        metadata: {
          provider: providerConfig.provider,
          modelName: providerConfig.modelName,
          latencyMs: result.latencyMs,
          confidence: result.data.confidence,
        },
      },
    });
    revalidateExpense(slug);
    return { ok: true, jobId: job.id, data: result.data };
  } catch (error) {
    const message = normalizeActionError(error);
    await prisma.receiptOcrJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', errorCode: 'UNKNOWN', errorMessage: message },
    });
    revalidateExpense(slug);
    return { ok: false, jobId: job.id, error: message };
  }
}

export async function confirmReceiptExpenseAction(
  jobId: string,
  formData: FormData,
): Promise<{ ok: true; expenseId: string } | { ok: false; error: string }> {
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, role, userId } = await assertWorkspace(slug, 'MANAGER');
  if (!canCreateExpense(role)) {
    return { ok: false, error: '비용을 생성할 권한이 없습니다.' };
  }

  const job = await prisma.receiptOcrJob.findFirst({
    where: { id: jobId, workspaceId: workspace.id, createdById: userId },
  });
  if (!job) {
    return { ok: false, error: '영수증 OCR 작업을 찾을 수 없습니다.' };
  }

  const amountMinor = wonFromInput(formData.get('totalAmount'));
  if (amountMinor <= 0) {
    return { ok: false, error: '비용 금액을 입력해 주세요.' };
  }

  const vatInput = String(formData.get('taxAmount') ?? '').trim();
  const vatMinor = vatInput ? wonFromInput(vatInput) : computeVat10(amountMinor);
  const storeName = cleanString(formData.get('storeName'));
  const receiptDate = dateFromInput(formData.get('receiptDate'));
  const items = receiptItemsFromForm(formData);
  const memo = cleanString(formData.get('memo'));
  const title = cleanString(formData.get('title')) ?? `${storeName ?? '영수증'} 비용`;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          workspaceId: workspace.id,
          title,
          category: cleanString(formData.get('category')) ?? '영수증',
          expenseDate: receiptDate,
          currencyCode: 'KRW',
          amountMinor,
          vatMinor,
          vendorName: storeName,
          status: 'PENDING_APPROVAL',
          memo,
          createdById: userId,
        },
      });

      await tx.expenseAttachment.create({
        data: {
          workspaceId: workspace.id,
          expenseId: expense.id,
          fileName: `receipt-${job.id}.base64`,
          fileUrl: `receipt-ocr:${job.id}`,
          fileSize: job.imageBytes,
          mimeType: job.imageMimeType,
          ocrStatus: 'DONE',
          ocrJson: {
            jobId: job.id,
            provider: job.provider,
            modelName: job.modelName,
            extractedData: job.extractedData,
            confirmedItems: items,
          } as Prisma.InputJsonObject,
        },
      });

      await tx.receiptOcrJob.update({
        where: { id: job.id },
        data: { expenseId: expense.id },
      });

      await tx.auditLog.create({
        data: {
          workspaceId: workspace.id,
          actorUserId: userId,
          action: 'expense.receipt_ocr.confirm',
          targetType: 'Expense',
          targetId: expense.id,
          metadata: { jobId: job.id, amountMinor, itemCount: items.length },
        },
      });

      return expense;
    });

    revalidateExpense(slug);
    return { ok: true, expenseId: result.id };
  } catch (error) {
    return { ok: false, error: normalizeActionError(error) };
  }
}
