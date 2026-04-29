import { Badge, Button, Card, DataTable, EmptyState, Field, KpiCard, MobileCardList, TextField } from '@bttour/ui';
import { prisma, type Prisma } from '@bttour/db';
import { revalidatePath } from 'next/cache';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';
import {
  auditMetadata,
  canMutateIntegrationSettings,
  canTestIntegrationConnection,
  canViewIntegrationSettings,
  encryptSecret,
  modelDelegate,
  testProviderConnection,
  type AiProviderRole,
  type IntegrationProvider,
} from '@/lib/phase4-integrations';

type TestStatus = 'NOT_TESTED' | 'SUCCESS' | 'FAILED';

interface AiSettingsRow {
  enabled: boolean;
  allowSystemCreditFallback: boolean;
  lastTestStatus: TestStatus;
  lastTestProvider?: IntegrationProvider | null;
  lastTestedAt?: Date | null;
  lastTestMessage?: string | null;
  lastTestLatencyMs?: number | null;
}

interface ProviderConfigRow {
  id: string;
  role: AiProviderRole;
  provider: IntegrationProvider;
  modelName: string;
  apiKeyCiphertext: Buffer;
  apiKeyIv: Buffer;
  apiKeyAuthTag: Buffer;
  encryptedDek: Buffer;
  dekKeyVersion: number;
  apiKeyMasked: string;
  apiKeyVersion: number;
  keyUpdatedAt: Date;
}

interface AuditRow {
  id: string;
  action: string;
  actorUserId?: string | null;
  createdAt: Date;
}

const providerOptions: Array<{
  id: IntegrationProvider;
  label: string;
  description: string;
}> = [
  { id: 'OPENAI', label: 'OpenAI', description: 'GPT 계열 모델과 가장 넓은 도구 생태계' },
  { id: 'GEMINI', label: 'Gemini', description: '빠른 응답과 긴 컨텍스트 모델 운용' },
  { id: 'ANTHROPIC', label: 'Anthropic', description: 'Claude 계열 모델 연결 준비' },
];

function asObject(value: unknown) {
  return (value ?? null) as Record<string, unknown> | null;
}

function asArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function dateLabel(value?: Date | null) {
  return value ? value.toISOString().slice(0, 16).replace('T', ' ') : '-';
}

function roleLabel(role: AiProviderRole) {
  return role === 'PRIMARY' ? 'Primary' : 'Fallback';
}

function statusTone(status?: TestStatus | null) {
  if (status === 'SUCCESS') return 'green' as const;
  if (status === 'FAILED') return 'red' as const;
  return 'slate' as const;
}

function integrationReady() {
  return Boolean(
    modelDelegate(prisma, 'workspaceAiSettings') &&
    modelDelegate(prisma, 'workspaceAiProviderConfig'),
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
      targetType: 'WorkspaceIntegration',
      metadata: metadata ? (auditMetadata(metadata) as Prisma.InputJsonObject) : undefined,
    },
  });
}

async function saveAiProviderConfig(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, userId } = await assertWorkspace(slug, 'OWNER');
  const settingsDelegate = modelDelegate(prisma, 'workspaceAiSettings');
  const configDelegate = modelDelegate(prisma, 'workspaceAiProviderConfig');
  if (!settingsDelegate?.upsert || !configDelegate?.findUnique || !configDelegate?.upsert) {
    await writeAudit({
      action: 'integration.ai.save.blocked',
      metadata: { reason: 'phase4a_delegate_missing' },
      userId,
      workspaceId: workspace.id,
    });
    revalidatePath(`/w/${slug}/settings/ai`);
    return;
  }

  const role = String(formData.get('role') || 'PRIMARY') as AiProviderRole;
  const provider = String(formData.get('provider') || 'OPENAI') as IntegrationProvider;
  const modelName = String(formData.get('modelName') || '').trim();
  const apiKey = String(formData.get('apiKey') || '').trim();
  const enabled = formData.get('enabled') === 'on';
  const allowSystemCreditFallback = formData.get('allowSystemCreditFallback') === 'on';

  await settingsDelegate.upsert({
    where: { workspaceId: workspace.id },
    create: {
      workspaceId: workspace.id,
      enabled,
      enabledAt: enabled ? new Date() : null,
      allowSystemCreditFallback,
    },
    update: {
      enabled,
      enabledAt: enabled ? new Date() : null,
      allowSystemCreditFallback,
    },
  });

  const existing = asObject(
    await configDelegate.findUnique({
      where: { workspaceId_role: { workspaceId: workspace.id, role } },
    }),
  ) as ProviderConfigRow | null;

  if (!apiKey && !existing) {
    await writeAudit({
      action: 'integration.ai.provider.save.skipped',
      metadata: { role, provider, reason: 'api_key_required_for_new_config' },
      userId,
      workspaceId: workspace.id,
    });
    revalidatePath(`/w/${slug}/settings/ai`);
    return;
  }

  const encrypted = apiKey ? encryptSecret(apiKey) : null;
  const nextVersion = encrypted ? (existing?.apiKeyVersion ?? 0) + 1 : existing?.apiKeyVersion;
  const createEncrypted = encrypted ?? encryptSecret('__placeholder_never_returned__');

  await configDelegate.upsert({
    where: { workspaceId_role: { workspaceId: workspace.id, role } },
    create: {
      workspaceId: workspace.id,
      role,
      provider,
      modelName,
      apiKeyCiphertext: createEncrypted.ciphertext,
      apiKeyIv: createEncrypted.iv,
      apiKeyAuthTag: createEncrypted.authTag,
      encryptedDek: createEncrypted.encryptedDek,
      dekKeyVersion: createEncrypted.dekKeyVersion,
      apiKeyMasked: encrypted?.masked ?? '',
      apiKeyVersion: nextVersion ?? 1,
      keyUpdatedAt: new Date(),
    },
    update: {
      provider,
      modelName,
      ...(encrypted
        ? {
            apiKeyCiphertext: encrypted.ciphertext,
            apiKeyIv: encrypted.iv,
            apiKeyAuthTag: encrypted.authTag,
            encryptedDek: encrypted.encryptedDek,
            dekKeyVersion: encrypted.dekKeyVersion,
            apiKeyMasked: encrypted.masked,
            apiKeyVersion: nextVersion,
            keyUpdatedAt: new Date(),
          }
        : {}),
    },
  });

  await writeAudit({
    action: encrypted ? 'integration.ai.provider.rotate' : 'integration.ai.provider.update',
    metadata: { role, provider, modelName, apiKeyChanged: Boolean(encrypted) },
    userId,
    workspaceId: workspace.id,
  });
  revalidatePath(`/w/${slug}/settings/ai`);
}

async function deleteAiProviderConfig(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, userId } = await assertWorkspace(slug, 'OWNER');
  const role = String(formData.get('role') || 'PRIMARY') as AiProviderRole;
  const configDelegate = modelDelegate(prisma, 'workspaceAiProviderConfig');
  if (configDelegate?.delete) {
    await configDelegate.delete({
      where: { workspaceId_role: { workspaceId: workspace.id, role } },
    });
  }
  await writeAudit({
    action: 'integration.ai.provider.delete',
    metadata: { role },
    userId,
    workspaceId: workspace.id,
  });
  revalidatePath(`/w/${slug}/settings/ai`);
}

async function testAiConnection(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, userId } = await assertWorkspace(slug, 'ADMIN');
  const role = String(formData.get('role') || 'PRIMARY') as AiProviderRole;
  const settingsDelegate = modelDelegate(prisma, 'workspaceAiSettings');
  const configDelegate = modelDelegate(prisma, 'workspaceAiProviderConfig');
  const config = asObject(
    configDelegate?.findUnique
      ? await configDelegate.findUnique({
          where: { workspaceId_role: { workspaceId: workspace.id, role } },
        })
      : null,
  ) as ProviderConfigRow | null;
  const result = await testProviderConnection({
    encryptedKey: config
      ? {
          ciphertext: config.apiKeyCiphertext,
          iv: config.apiKeyIv,
          authTag: config.apiKeyAuthTag,
          encryptedDek: config.encryptedDek,
          dekKeyVersion: config.dekKeyVersion,
        }
      : null,
    modelName: config?.modelName ?? '',
    provider: config?.provider ?? 'OPENAI',
  });

  if (settingsDelegate?.upsert) {
    await settingsDelegate.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        lastTestedAt: new Date(),
        lastTestStatus: result.status,
        lastTestProvider: config?.provider ?? 'OPENAI',
        lastTestMessage: result.message,
        lastTestLatencyMs: result.latencyMs,
      },
      update: {
        lastTestedAt: new Date(),
        lastTestStatus: result.status,
        lastTestProvider: config?.provider ?? 'OPENAI',
        lastTestMessage: result.message,
        lastTestLatencyMs: result.latencyMs,
      },
    });
  }

  await writeAudit({
    action: 'integration.ai.connection_test',
    metadata: {
      role,
      provider: config?.provider ?? 'OPENAI',
      status: result.status,
      latencyMs: result.latencyMs,
    },
    userId,
    workspaceId: workspace.id,
  });
  revalidatePath(`/w/${slug}/settings/ai`);
}

function AiProviderCard({
  canMutate,
  config,
  role,
  workspaceSlug,
}: {
  canMutate: boolean;
  config?: ProviderConfigRow;
  role: AiProviderRole;
  workspaceSlug: string;
}) {
  return (
    <Card padding="lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-navy-900">{roleLabel(role)} Provider</h2>
          <p className="text-xs text-slate-500">provider, 모델명, BYO API 키를 저장합니다.</p>
        </div>
        <Badge tone={config ? 'green' : 'slate'}>{config ? '설정됨' : '미설정'}</Badge>
      </div>

      <form action={saveAiProviderConfig} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
        <input type="hidden" name="role" value={role} />
        <Field label="Provider">
          <div className="grid gap-2">
            {providerOptions.map((option) => (
              <label
                key={option.id}
                className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm"
              >
                <input
                  type="radio"
                  name="provider"
                  value={option.id}
                  defaultChecked={(config?.provider ?? 'OPENAI') === option.id}
                  disabled={!canMutate}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold text-navy-900">{option.label}</span>
                  <span className="block text-xs text-slate-500">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </Field>
        <div className="space-y-4">
          <Field label="Model name" required>
            <TextField
              name="modelName"
              defaultValue={config?.modelName ?? 'gpt-codex-auth-5.5'}
              disabled={!canMutate}
              required
            />
          </Field>
          <Field
            label="API Key"
            hint={
              config?.apiKeyMasked
                ? `현재 키: ${config.apiKeyMasked}. 비워두면 기존 키를 유지합니다.`
                : '저장 후 화면에는 마스킹된 키만 표시됩니다.'
            }
          >
            <TextField
              name="apiKey"
              type="password"
              placeholder="sk-..."
              disabled={!canMutate}
              autoComplete="off"
            />
          </Field>
          <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked
                disabled={!canMutate}
                className="h-4 w-4"
              />
              Hermes AI 활성화
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="allowSystemCreditFallback"
                defaultChecked
                disabled={!canMutate}
                className="h-4 w-4"
              />
              실패 시 시스템 크레딧 폴백 허용
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={!canMutate}>
              저장
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <form action={testAiConnection}>
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <input type="hidden" name="role" value={role} />
          <Button type="submit" variant="outline" disabled={!config}>
            연결 테스트
          </Button>
        </form>
        <form action={deleteAiProviderConfig}>
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <input type="hidden" name="role" value={role} />
          <Button type="submit" variant="danger" disabled={!canMutate || !config}>
            키 삭제
          </Button>
        </form>
      </div>
    </Card>
  );
}

export default async function AiSettingsPage({ params }: { params: { slug: string } }) {
  const { workspace, role } = await requireWorkspace(params.slug, 'ADMIN');
  const canView = canViewIntegrationSettings(role);
  const canMutate = canMutateIntegrationSettings(role);
  const canTest = canTestIntegrationConnection(role);
  const settingsDelegate = modelDelegate(prisma, 'workspaceAiSettings');
  const configDelegate = modelDelegate(prisma, 'workspaceAiProviderConfig');

  const [settingsValue, configsValue, audits] = await Promise.all([
    settingsDelegate?.findUnique?.({ where: { workspaceId: workspace.id } }) ?? null,
    configDelegate?.findMany?.({
      where: { workspaceId: workspace.id },
      orderBy: { role: 'asc' },
    }) ?? [],
    prisma.auditLog.findMany({
      where: { workspaceId: workspace.id, action: { startsWith: 'integration.ai.' } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const settings = asObject(settingsValue) as AiSettingsRow | null;
  const configs = asArray<ProviderConfigRow>(configsValue);
  const primary = configs.find((config) => config.role === 'PRIMARY');
  const fallback = configs.find((config) => config.role === 'FALLBACK');
  const auditRows = audits as AuditRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-navy-900">Hermes AI 설정</h1>
          <p className="text-xs text-slate-500">
            워크스페이스 자체 OpenAI/Gemini/Anthropic 키와 모델명을 연결합니다.
          </p>
        </div>
        <Badge tone={integrationReady() ? 'green' : 'amber'}>
          {integrationReady() ? 'DB 연결 준비됨' : 'Phase 4A delegate 대기'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="활성 상태" value={settings?.enabled ? 'ON' : 'OFF'} />
        <KpiCard label="Primary" value={primary?.provider ?? '-'} />
        <KpiCard label="Fallback" value={fallback?.provider ?? '-'} />
        <KpiCard
          label="최근 테스트"
          value={
            <Badge tone={statusTone(settings?.lastTestStatus)}>
              {settings?.lastTestStatus ?? 'NOT_TESTED'}
            </Badge>
          }
          footer={settings?.lastTestedAt ? dateLabel(settings.lastTestedAt) : '테스트 기록 없음'}
        />
      </div>

      {!canView && <EmptyState title="통합 설정 조회 권한이 없습니다" variant="inline" />}
      {!integrationReady() && (
        <Card padding="md" className="border-amber-200 bg-amber-50 text-sm text-amber-800">
          Phase 4A Prisma client generate 전입니다. 화면은 렌더링되지만 저장/테스트는 감사 로그만
          남기고 실제 설정 저장은 건너뜁니다.
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <AiProviderCard
          role="PRIMARY"
          config={primary}
          canMutate={canMutate}
          workspaceSlug={params.slug}
        />
        <AiProviderCard
          role="FALLBACK"
          config={fallback}
          canMutate={canMutate}
          workspaceSlug={params.slug}
        />
      </div>

      <Card padding="lg">
        <h2 className="mb-3 font-bold text-navy-900">연결 테스트 결과</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <div className="text-xs text-slate-500">Provider</div>
            <div className="font-semibold text-navy-900">{settings?.lastTestProvider ?? '-'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">상태</div>
            <Badge tone={statusTone(settings?.lastTestStatus)}>
              {settings?.lastTestStatus ?? 'NOT_TESTED'}
            </Badge>
          </div>
          <div>
            <div className="text-xs text-slate-500">Latency</div>
            <div className="font-semibold text-navy-900">{settings?.lastTestLatencyMs ?? 0}ms</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">테스트 권한</div>
            <div className="font-semibold text-navy-900">{canTest ? '허용' : '불가'}</div>
          </div>
        </div>
        {settings?.lastTestMessage && (
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            {settings.lastTestMessage}
          </p>
        )}
      </Card>

      <Card padding="lg">
        <h2 className="mb-3 font-bold text-navy-900">사용 범위</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['RECEIPT_OCR', '영수증 OCR'],
            ['SETTLEMENT_REPORT', '정산서 생성'],
            ['RECEIVABLE_MESSAGE', '미수금 독촉 문구'],
            ['MONTHLY_INSIGHT', '월간 인사이트'],
            ['SCHEDULE_CHANGE_DETECT', '일정 변경 감지'],
          ].map(([key, label]) => (
            <div key={key} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-navy-900">{label}</div>
              <div className="text-xs text-slate-500">AiJob agentKind: {key}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-navy-900">AI 설정 감사 로그</h2>
        </div>
        <div className="hidden md:block">
          <DataTable
            rows={auditRows}
            rowKey={(row) => row.id}
            empty={<EmptyState title="AI 설정 변경 기록이 없습니다" variant="inline" />}
            columns={[
              { key: 'action', header: '액션', cell: (row: AuditRow) => row.action },
              {
                key: 'actorUserId',
                header: '사용자',
                cell: (row: AuditRow) => row.actorUserId ?? '-',
              },
              { key: 'createdAt', header: '시간', cell: (row: AuditRow) => dateLabel(row.createdAt) },
            ]}
          />
        </div>
        <div className="p-4 md:hidden">
          <MobileCardList
            rows={auditRows}
            rowKey={(row) => row.id}
            empty={<EmptyState title="AI 설정 변경 기록이 없습니다" variant="inline" />}
            renderCard={(row) => (
              <div className="space-y-1">
                <div className="font-bold text-navy-900">{row.action}</div>
                <div className="text-xs text-slate-500">
                  {row.actorUserId ?? '-'} · {dateLabel(row.createdAt)}
                </div>
              </div>
            )}
          />
        </div>
      </Card>
    </div>
  );
}
