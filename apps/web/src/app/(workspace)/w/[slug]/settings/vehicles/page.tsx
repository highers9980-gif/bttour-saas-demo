import { prisma } from '@bttour/db';
import { canMutateMaster } from '@bttour/shared';
import { revalidatePath } from 'next/cache';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';
import { MasterCrudPanel, type MasterField, type MasterRow } from '../_components/MasterCrudPanel';

const vehicleFields: MasterField[] = [
  { name: 'label', label: '차량 라벨', required: true },
  { name: 'vehicleType', label: '차종' },
  { name: 'plateNumber', label: '번호판' },
  { name: 'region', label: '지역' },
  { name: 'vendor', label: '벤더' },
  { name: 'memo', label: '메모', type: 'textarea' },
];

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) || '') || null;
}

async function createVehicle(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.vehicle.create({
    data: {
      workspaceId: workspace.id,
      label: String(formData.get('label') ?? ''),
      vehicleType: optionalString(formData, 'vehicleType'),
      plateNumber: optionalString(formData, 'plateNumber'),
      region: optionalString(formData, 'region'),
      vendor: optionalString(formData, 'vendor'),
      memo: optionalString(formData, 'memo'),
    },
  });
  revalidatePath(`/w/${slug}/settings/vehicles`);
}

async function updateVehicle(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.vehicle.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: {
      label: String(formData.get('label') ?? ''),
      vehicleType: optionalString(formData, 'vehicleType'),
      plateNumber: optionalString(formData, 'plateNumber'),
      region: optionalString(formData, 'region'),
      vendor: optionalString(formData, 'vendor'),
      memo: optionalString(formData, 'memo'),
    },
  });
  revalidatePath(`/w/${slug}/settings/vehicles`);
}

async function deactivateVehicle(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.vehicle.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: { active: false, deletedAt: new Date() },
  });
  revalidatePath(`/w/${slug}/settings/vehicles`);
}

async function createDriver(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.driver.create({
    data: {
      workspaceId: workspace.id,
      name: String(formData.get('name') ?? ''),
      phone: optionalString(formData, 'phone'),
      vehicleId: optionalString(formData, 'vehicleId'),
      memo: optionalString(formData, 'memo'),
    },
  });
  revalidatePath(`/w/${slug}/settings/vehicles`);
}

async function updateDriver(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.driver.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: {
      name: String(formData.get('name') ?? ''),
      phone: optionalString(formData, 'phone'),
      vehicleId: optionalString(formData, 'vehicleId'),
      memo: optionalString(formData, 'memo'),
    },
  });
  revalidatePath(`/w/${slug}/settings/vehicles`);
}

async function deactivateDriver(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  const { workspace } = await assertWorkspace(slug, 'MANAGER');
  await prisma.driver.updateMany({
    where: { id: String(formData.get('id') ?? ''), workspaceId: workspace.id },
    data: { active: false, deletedAt: new Date() },
  });
  revalidatePath(`/w/${slug}/settings/vehicles`);
}

export default async function VehiclesPage({ params }: { params: { slug: string } }) {
  const { workspace, role } = await requireWorkspace(params.slug, 'VIEWER');
  const [vehicles, drivers] = await Promise.all([
    prisma.vehicle.findMany({
      where: { workspaceId: workspace.id, deletedAt: null },
      orderBy: [{ active: 'desc' }, { label: 'asc' }],
    }),
    prisma.driver.findMany({
      where: { workspaceId: workspace.id, deletedAt: null },
      include: { vehicle: true },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    }),
  ]);

  const vehicleRows: MasterRow[] = vehicles.map((vehicle) => ({
    id: vehicle.id,
    label: vehicle.label,
    vehicleType: vehicle.vehicleType,
    plateNumber: vehicle.plateNumber,
    region: vehicle.region,
    vendor: vehicle.vendor,
    memo: vehicle.memo,
    active: vehicle.active,
  }));

  const driverRows: MasterRow[] = drivers.map((driver) => ({
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    vehicleId: driver.vehicleId,
    vehicleLabel: driver.vehicle?.label ?? '',
    memo: driver.memo,
    active: driver.active,
  }));

  const driverFields: MasterField[] = [
    { name: 'name', label: '기사명', required: true },
    { name: 'phone', label: '전화번호', type: 'tel' },
    {
      name: 'vehicleId',
      label: '담당 차량',
      type: 'select',
      options: vehicles.map((vehicle) => ({ value: vehicle.id, label: vehicle.label })),
    },
    { name: 'memo', label: '메모', type: 'textarea' },
  ];

  const canMutate = canMutateMaster(role);

  return (
    <div className="space-y-10">
      <MasterCrudPanel
        title="차량 마스터"
        description="팀 차량 배정과 차량 정산에서 참조할 차량 정보를 관리합니다."
        rows={vehicleRows}
        columns={[
          { key: 'label', header: '차량' },
          { key: 'vehicleType', header: '차종' },
          { key: 'plateNumber', header: '번호판' },
          { key: 'vendor', header: '벤더', hideOnMobile: true },
        ]}
        fields={vehicleFields}
        workspaceSlug={params.slug}
        canMutate={canMutate}
        createAction={createVehicle}
        updateAction={updateVehicle}
        deactivateAction={deactivateVehicle}
        newButtonLabel="차량 추가"
      />

      <section id="drivers">
        <MasterCrudPanel
          title="기사 마스터"
          description="차량 배정에서 함께 참조할 기사 연락처와 담당 차량을 관리합니다."
          rows={driverRows}
          columns={[
            { key: 'name', header: '기사명' },
            { key: 'phone', header: '전화번호' },
            { key: 'vehicleLabel', header: '담당 차량' },
          ]}
          fields={driverFields}
          workspaceSlug={params.slug}
          canMutate={canMutate}
          createAction={createDriver}
          updateAction={updateDriver}
          deactivateAction={deactivateDriver}
          newButtonLabel="기사 추가"
        />
      </section>
    </div>
  );
}
