import { prisma } from '@bttour/db';
import { canMutateMaster } from '@bttour/shared';
import { revalidatePath } from 'next/cache';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';
import { MasterCrudPanel, type MasterField, type MasterRow } from '../_components/MasterCrudPanel';

const fields: MasterField[] = [
  { name: 'name', label: '쇼핑센터명', required: true },
  { name: 'category', label: '카테고리' },
  { name: 'region', label: '지역' },
  { name: 'sortOrder', label: '표시 순서', type: 'number' },
  {
    name: 'defaultCommissionRatePercent',
    label: '기본 수수료율 (%)',
    type: 'number',
    min: 0,
    max: 100,
    step: 0.1,
  },
  { name: 'memo', label: '메모', type: 'textarea' },
];

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) || '') || null;
}

function numberOrZero(formData: FormData, key: string) {
  const value = String(formData.get(key) || '');
  return value === '' ? 0 : Number(value);
}

function percentOrNull(formData: FormData, key: string) {
  const value = String(formData.get(key) || '').trim();
  if (!value) return null;
  const percent = Number(value);
  return Number.isFinite(percent) ? percent : null;
}

async function createShoppingCenter(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.shoppingCenter.create({
    data: {
      workspaceId: workspace.id,
      name: String(formData.get('name') ?? ''),
      category: optionalString(formData, 'category'),
      region: optionalString(formData, 'region'),
      sortOrder: numberOrZero(formData, 'sortOrder'),
      defaultCommissionRatePercent: percentOrNull(formData, 'defaultCommissionRatePercent'),
      memo: optionalString(formData, 'memo'),
    },
  });
  revalidatePath(`/w/${slug}/settings/shopping-centers`);
}

async function updateShoppingCenter(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.shoppingCenter.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: {
      name: String(formData.get('name') ?? ''),
      category: optionalString(formData, 'category'),
      region: optionalString(formData, 'region'),
      sortOrder: numberOrZero(formData, 'sortOrder'),
      defaultCommissionRatePercent: percentOrNull(formData, 'defaultCommissionRatePercent'),
      memo: optionalString(formData, 'memo'),
    },
  });
  revalidatePath(`/w/${slug}/settings/shopping-centers`);
}

async function deactivateShoppingCenter(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.shoppingCenter.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: { active: false, deletedAt: new Date() },
  });
  revalidatePath(`/w/${slug}/settings/shopping-centers`);
}

export default async function ShoppingCentersPage({ params }: { params: { slug: string } }) {
  const { workspace, role } = await requireWorkspace(params.slug, 'VIEWER');
  const centers = await prisma.shoppingCenter.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  });

  // MasterCrudPanel은 'use client' 컴포넌트라 columns에 render 함수를 넘기면
  // Server→Client 직렬화 에러가 난다. 표시 가공이 필요한 값은 row에 사전 문자열 필드로 추가한다.
  const rows: MasterRow[] = centers.map((center) => ({
    id: center.id,
    name: center.name,
    category: center.category,
    region: center.region,
    sortOrder: center.sortOrder,
    defaultCommissionRatePercent: center.defaultCommissionRatePercent,
    defaultCommissionRatePercentLabel:
      center.defaultCommissionRatePercent != null
        ? `${center.defaultCommissionRatePercent}%`
        : '—',
    memo: center.memo,
    active: center.active,
  }));

  return (
    <MasterCrudPanel
      title="쇼핑센터 마스터"
      description="쇼핑 매출과 수수료 분배에서 참조할 쇼핑센터 정보를 관리합니다."
      rows={rows}
      columns={[
        { key: 'name', header: '쇼핑센터명' },
        { key: 'category', header: '카테고리' },
        { key: 'region', header: '지역' },
        { key: 'sortOrder', header: '순서', hideOnMobile: true },
        { key: 'defaultCommissionRatePercentLabel', header: '기본 수수료율' },
      ]}
      fields={fields}
      workspaceSlug={params.slug}
      canMutate={canMutateMaster(role)}
      createAction={createShoppingCenter}
      updateAction={updateShoppingCenter}
      deactivateAction={deactivateShoppingCenter}
      newButtonLabel="쇼핑센터 추가"
    />
  );
}
