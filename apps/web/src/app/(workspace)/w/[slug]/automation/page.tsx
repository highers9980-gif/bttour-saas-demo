import { Badge, Button, Card, DataTable, EmptyState, KpiCard } from '@bttour/ui';
import { canMutateIntegrationSettings } from '@bttour/shared';
import { prisma, type Prisma } from '@bttour/db';
import { revalidatePath } from 'next/cache';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';

function dateLabel(value?: Date | null) {
  return value ? value.toISOString().slice(0, 16).replace('T', ' ') : '-';
}

function jsonPreview(value: Prisma.JsonValue | null | undefined) {
  if (!value) return '-';
  const text = JSON.stringify(value);
  return text.length > 90 ? `${text.slice(0, 90)}...` : text;
}

function statusTone(status: string) {
  if (status === 'SUCCESS') return 'green' as const;
  if (status === 'FAILED') return 'red' as const;
  if (status === 'RUNNING') return 'amber' as const;
  if (status === 'CANCELLED') return 'slate' as const;
  return 'blue' as const;
}

async function updateAutomationSettingsAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, role, userId } = await assertWorkspace(slug, 'OWNER');

  if (!canMutateIntegrationSettings(role)) {
    throw new Error('자동화 설정을 변경할 권한이 없습니다.');
  }

  const monthlyInsightAutoEnabled = formData.get('monthlyInsightAutoEnabled') === 'on';

  await prisma.workspaceAutomationSettings.upsert({
    where: { workspaceId: workspace.id },
    create: {
      workspaceId: workspace.id,
      monthlyInsightAutoEnabled,
      scheduleChangeNotifyEnabled: false,
      receivableReminderAutoEnabled: false,
      updatedById: userId,
    },
    update: {
      monthlyInsightAutoEnabled,
      updatedById: userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      actorUserId: userId,
      action: 'hermes.automation_settings.updated',
      targetType: 'WorkspaceAutomationSettings',
      targetId: workspace.id,
      metadata: {
        monthlyInsightAutoEnabled,
      } as Prisma.InputJsonObject,
    },
  });

  revalidatePath(`/w/${slug}/automation`);
}

export default async function AutomationPage({ params }: { params: { slug: string } }) {
  const { workspace, role } = await requireWorkspace(params.slug, 'VIEWER');
  const canMutateAutomation = canMutateIntegrationSettings(role);

  const [settings, jobs, changeLogs] = await Promise.all([
    prisma.workspaceAutomationSettings.findUnique({ where: { workspaceId: workspace.id } }),
    prisma.hermesJob.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.scheduleChangeLog.findMany({
      where: { workspaceId: workspace.id },
      include: { changedBy: true },
      orderBy: { changedAt: 'desc' },
      take: 20,
    }),
  ]);

  const jobColumns = [
    {
      key: 'workflow',
      header: '워크플로',
      cell: (job: (typeof jobs)[number]) => job.workflow,
    },
    {
      key: 'status',
      header: '상태',
      cell: (job: (typeof jobs)[number]) => (
        <Badge tone={statusTone(job.status)}>{job.status}</Badge>
      ),
    },
    {
      key: 'scheduledAt',
      header: '예약시각',
      cell: (job: (typeof jobs)[number]) => dateLabel(job.scheduledAt),
    },
    {
      key: 'completedAt',
      header: '완료시각',
      cell: (job: (typeof jobs)[number]) => dateLabel(job.completedAt),
    },
    {
      key: 'metadata',
      header: '결과',
      cell: (job: (typeof jobs)[number]) => (
        <span className="block max-w-md truncate text-xs text-slate-500">
          {job.errorMessage ?? jsonPreview(job.metadata)}
        </span>
      ),
    },
  ];

  const logColumns = [
    {
      key: 'changedAt',
      header: '시간',
      cell: (log: (typeof changeLogs)[number]) => dateLabel(log.changedAt),
    },
    {
      key: 'changeType',
      header: '변경유형',
      cell: (log: (typeof changeLogs)[number]) => <Badge tone="blue">{log.changeType}</Badge>,
    },
    {
      key: 'changedBy',
      header: '작성자',
      cell: (log: (typeof changeLogs)[number]) =>
        log.changedBy.name ?? log.changedBy.email ?? log.changedById,
    },
    {
      key: 'memo',
      header: '메모',
      cell: (log: (typeof changeLogs)[number]) => (
        <span className="block max-w-md truncate text-xs text-slate-500">
          {jsonPreview(log.afterData ?? log.beforeData)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-navy-900">Hermes Supervisor</h1>
          <p className="text-xs text-slate-500">
            Cron 기반 자동화 작업과 일정 변경 감지 로그를 관리합니다.
          </p>
        </div>
        <Badge tone={canMutateAutomation ? 'green' : 'slate'}>
          {canMutateAutomation ? 'OWNER 설정 가능' : '조회 전용'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <form action={updateAutomationSettingsAction} className="space-y-4">
            <input type="hidden" name="workspaceSlug" value={params.slug} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-navy-900">월말 인사이트 자동</h2>
                <p className="mt-1 text-xs text-slate-500">
                  매월 1일 KST 05:00에 전월 데이터를 분석합니다.
                </p>
              </div>
              <input
                type="checkbox"
                name="monthlyInsightAutoEnabled"
                defaultChecked={settings?.monthlyInsightAutoEnabled ?? false}
                disabled={!canMutateAutomation}
                className="mt-1 h-5 w-5 rounded border-slate-300"
              />
            </div>
            <Button type="submit" size="sm" disabled={!canMutateAutomation}>
              저장
            </Button>
          </form>
        </Card>

        <Card className="p-5 opacity-70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-navy-900">일정변경 알림</h2>
              <p className="mt-1 text-xs text-slate-500">
                변경 감지는 기록 중이며, 알림 발송은 Phase 4G-2에서 활성화합니다.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings?.scheduleChangeNotifyEnabled ?? false}
              disabled
              readOnly
              className="mt-1 h-5 w-5 rounded border-slate-300"
            />
          </div>
          <Badge tone="amber" className="mt-4">
            Phase 4G-2에서 활성화
          </Badge>
        </Card>

        <Card className="p-5 opacity-70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-navy-900">미수금 알림톡</h2>
              <p className="mt-1 text-xs text-slate-500">
                카카오 알림톡 셋업 후 자동 독촉 메시지를 연결합니다.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings?.receivableReminderAutoEnabled ?? false}
              disabled
              readOnly
              className="mt-1 h-5 w-5 rounded border-slate-300"
            />
          </div>
          <Badge tone="slate" className="mt-4">
            Phase 4E 이후
          </Badge>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="최근 Hermes Job"
          value={jobs.length}
          unit="건"
          footer={jobs[0] ? dateLabel(jobs[0].createdAt) : '아직 실행 이력 없음'}
        />
        <KpiCard
          label="성공"
          value={jobs.filter((job) => job.status === 'SUCCESS').length}
          unit="건"
          emoji="✅"
        />
        <KpiCard label="일정 변경 로그" value={changeLogs.length} unit="건" emoji="📝" />
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-navy-900">HermesJob 이력</h2>
        </div>
        <DataTable
          rows={jobs}
          columns={jobColumns}
          rowKey={(job) => job.id}
          empty={<EmptyState title="아직 HermesJob 이력이 없습니다" variant="inline" />}
        />
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-navy-900">ScheduleChangeLog 이력</h2>
        </div>
        <DataTable
          rows={changeLogs}
          columns={logColumns}
          rowKey={(log) => log.id}
          empty={<EmptyState title="아직 일정 변경 로그가 없습니다" variant="inline" />}
        />
      </Card>
    </div>
  );
}
