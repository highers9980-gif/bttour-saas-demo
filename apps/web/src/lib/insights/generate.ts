import { prisma, Prisma } from '@bttour/db';
import { decryptApiKey, generateMonthlyInsight } from '@bttour/shared';
import { collectStatistics } from '@/lib/insights/collect-statistics';

export type GenerateMonthlyInsightCoreResult =
  | {
      ok: true;
      insightId: string;
      summaryMarkdown: string;
      latencyMs: number;
      provider: string;
      modelName: string;
    }
  | {
      ok: false;
      error: string;
      errorCode?: string;
      insightId?: string;
      latencyMs?: number;
    };

export interface GenerateMonthlyInsightCoreInput {
  workspaceId: string;
  periodYear: number;
  periodMonth: number;
  actorUserId: string;
  mode: 'USER' | 'SYSTEM';
}

export function periodLabel(year: number, month: number) {
  return `${year}년 ${month}월`;
}

export function normalizeMonthlyInsightError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  if (/AI_KEY_ENCRYPTION_SECRET/.test(raw)) {
    return 'AI 키 암호화 환경변수가 설정되지 않았습니다. 운영 환경변수를 확인해 주세요.';
  }
  return (
    raw
      .replace(/sk-[A-Za-z0-9_\-]+/g, '[REDACTED]')
      .replace(/AIza[0-9A-Za-z_\-]+/g, '[REDACTED]')
      .replace(/sk-ant-[A-Za-z0-9_\-]+/g, '[REDACTED]')
      .slice(0, 240) || '월말 인사이트 생성에 실패했습니다.'
  );
}

async function writeInsightAudit({
  action,
  errorMessage,
  insightId,
  metadata,
  userId,
  workspaceId,
}: {
  action: 'monthly_insight.generated' | 'monthly_insight.failed';
  errorMessage?: string;
  insightId: string;
  metadata?: Record<string, unknown>;
  userId: string;
  workspaceId: string;
}) {
  await prisma.auditLog.create({
    data: {
      workspaceId,
      actorUserId: userId,
      action,
      targetType: 'MonthlyInsight',
      targetId: insightId,
      metadata: {
        ...(metadata ?? {}),
        ...(errorMessage ? { errorMessage } : {}),
      } as Prisma.InputJsonObject,
    },
  });
}

export async function generateMonthlyInsightCore({
  actorUserId,
  mode,
  periodMonth,
  periodYear,
  workspaceId,
}: GenerateMonthlyInsightCoreInput): Promise<GenerateMonthlyInsightCoreResult> {
  const [settings, providerConfig] = await Promise.all([
    prisma.workspaceAiSettings.findUnique({ where: { workspaceId } }),
    prisma.workspaceAiProviderConfig.findUnique({
      where: { workspaceId_role: { workspaceId, role: 'PRIMARY' } },
    }),
  ]);

  if (!settings?.enabled || !providerConfig) {
    return {
      ok: false,
      error: '설정 > AI에서 키를 등록하고 활성화해 주세요.',
      errorCode: 'AI_NOT_CONFIGURED',
    };
  }

  const insight = await prisma.monthlyInsight.create({
    data: {
      workspaceId,
      periodYear,
      periodMonth,
      status: 'GENERATING',
      createdById: actorUserId,
    },
  });

  try {
    const statistics = await collectStatistics({
      workspaceId,
      periodYear,
      periodMonth,
    });

    await prisma.monthlyInsight.update({
      where: { id: insight.id },
      data: { statisticsJson: statistics as unknown as Prisma.InputJsonObject },
    });

    const apiKey = decryptApiKey({
      ciphertext: providerConfig.apiKeyCiphertext,
      iv: providerConfig.apiKeyIv,
      authTag: providerConfig.apiKeyAuthTag,
      encryptedDek: providerConfig.encryptedDek,
      dekKeyVersion: providerConfig.dekKeyVersion,
    });

    const result = await generateMonthlyInsight({
      provider: providerConfig.provider,
      modelName: providerConfig.modelName,
      apiKey,
      statistics,
      timeoutMs: 30000,
    });

    if (!result.ok) {
      await prisma.monthlyInsight.update({
        where: { id: insight.id },
        data: {
          status: 'FAILED',
          statisticsJson: statistics as unknown as Prisma.InputJsonObject,
          provider: providerConfig.provider,
          modelName: providerConfig.modelName,
          keyVersion: providerConfig.apiKeyVersion,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          latencyMs: result.latencyMs,
        },
      });
      await writeInsightAudit({
        action: 'monthly_insight.failed',
        errorMessage: result.errorMessage,
        insightId: insight.id,
        userId: actorUserId,
        workspaceId,
        metadata: {
          mode,
          periodLabel: periodLabel(periodYear, periodMonth),
          provider: providerConfig.provider,
          modelName: providerConfig.modelName,
          totalRevenue: statistics.revenue.totalMinor,
          latencyMs: result.latencyMs,
        },
      });
      return {
        ok: false,
        error: result.errorMessage,
        errorCode: result.errorCode,
        insightId: insight.id,
        latencyMs: result.latencyMs,
      };
    }

    await prisma.monthlyInsight.update({
      where: { id: insight.id },
      data: {
        status: 'SUCCESS',
        statisticsJson: statistics as unknown as Prisma.InputJsonObject,
        summaryMarkdown: result.summaryMarkdown,
        provider: providerConfig.provider,
        modelName: providerConfig.modelName,
        keyVersion: providerConfig.apiKeyVersion,
        latencyMs: result.latencyMs,
      },
    });
    await writeInsightAudit({
      action: 'monthly_insight.generated',
      insightId: insight.id,
      userId: actorUserId,
      workspaceId,
      metadata: {
        mode,
        periodLabel: periodLabel(periodYear, periodMonth),
        provider: providerConfig.provider,
        modelName: providerConfig.modelName,
        totalRevenue: statistics.revenue.totalMinor,
        latencyMs: result.latencyMs,
      },
    });

    return {
      ok: true,
      insightId: insight.id,
      summaryMarkdown: result.summaryMarkdown,
      latencyMs: result.latencyMs,
      provider: providerConfig.provider,
      modelName: providerConfig.modelName,
    };
  } catch (error) {
    const message = normalizeMonthlyInsightError(error);
    await prisma.monthlyInsight.update({
      where: { id: insight.id },
      data: { status: 'FAILED', errorCode: 'UNKNOWN', errorMessage: message },
    });
    await writeInsightAudit({
      action: 'monthly_insight.failed',
      errorMessage: message,
      insightId: insight.id,
      userId: actorUserId,
      workspaceId,
      metadata: { mode, periodLabel: periodLabel(periodYear, periodMonth) },
    });
    return { ok: false, error: message, errorCode: 'UNKNOWN', insightId: insight.id };
  }
}
