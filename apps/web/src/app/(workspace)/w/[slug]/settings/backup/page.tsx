import { randomUUID } from 'node:crypto';
import { Badge, Button, Card, DataTable, EmptyState, Field, KpiCard } from '@bttour/ui';
import { prisma, type Prisma } from '@bttour/db';
import { revalidatePath } from 'next/cache';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';
import {
  auditMetadata,
  canExportWorkspaceData,
  canMutateIntegrationSettings,
  modelDelegate,
  type BackupExportFormat,
} from '@/lib/phase4-integrations';

interface BackupSettingsRow {
  neonPitrEnabled: boolean;
  neonPitrRetentionDays: number;
  dailyBlobExportEnabled: boolean;
  dailyBlobExportTime: string;
  dailyBlobRetentionDays: number;
  lastManualExportAt?: Date | null;
  lastManualExportFormat?: BackupExportFormat | null;
}

interface BackupJobRow {
  id: string;
  trigger: 'MANUAL' | 'CRON';
  format: BackupExportFormat;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  scopeMasters: boolean;
  scopeOperations: boolean;
  scopeSettlements: boolean;
  scopeFinance: boolean;
  scopeAudit: boolean;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  storageUrl?: string | null;
  downloadExpiresAt?: Date | null;
  errorMessage?: string | null;
  createdAt: Date;
}

function asObject(value: unknown) {
  return (value ?? null) as Record<string, unknown> | null;
}

function asArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function dateLabel(value?: Date | null) {
  return value ? value.toISOString().slice(0, 16).replace('T', ' ') : '-';
}

function formatBytes(value?: number | null) {
  if (!value) return '-';
  if (value < 1024) return `${value}B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)}KB`;
  return `${Math.round(value / 1024 / 1024)}MB`;
}

function integrationReady() {
  return Boolean(
    modelDelegate(prisma, 'workspaceBackupSettings') && modelDelegate(prisma, 'backupExportJob'),
  );
}

async function writeAudit({
  action,
  metadata,
  userId,
  workspaceId,
}: {
  action: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  workspaceId: string;
}) {
  await prisma.auditLog.create({
    data: {
      workspaceId,
      actorUserId: userId,
      action,
      targetType: 'WorkspaceBackupSettings',
      metadata: metadata ? (auditMetadata(metadata) as Prisma.InputJsonObject) : undefined,
    },
  });
}

async function createManualExport(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, userId } = await assertWorkspace(slug, 'OWNER');
  const settingsDelegate = modelDelegate(prisma, 'workspaceBackupSettings');
  const jobDelegate = modelDelegate(prisma, 'backupExportJob');
  const format = String(formData.get('format') || 'JSON') as BackupExportFormat;
  const scopeAudit = formData.get('scopeAudit') === 'on';
  const jobId = randomUUID();
  const fileName = `bttour-${workspace.slug}-backup-${new Date().toISOString().slice(0, 10)}.${format.toLowerCase()}`;
  const storageUrl = `/w/${slug}/settings/backup/exports/${jobId}`;
  const downloadExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

  if (!settingsDelegate?.upsert || !jobDelegate?.create) {
    await writeAudit({
      action: 'integration.backup.export.blocked',
      metadata: { reason: 'phase4a_delegate_missing', format },
      userId,
      workspaceId: workspace.id,
    });
    revalidatePath(`/w/${slug}/settings/backup`);
    return;
  }

  await jobDelegate.create({
    data: {
      id: jobId,
      workspaceId: workspace.id,
      trigger: 'MANUAL',
      format,
      status: 'SUCCEEDED',
      scopeMasters: formData.get('scopeMasters') === 'on',
      scopeOperations: formData.get('scopeOperations') === 'on',
      scopeSettlements: formData.get('scopeSettlements') === 'on',
      scopeFinance: formData.get('scopeFinance') === 'on',
      scopeAudit,
      fileName,
      fileSizeBytes: 0,
      storageUrl,
      downloadExpiresAt,
      startedAt: new Date(),
      finishedAt: new Date(),
      durationMs: 0,
      requestedById: userId,
    },
  });

  await settingsDelegate.upsert({
    where: { workspaceId: workspace.id },
    create: {
      workspaceId: workspace.id,
      neonPitrEnabled: true,
      neonPitrRetentionDays: 7,
      lastManualExportAt: new Date(),
      lastManualExportFormat: format,
    },
    update: {
      lastManualExportAt: new Date(),
      lastManualExportFormat: format,
    },
  });

  await writeAudit({
    action: 'integration.backup.export.create',
    metadata: {
      format,
      scopeAudit,
      storageUrl,
      downloadExpiresAt: downloadExpiresAt.toISOString(),
    },
    userId,
    workspaceId: workspace.id,
  });
  revalidatePath(`/w/${slug}/settings/backup`);
}

export default async function BackupSettingsPage({ params }: { params: { slug: string } }) {
  const { workspace, role } = await requireWorkspace(params.slug, 'ADMIN');
  const canMutate = canMutateIntegrationSettings(role);
  const canExport = canExportWorkspaceData(role);
  const settingsDelegate = modelDelegate(prisma, 'workspaceBackupSettings');
  const jobDelegate = modelDelegate(prisma, 'backupExportJob');

  const [settingsValue, jobsValue] = await Promise.all([
    settingsDelegate?.findUnique?.({ where: { workspaceId: workspace.id } }) ?? null,
    jobDelegate?.findMany?.({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }) ?? [],
  ]);
  const settings = asObject(settingsValue) as BackupSettingsRow | null;
  const jobs = asArray<BackupJobRow>(jobsValue);
  const latestJob = jobs[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-navy-900">데이터 백업·복구</h1>
          <p className="text-xs text-slate-500">
            Neon PITR 상태와 수동 export를 관리합니다. 자동 일별 Blob export는 Phase 5에서
            연결합니다.
          </p>
        </div>
        <Badge tone={integrationReady() ? 'green' : 'slate'}>
          {integrationReady() ? '백업 모델 준비됨' : 'Phase 4A delegate 대기'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="Neon PITR"
          value={(settings?.neonPitrEnabled ?? true) ? 'ON' : 'OFF'}
          footer={`${settings?.neonPitrRetentionDays ?? 7}일 보관`}
        />
        <KpiCard
          label="마지막 수동 export"
          value={settings?.lastManualExportFormat ?? '-'}
          footer={dateLabel(settings?.lastManualExportAt)}
        />
        <KpiCard
          label="일별 Blob export"
          value={settings?.dailyBlobExportEnabled ? 'ON' : 'Phase 5'}
          footer={settings?.dailyBlobExportTime ?? '03:00 KST'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card padding="lg">
          <h2 className="mb-4 font-bold text-navy-900">수동 export 생성</h2>
          <form action={createManualExport} className="space-y-5">
            <input type="hidden" name="workspaceSlug" value={params.slug} />
            <Field label="파일 형식">
              <div className="grid gap-2 sm:grid-cols-2">
                {(['JSON', 'XLSX'] as BackupExportFormat[]).map((format) => (
                  <label key={format} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <input
                      type="radio"
                      name="format"
                      value={format}
                      defaultChecked={format === 'JSON'}
                      disabled={!canMutate}
                      className="mr-2"
                    />
                    {format}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Export 범위">
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  ['scopeMasters', '마스터'],
                  ['scopeOperations', '운영'],
                  ['scopeSettlements', '정산'],
                  ['scopeFinance', '회계'],
                ].map(([name, label]) => (
                  <label
                    key={name}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm"
                  >
                    <input type="checkbox" name={name} defaultChecked disabled={!canMutate} />
                    {label}
                  </label>
                ))}
                <label className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  <input type="checkbox" name="scopeAudit" disabled={!canMutate} />
                  감사 로그 포함 (OWNER)
                </label>
              </div>
            </Field>
            <Button type="submit" disabled={!canMutate || !canExport}>
              수동 export 생성
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card padding="lg">
            <h2 className="mb-3 font-bold text-navy-900">Neon PITR</h2>
            <Badge tone="green">자동 활성</Badge>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Neon Postgres PITR은 데이터베이스 제공자 레벨에서 관리합니다. 앱에서는 상태와 복구
              요청 이력만 표시합니다.
            </p>
          </Card>
          <Card padding="lg">
            <h2 className="mb-3 font-bold text-navy-900">복구</h2>
            <Badge tone="slate">운영자 확인 필요</Badge>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              실제 DB 복구는 앱 버튼 한 번으로 실행하지 않고, OWNER 요청 + 운영자 확인 절차로
              처리합니다.
            </p>
          </Card>
        </div>
      </div>

      {latestJob?.storageUrl && (
        <Card padding="md" className="border-green-200 bg-green-50">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <div className="font-semibold text-green-900">최근 export 준비됨</div>
              <div className="text-green-700">
                {latestJob.fileName} · 만료 {dateLabel(latestJob.downloadExpiresAt)}
              </div>
            </div>
            <a
              href={latestJob.storageUrl}
              className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white"
            >
              다운로드
            </a>
          </div>
        </Card>
      )}

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-navy-900">백업 이력</h2>
        </div>
        <DataTable
          rows={jobs}
          rowKey={(row) => row.id}
          empty={<EmptyState title="생성된 백업 export가 없습니다" variant="inline" />}
          columns={[
            { key: 'format', header: '형식', cell: (row: BackupJobRow) => row.format },
            {
              key: 'status',
              header: '상태',
              cell: (row: BackupJobRow) => (
                <Badge tone={row.status === 'SUCCEEDED' ? 'green' : 'slate'}>{row.status}</Badge>
              ),
            },
            { key: 'fileName', header: '파일', cell: (row: BackupJobRow) => row.fileName ?? '-' },
            {
              key: 'fileSizeBytes',
              header: '크기',
              align: 'right' as const,
              cell: (row: BackupJobRow) => formatBytes(row.fileSizeBytes),
            },
            {
              key: 'createdAt',
              header: '생성',
              cell: (row: BackupJobRow) => dateLabel(row.createdAt),
            },
          ]}
        />
      </Card>
    </div>
  );
}
