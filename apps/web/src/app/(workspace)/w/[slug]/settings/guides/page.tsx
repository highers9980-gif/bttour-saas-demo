import { prisma } from '@bttour/db';
import { canMutateMaster } from '@bttour/shared';
import { revalidatePath } from 'next/cache';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';
import { MasterCrudPanel, type MasterField, type MasterRow } from '../_components/MasterCrudPanel';

const fields: MasterField[] = [
  { name: 'name', label: '이름', required: true },
  { name: 'region', label: '지역' },
  { name: 'phone', label: '전화번호', type: 'tel' },
  { name: 'email', label: '이메일', type: 'email' },
  { name: 'language', label: '언어' },
  { name: 'colorKey', label: '색상 키' },
  { name: 'memo', label: '메모', type: 'textarea' },
];

async function createGuide(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.guide.create({
    data: {
      workspaceId: workspace.id,
      name: String(formData.get('name') ?? ''),
      region: String(formData.get('region') || '') || null,
      phone: String(formData.get('phone') || '') || null,
      email: String(formData.get('email') || '') || null,
      language: String(formData.get('language') || '') || null,
      colorKey: String(formData.get('colorKey') || '') || null,
      memo: String(formData.get('memo') || '') || null,
    },
  });
  revalidatePath(`/w/${slug}/settings/guides`);
}

async function updateGuide(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.guide.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: {
      name: String(formData.get('name') ?? ''),
      region: String(formData.get('region') || '') || null,
      phone: String(formData.get('phone') || '') || null,
      email: String(formData.get('email') || '') || null,
      language: String(formData.get('language') || '') || null,
      colorKey: String(formData.get('colorKey') || '') || null,
      memo: String(formData.get('memo') || '') || null,
    },
  });
  revalidatePath(`/w/${slug}/settings/guides`);
}

async function deactivateGuide(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.guide.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: { active: false, deletedAt: new Date() },
  });
  revalidatePath(`/w/${slug}/settings/guides`);
}

export default async function GuidesPage({ params }: { params: { slug: string } }) {
  const { workspace, role } = await requireWorkspace(params.slug, 'VIEWER');
  const guides = await prisma.guide.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });

  const rows: MasterRow[] = guides.map((guide) => ({
    id: guide.id,
    name: guide.name,
    region: guide.region,
    phone: guide.phone,
    email: guide.email,
    language: guide.language,
    colorKey: guide.colorKey,
    memo: guide.memo,
    active: guide.active,
  }));

  return (
    <MasterCrudPanel
      title="가이드 마스터"
      description="가이드 배정, 정산, 쇼핑 수수료에서 참조할 가이드 정보를 관리합니다."
      rows={rows}
      columns={[
        { key: 'name', header: '이름' },
        { key: 'region', header: '지역' },
        { key: 'phone', header: '전화번호' },
        { key: 'language', header: '언어', hideOnMobile: true },
      ]}
      fields={fields}
      workspaceSlug={params.slug}
      canMutate={canMutateMaster(role)}
      createAction={createGuide}
      updateAction={updateGuide}
      deactivateAction={deactivateGuide}
      newButtonLabel="가이드 추가"
    />
  );
}
