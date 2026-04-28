import { PartnerKind, prisma } from '@bttour/db';
import { Button } from '@bttour/ui';
import { canMutateMaster } from '@bttour/shared';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';
import { MasterCrudPanel, type MasterField, type MasterRow } from '../_components/MasterCrudPanel';

const kindLabels: Record<PartnerKind, string> = {
  AGENCY: '에이전트',
  HOTEL_VENDOR: '호텔 벤더',
  VEHICLE_VENDOR: '차량 벤더',
  SHOPPING_CENTER: '쇼핑센터',
  CUSTOMER: '고객',
  OTHER: '기타',
};

const kindOptions = Object.entries(kindLabels).map(([value, label]) => ({
  value,
  label,
}));

const fields: MasterField[] = [
  { name: 'name', label: '거래처명', required: true },
  { name: 'kind', label: '구분', type: 'select', required: true, options: kindOptions },
  { name: 'contactName', label: '담당자' },
  { name: 'contactPhone', label: '전화번호', type: 'tel' },
  { name: 'contactEmail', label: '이메일', type: 'email' },
  { name: 'region', label: '지역' },
  { name: 'memo', label: '메모', type: 'textarea' },
];

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) || '') || null;
}

function parseKind(value: FormDataEntryValue | null): PartnerKind {
  const nextValue = String(value || 'AGENCY');
  return nextValue in PartnerKind ? (nextValue as PartnerKind) : 'AGENCY';
}

async function createPartner(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.partner.create({
    data: {
      workspaceId: workspace.id,
      name: String(formData.get('name') ?? ''),
      kind: parseKind(formData.get('kind')),
      contactName: optionalString(formData, 'contactName'),
      contactPhone: optionalString(formData, 'contactPhone'),
      contactEmail: optionalString(formData, 'contactEmail'),
      region: optionalString(formData, 'region'),
      memo: optionalString(formData, 'memo'),
    },
  });
  revalidatePath(`/w/${slug}/settings/partners`);
}

async function updatePartner(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.partner.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: {
      name: String(formData.get('name') ?? ''),
      kind: parseKind(formData.get('kind')),
      contactName: optionalString(formData, 'contactName'),
      contactPhone: optionalString(formData, 'contactPhone'),
      contactEmail: optionalString(formData, 'contactEmail'),
      region: optionalString(formData, 'region'),
      memo: optionalString(formData, 'memo'),
    },
  });
  revalidatePath(`/w/${slug}/settings/partners`);
}

async function deactivatePartner(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.partner.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: { active: false, deletedAt: new Date() },
  });
  revalidatePath(`/w/${slug}/settings/partners`);
}

export default async function PartnersPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { kind?: string };
}) {
  const { workspace, role } = await requireWorkspace(params.slug, 'VIEWER');
  const selectedKind =
    searchParams?.kind && searchParams.kind in PartnerKind
      ? (searchParams.kind as PartnerKind)
      : null;
  const partners = await prisma.partner.findMany({
    where: {
      workspaceId: workspace.id,
      deletedAt: null,
      ...(selectedKind ? { kind: selectedKind } : {}),
    },
    orderBy: [{ active: 'desc' }, { kind: 'asc' }, { name: 'asc' }],
  });

  const rows: MasterRow[] = partners.map((partner) => ({
    id: partner.id,
    name: partner.name,
    kind: partner.kind,
    kindLabel: kindLabels[partner.kind],
    contactName: partner.contactName,
    contactPhone: partner.contactPhone,
    contactEmail: partner.contactEmail,
    region: partner.region,
    memo: partner.memo,
    active: partner.active,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link href={`/w/${params.slug}/settings/partners`}>
          <Button size="sm" variant={selectedKind ? 'ghost' : 'secondary'}>
            전체
          </Button>
        </Link>
        {kindOptions.map((option) => (
          <Link
            key={option.value}
            href={`/w/${params.slug}/settings/partners?kind=${option.value}`}
          >
            <Button size="sm" variant={selectedKind === option.value ? 'secondary' : 'ghost'}>
              {option.label}
            </Button>
          </Link>
        ))}
      </div>

      <MasterCrudPanel
        title="거래처 마스터"
        description="에이전트, 벤더, 고객 등 운영과 정산에서 참조할 거래처를 관리합니다."
        rows={rows}
        columns={[
          { key: 'name', header: '거래처명' },
          { key: 'kindLabel', header: '구분' },
          { key: 'contactName', header: '담당자' },
          { key: 'contactPhone', header: '전화번호', hideOnMobile: true },
        ]}
        fields={fields}
        workspaceSlug={params.slug}
        canMutate={canMutateMaster(role)}
        createAction={createPartner}
        updateAction={updatePartner}
        deactivateAction={deactivatePartner}
        newButtonLabel="거래처 추가"
      />
    </div>
  );
}
