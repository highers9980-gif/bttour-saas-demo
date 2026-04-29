'use server';

import { prisma, Prisma } from '@bttour/db';
import { canExportData, computeVat10 } from '@bttour/shared';
import { renderToBuffer } from '@react-pdf/renderer';
import { revalidatePath } from 'next/cache';
import { createElement, type ReactElement } from 'react';
import { assertWorkspace } from '@/lib/workspace-guard';
import { GuideSettlementPdf, type GuideSettlementPdfData } from '@/lib/pdf/guide-settlement';

export type GenerateGuideSettlementPdfResult =
  | { ok: true; fileName: string; base64: string }
  | { ok: false; error: string };

function parseDateInput(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error('기간을 YYYY-MM-DD 형식으로 입력해 주세요.');
  }
  return {
    label: text,
    date: new Date(`${text}T00:00:00.000Z`),
  };
}

function monthKeysBetween(start: Date, end: Date) {
  const keys: Array<{ periodYear: number; periodMonth: number }> = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const endCursor = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  while (cursor <= endCursor) {
    keys.push({
      periodYear: cursor.getUTCFullYear(),
      periodMonth: cursor.getUTCMonth() + 1,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

function dateLabel(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthLabel(date: Date) {
  return date.toISOString().slice(0, 7).replace('-', '');
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '');
}

function normalizeError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  return raw.slice(0, 240) || '정산서 PDF 생성에 실패했습니다.';
}

async function writePdfAuditLog({
  action,
  errorMessage,
  jobId,
  metadata,
  userId,
  workspaceId,
}: {
  action: 'settlement.pdf.generated' | 'settlement.pdf.failed';
  errorMessage?: string;
  jobId: string;
  metadata?: Record<string, unknown>;
  userId: string;
  workspaceId: string;
}) {
  await prisma.auditLog.create({
    data: {
      workspaceId,
      actorUserId: userId,
      action,
      targetType: 'SettlementPdfJob',
      targetId: jobId,
      metadata: {
        ...(metadata ?? {}),
        ...(errorMessage ? { errorMessage } : {}),
      } as Prisma.InputJsonObject,
    },
  });
}

export async function generateGuideSettlementPdfAction(
  slug: string,
  formData: FormData,
): Promise<GenerateGuideSettlementPdfResult> {
  const startedAt = Date.now();
  const { workspace, role, user, userId } = await assertWorkspace(slug, 'VIEWER');

  if (!canExportData(role)) {
    return { ok: false, error: '정산서를 내보낼 권한이 없습니다.' };
  }

  const guideId = String(formData.get('guideId') ?? '').trim();
  const periodStart = parseDateInput(formData.get('periodStart'));
  const periodEnd = parseDateInput(formData.get('periodEnd'));

  if (!guideId) {
    return { ok: false, error: '가이드를 선택해 주세요.' };
  }
  if (periodStart.date > periodEnd.date) {
    return { ok: false, error: '시작일은 종료일보다 늦을 수 없습니다.' };
  }

  const initialFileName = `정산서_GUIDE_${monthLabel(periodStart.date)}.pdf`;
  const job = await prisma.settlementPdfJob.create({
    data: {
      workspaceId: workspace.id,
      type: 'GUIDE',
      status: 'GENERATING',
      guideId,
      periodStart: periodStart.date,
      periodEnd: periodEnd.date,
      fileName: initialFileName,
      createdById: userId,
    },
  });

  try {
    const [freshWorkspace, guide] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: workspace.id } }),
      prisma.guide.findFirst({
        where: { id: guideId, workspaceId: workspace.id, deletedAt: null },
      }),
    ]);

    if (!freshWorkspace) throw new Error('워크스페이스를 찾을 수 없습니다.');
    if (!guide) throw new Error('가이드를 찾을 수 없습니다.');

    const monthKeys = monthKeysBetween(periodStart.date, periodEnd.date);
    const settlements = await prisma.guideSettlement.findMany({
      where: {
        workspaceId: workspace.id,
        deletedAt: null,
        guideId,
        OR: monthKeys,
      },
      include: { team: { include: { partner: true } } },
      orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }, { createdAt: 'asc' }],
    });

    const rows = settlements.map((settlement) => ({
      date: settlement.team?.startDate
        ? dateLabel(settlement.team.startDate)
        : `${settlement.periodYear}-${String(settlement.periodMonth).padStart(2, '0')}-01`,
      teamLabel: settlement.team
        ? `#${settlement.team.teamNo} ${
            settlement.team.partner?.name ??
            settlement.team.partnerNameSnapshot ??
            settlement.team.agentLabel ??
            ''
          }`.trim()
        : (settlement.partnerNameSnapshot ?? '개별 정산'),
      amountMinor: settlement.totalWon,
      memo: settlement.memo,
    }));

    const totalMinor = rows.reduce((sum, row) => sum + row.amountMinor, 0);
    const vatMinor = computeVat10(totalMinor);
    const pdfData: GuideSettlementPdfData = {
      workspace: {
        name: freshWorkspace.bizName ?? freshWorkspace.name,
        businessNumber: freshWorkspace.bizNumber,
        representative: freshWorkspace.bizCeo,
        address: freshWorkspace.bizAddr,
        phone: freshWorkspace.bizPhone,
      },
      guide: {
        name: guide.name,
        phone: guide.phone,
        bankAccount: guide.memo?.match(/계좌[:：]\s*([^\n]+)/)?.[1]?.trim() ?? null,
      },
      period: { start: periodStart.label, end: periodEnd.label },
      rows,
      summary: {
        totalMinor,
        vatMinor,
        netMinor: Math.max(totalMinor - vatMinor, 0),
      },
      issuedAt: dateLabel(new Date()),
      issuedBy: user.name ?? user.email,
    };

    const pdfDocument = createElement(GuideSettlementPdf, {
      data: pdfData,
    }) as unknown as ReactElement;
    const buffer = await renderToBuffer(pdfDocument);
    const fileName = `정산서_${sanitizeFileName(guide.name)}_${monthLabel(periodStart.date)}.pdf`;
    const latencyMs = Date.now() - startedAt;

    await prisma.settlementPdfJob.update({
      where: { id: job.id },
      data: {
        status: 'SUCCESS',
        fileName,
        fileSizeBytes: buffer.length,
        pageCount: 1,
        latencyMs,
      },
    });
    await writePdfAuditLog({
      action: 'settlement.pdf.generated',
      jobId: job.id,
      userId,
      workspaceId: workspace.id,
      metadata: {
        type: 'GUIDE',
        guideId,
        fileName,
        rowCount: rows.length,
        totalMinor,
        latencyMs,
      },
    });

    revalidatePath(`/w/${slug}/guide-settlement`);
    return { ok: true, fileName, base64: Buffer.from(buffer).toString('base64') };
  } catch (error) {
    const errorMessage = normalizeError(error);
    const latencyMs = Date.now() - startedAt;
    await prisma.settlementPdfJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        errorMessage,
        latencyMs,
      },
    });
    await writePdfAuditLog({
      action: 'settlement.pdf.failed',
      errorMessage,
      jobId: job.id,
      userId,
      workspaceId: workspace.id,
      metadata: { type: 'GUIDE', guideId, latencyMs },
    });

    return { ok: false, error: errorMessage };
  }
}
