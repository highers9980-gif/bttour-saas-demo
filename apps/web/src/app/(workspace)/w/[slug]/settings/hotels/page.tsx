import { prisma } from '@bttour/db';
import { canMutateMaster } from '@bttour/shared';
import { revalidatePath } from 'next/cache';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';
import { MasterCrudPanel, type MasterField, type MasterRow } from '../_components/MasterCrudPanel';

const fields: MasterField[] = [
  { name: 'name', label: '호텔명', required: true },
  { name: 'region', label: '지역' },
  { name: 'address', label: '주소' },
  { name: 'phone', label: '전화번호', type: 'tel' },
  { name: 'rank', label: '등급', type: 'number' },
  { name: 'contactName', label: '담당자' },
  { name: 'memo', label: '메모', type: 'textarea' },
];

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) || '') || null;
}

function optionalNumber(formData: FormData, key: string) {
  const value = String(formData.get(key) || '');
  return value === '' ? null : Number(value);
}

async function createHotel(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.hotel.create({
    data: {
      workspaceId: workspace.id,
      name: String(formData.get('name') ?? ''),
      region: optionalString(formData, 'region'),
      address: optionalString(formData, 'address'),
      phone: optionalString(formData, 'phone'),
      rank: optionalNumber(formData, 'rank'),
      contactName: optionalString(formData, 'contactName'),
      memo: optionalString(formData, 'memo'),
    },
  });
  revalidatePath(`/w/${slug}/settings/hotels`);
}

async function updateHotel(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.hotel.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: {
      name: String(formData.get('name') ?? ''),
      region: optionalString(formData, 'region'),
      address: optionalString(formData, 'address'),
      phone: optionalString(formData, 'phone'),
      rank: optionalNumber(formData, 'rank'),
      contactName: optionalString(formData, 'contactName'),
      memo: optionalString(formData, 'memo'),
    },
  });
  revalidatePath(`/w/${slug}/settings/hotels`);
}

async function deactivateHotel(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.hotel.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: { active: false, deletedAt: new Date() },
  });
  revalidatePath(`/w/${slug}/settings/hotels`);
}

export default async function HotelsPage({ params }: { params: { slug: string } }) {
  const { workspace, role } = await requireWorkspace(params.slug, 'VIEWER');
  const hotels = await prisma.hotel.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });

  const rows: MasterRow[] = hotels.map((hotel) => ({
    id: hotel.id,
    name: hotel.name,
    region: hotel.region,
    address: hotel.address,
    phone: hotel.phone,
    rank: hotel.rank,
    contactName: hotel.contactName,
    memo: hotel.memo,
    active: hotel.active,
  }));

  return (
    <MasterCrudPanel
      title="호텔 마스터"
      description="호텔 캘린더와 팀 숙박 배정에서 참조할 호텔 정보를 관리합니다."
      rows={rows}
      columns={[
        { key: 'name', header: '호텔명' },
        { key: 'region', header: '지역' },
        { key: 'phone', header: '전화번호' },
        { key: 'rank', header: '등급', hideOnMobile: true },
      ]}
      fields={fields}
      workspaceSlug={params.slug}
      canMutate={canMutateMaster(role)}
      createAction={createHotel}
      updateAction={updateHotel}
      deactivateAction={deactivateHotel}
      newButtonLabel="호텔 추가"
    />
  );
}
