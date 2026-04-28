import { Badge, Button, Card, DataTable, EmptyState, Field, KpiCard, TextField } from '@bttour/ui';
import { prisma, type Prisma } from '@bttour/db';
import { revalidatePath } from 'next/cache';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';
import {
  auditMetadata,
  canMutateIntegrationSettings,
  encryptSecret,
  modelDelegate,
} from '@/lib/phase4-integrations';
import { EnableBlockedToggle } from './EnableBlockedToggle';

interface MessagingSettingsRow {
  enabled: boolean;
  provider: 'KAKAO_ALIMTALK';
  senderProfileKeyMasked?: string | null;
  senderPhone?: string | null;
  senderName?: string | null;
  templateSyncStatus: 'DISABLED' | 'READY' | 'ERROR';
  templateSyncedAt?: Date | null;
}

interface AuditRow {
  id: string;
  action: string;
  actorUserId?: string | null;
  createdAt: Date;
}

function asObject(value: unknown) {
  return (value ?? null) as Record<string, unknown> | null;
}

function dateLabel(value?: Date | null) {
  return value ? value.toISOString().slice(0, 16).replace('T', ' ') : '-';
}

function integrationReady() {
  return Boolean(modelDelegate(prisma, 'workspaceMessagingSettings'));
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
      targetType: 'WorkspaceMessagingSettings',
      metadata: metadata ? (auditMetadata(metadata) as Prisma.InputJsonObject) : undefined,
    },
  });
}

async function saveMessagingDraft(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace, userId } = await assertWorkspace(slug, 'OWNER');
  const delegate = modelDelegate(prisma, 'workspaceMessagingSettings');
  if (!delegate?.upsert) {
    await writeAudit({
      action: 'integration.messaging.save.blocked',
      metadata: { reason: 'phase4a_delegate_missing' },
      userId,
      workspaceId: workspace.id,
    });
    revalidatePath(`/w/${slug}/settings/messaging`);
    return;
  }

  const senderProfileKey = String(formData.get('senderProfileKey') || '').trim();
  const senderPhone = String(formData.get('senderPhone') || '').trim() || null;
  const senderName = String(formData.get('senderName') || '').trim() || null;
  const encrypted = senderProfileKey ? encryptSecret(senderProfileKey) : null;

  await delegate.upsert({
    where: { workspaceId: workspace.id },
    create: {
      workspaceId: workspace.id,
      enabled: false,
      provider: 'KAKAO_ALIMTALK',
      senderPhone,
      senderName,
      templateSyncStatus: 'DISABLED',
      ...(encrypted
        ? {
            senderProfileKeyCiphertext: encrypted.ciphertext,
            senderProfileKeyIv: encrypted.iv,
            senderProfileKeyAuthTag: encrypted.authTag,
            senderProfileKeyEncryptedDek: encrypted.encryptedDek,
            senderProfileKeyDekKeyVersion: encrypted.dekKeyVersion,
            senderProfileKeyMasked: encrypted.masked,
          }
        : {}),
    },
    update: {
      enabled: false,
      senderPhone,
      senderName,
      templateSyncStatus: 'DISABLED',
      ...(encrypted
        ? {
            senderProfileKeyCiphertext: encrypted.ciphertext,
            senderProfileKeyIv: encrypted.iv,
            senderProfileKeyAuthTag: encrypted.authTag,
            senderProfileKeyEncryptedDek: encrypted.encryptedDek,
            senderProfileKeyDekKeyVersion: encrypted.dekKeyVersion,
            senderProfileKeyMasked: encrypted.masked,
          }
        : {}),
    },
  });

  await writeAudit({
    action: encrypted ? 'integration.messaging.draft.rotate' : 'integration.messaging.draft.update',
    metadata: { provider: 'KAKAO_ALIMTALK', keyChanged: Boolean(encrypted), enabled: false },
    userId,
    workspaceId: workspace.id,
  });
  revalidatePath(`/w/${slug}/settings/messaging`);
}

export default async function MessagingSettingsPage({ params }: { params: { slug: string } }) {
  const { workspace, role } = await requireWorkspace(params.slug, 'ADMIN');
  const canMutate = canMutateIntegrationSettings(role);
  const delegate = modelDelegate(prisma, 'workspaceMessagingSettings');
  const [settingsValue, audits] = await Promise.all([
    delegate?.findUnique?.({ where: { workspaceId: workspace.id } }) ?? null,
    prisma.auditLog.findMany({
      where: { workspaceId: workspace.id, action: { startsWith: 'integration.messaging.' } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);
  const settings = asObject(settingsValue) as MessagingSettingsRow | null;
  const auditRows = audits as AuditRow[];

  const templates = [
    {
      key: 'guide_settlement',
      title: '가이드 정산 안내',
      body: '#{가이드명}님, #{월} 정산서가 준비되었습니다.',
    },
    {
      key: 'receivable_reminder',
      title: '미수금 독촉',
      body: '#{거래처명} 미수금 #{금액} 입금 예정일을 확인해 주세요.',
    },
    {
      key: 'schedule_notice',
      title: '일정 변경 알림',
      body: '#{팀번호} 일정이 변경되었습니다. ERP에서 상세 내용을 확인해 주세요.',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-navy-900">카카오 알림톡</h1>
          <p className="text-xs text-slate-500">
            발신 프로필과 템플릿 초안을 저장합니다. 실제 발송은 아직 비활성입니다.
          </p>
        </div>
        <Badge tone={integrationReady() ? 'amber' : 'slate'}>
          {integrationReady() ? '저장 가능 · 활성화 불가' : 'Phase 4A delegate 대기'}
        </Badge>
      </div>

      <Card padding="md" className="border-amber-200 bg-amber-50 text-sm text-amber-800">
        카카오 알림톡은 Phase 4 후반까지 비활성 상태로 둡니다. 이 페이지에서는 설정 draft만
        저장하고, 활성화 또는 테스트 발송은 차단합니다.
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="활성 상태" value="OFF" />
        <KpiCard label="Provider" value="KAKAO" />
        <KpiCard label="템플릿 동기화" value={settings?.templateSyncStatus ?? 'DISABLED'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card padding="lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-navy-900">카카오 발신 설정</h2>
            <Badge tone={settings?.senderProfileKeyMasked ? 'green' : 'slate'}>
              {settings?.senderProfileKeyMasked ? settings.senderProfileKeyMasked : '키 없음'}
            </Badge>
          </div>
          <form action={saveMessagingDraft} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="workspaceSlug" value={params.slug} />
            <Field label="발신 프로필 키">
              <TextField
                name="senderProfileKey"
                type="password"
                placeholder="비워두면 기존 키 유지"
                disabled={!canMutate}
                autoComplete="off"
              />
            </Field>
            <Field label="발신 전화번호">
              <TextField
                name="senderPhone"
                defaultValue={settings?.senderPhone ?? ''}
                disabled={!canMutate}
              />
            </Field>
            <Field label="발신자명">
              <TextField
                name="senderName"
                defaultValue={settings?.senderName ?? ''}
                disabled={!canMutate}
              />
            </Field>
            <Field label="상태">
              <TextField value="OFF · Phase 4 후반 활성화 예정" disabled readOnly />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={!canMutate}>
                Draft 저장
              </Button>
            </div>
          </form>
        </Card>

        <Card padding="lg">
          <h2 className="mb-4 font-bold text-navy-900">활성화</h2>
          <EnableBlockedToggle />
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            실제 발송은 제3자에게 메시지를 전송하는 작업입니다. Phase 4 후반에서 테스트 발송과 실제
            발송 버튼은 별도 확인 절차를 붙입니다.
          </p>
        </Card>
      </div>

      <Card padding="lg">
        <h2 className="mb-4 font-bold text-navy-900">템플릿 미리보기</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {templates.map((template) => (
            <div key={template.key} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-navy-900">{template.title}</h3>
                <Badge tone="slate">OFF</Badge>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">{template.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-navy-900">메시징 설정 감사 로그</h2>
        </div>
        <DataTable
          rows={auditRows}
          rowKey={(row) => row.id}
          empty={<EmptyState title="메시징 설정 변경 기록이 없습니다" variant="inline" />}
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
      </Card>
    </div>
  );
}
