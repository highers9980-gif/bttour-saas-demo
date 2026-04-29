import { prisma, Prisma } from '@bttour/db';
import type { HermesJobMetadata, MonthlyInsightAutoMetadata } from '@bttour/shared';
import { generateMonthlyInsightCore, periodLabel } from '@/lib/insights/generate';

interface SupervisorJobResult {
  workflow: 'MONTHLY_INSIGHT_AUTO';
  workspaceId: string;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  jobId?: string;
  insightId?: string;
  errorMessage?: string;
}

interface KstParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function kstParts(now: Date): KstParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
  };
}

function previousMonth({ month, year }: Pick<KstParts, 'month' | 'year'>) {
  if (month === 1) return { periodYear: year - 1, periodMonth: 12 };
  return { periodYear: year, periodMonth: month - 1 };
}

function shouldRunMonthlyInsightAuto(now: Date) {
  const parts = kstParts(now);
  return parts.day === 1 && parts.hour === 5 && parts.minute <= 30;
}

async function writeHermesAudit({
  action,
  metadata,
  targetId,
  workspaceId,
}: {
  action: 'hermes.cron.fired' | 'hermes.workflow.completed' | 'hermes.workflow.failed';
  metadata?: Prisma.InputJsonObject;
  targetId?: string;
  workspaceId?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      workspaceId,
      actorUserId: null,
      action,
      targetType: targetId ? 'HermesJob' : 'HermesSupervisor',
      targetId,
      metadata: metadata as Prisma.InputJsonObject,
    },
  });
}

function metadataJson(metadata: HermesJobMetadata): Prisma.InputJsonObject {
  return metadata as unknown as Prisma.InputJsonObject;
}

async function findSystemActor(workspaceId: string) {
  // OWNER 우선 검색, 없으면 ADMIN으로 fallback.
  // role: 'asc'는 알파벳 순서라 ADMIN(A)이 OWNER(O)보다 먼저 매칭되는 문제를
  // 회피하기 위해 분리 쿼리로 명시적 우선순위 보장.
  const owner = await prisma.membership.findFirst({
    where: { workspaceId, status: 'ACTIVE', role: 'OWNER' },
    orderBy: { createdAt: 'asc' },
    select: { userId: true },
  });
  if (owner) return owner;
  return prisma.membership.findFirst({
    where: { workspaceId, status: 'ACTIVE', role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
    select: { userId: true },
  });
}

async function runMonthlyInsightForWorkspace({
  periodMonth,
  periodYear,
  scheduledAt,
  workspaceId,
}: {
  periodMonth: number;
  periodYear: number;
  scheduledAt: Date;
  workspaceId: string;
}): Promise<SupervisorJobResult> {
  const pendingMetadata: MonthlyInsightAutoMetadata = {
    workflow: 'MONTHLY_INSIGHT_AUTO',
    periodYear,
    periodMonth,
    periodLabel: periodLabel(periodYear, periodMonth),
  };
  const job = await prisma.hermesJob.create({
    data: {
      workspaceId,
      workflow: 'MONTHLY_INSIGHT_AUTO',
      status: 'PENDING',
      scheduledAt,
      metadata: metadataJson(pendingMetadata),
    },
  });

  await prisma.hermesJob.update({
    where: { id: job.id },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  const actor = await findSystemActor(workspaceId);
  if (!actor) {
    const errorMessage = '워크스페이스 OWNER 또는 ADMIN 사용자를 찾을 수 없습니다.';
    await prisma.hermesJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorCode: 'SYSTEM_ACTOR_NOT_FOUND',
        errorMessage,
      },
    });
    await writeHermesAudit({
      action: 'hermes.workflow.failed',
      targetId: job.id,
      workspaceId,
      metadata: { ...pendingMetadata, errorMessage },
    });
    return {
      workflow: 'MONTHLY_INSIGHT_AUTO',
      workspaceId,
      status: 'FAILED',
      jobId: job.id,
      errorMessage,
    };
  }

  const result = await generateMonthlyInsightCore({
    workspaceId,
    periodYear,
    periodMonth,
    actorUserId: actor.userId,
    mode: 'SYSTEM',
  });

  if (!result.ok) {
    const failedMetadata: MonthlyInsightAutoMetadata = {
      ...pendingMetadata,
      insightId: result.insightId,
      errorMessage: result.error,
    };
    await prisma.hermesJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        recordsProcessed: 0,
        errorCode: result.errorCode ?? 'UNKNOWN',
        errorMessage: result.error,
        metadata: metadataJson(failedMetadata),
      },
    });
    await writeHermesAudit({
      action: 'hermes.workflow.failed',
      targetId: job.id,
      workspaceId,
      metadata: metadataJson(failedMetadata),
    });
    return {
      workflow: 'MONTHLY_INSIGHT_AUTO',
      workspaceId,
      status: 'FAILED',
      jobId: job.id,
      insightId: result.insightId,
      errorMessage: result.error,
    };
  }

  const successMetadata: MonthlyInsightAutoMetadata = {
    ...pendingMetadata,
    insightId: result.insightId,
    provider: result.provider,
    modelName: result.modelName,
    latencyMs: result.latencyMs,
  };
  await prisma.hermesJob.update({
    where: { id: job.id },
    data: {
      status: 'SUCCESS',
      completedAt: new Date(),
      recordsProcessed: 1,
      metadata: metadataJson(successMetadata),
    },
  });
  await writeHermesAudit({
    action: 'hermes.workflow.completed',
    targetId: job.id,
    workspaceId,
    metadata: metadataJson(successMetadata),
  });

  return {
    workflow: 'MONTHLY_INSIGHT_AUTO',
    workspaceId,
    status: 'SUCCESS',
    jobId: job.id,
    insightId: result.insightId,
  };
}

async function runInBatches<T, R>(items: T[], size: number, worker: (item: T) => Promise<R>) {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += size) {
    const batch = items.slice(index, index + size);
    const settled = await Promise.allSettled(batch.map(worker));
    settled.forEach((entry, batchIndex) => {
      if (entry.status === 'fulfilled') {
        results.push(entry.value);
        return;
      }
      const item = batch[batchIndex] as { workspaceId?: string };
      results.push({
        workflow: 'MONTHLY_INSIGHT_AUTO',
        workspaceId: item.workspaceId ?? 'unknown',
        status: 'FAILED',
        errorMessage: entry.reason instanceof Error ? entry.reason.message : String(entry.reason),
      } as R);
    });
  }
  return results;
}

export async function runHermesSupervisor(now = new Date()) {
  const parts = kstParts(now);
  const workflows: string[] = [];
  const jobs: SupervisorJobResult[] = [];

  await writeHermesAudit({
    action: 'hermes.cron.fired',
    metadata: {
      firedAt: now.toISOString(),
      kst: parts as unknown as Prisma.InputJsonObject,
    },
  });

  if (shouldRunMonthlyInsightAuto(now)) {
    workflows.push('MONTHLY_INSIGHT_AUTO');
    const { periodYear, periodMonth } = previousMonth(parts);

    const settings = await prisma.workspaceAutomationSettings.findMany({
      where: {
        monthlyInsightAutoEnabled: true,
        workspace: { deletedAt: null },
      },
      select: { workspaceId: true },
    });

    const runnableSettings = [];
    for (const setting of settings) {
      const existingSuccess = await prisma.monthlyInsight.findFirst({
        where: {
          workspaceId: setting.workspaceId,
          periodYear,
          periodMonth,
          status: 'SUCCESS',
        },
        select: { id: true },
      });
      if (!existingSuccess) runnableSettings.push(setting);
    }

    jobs.push(
      ...(await runInBatches(runnableSettings, 5, (setting) =>
        runMonthlyInsightForWorkspace({
          workspaceId: setting.workspaceId,
          periodYear,
          periodMonth,
          scheduledAt: now,
        }),
      )),
    );
  }

  return {
    ok: true,
    firedAt: now.toISOString(),
    kst: parts,
    workflows,
    jobs,
  };
}
