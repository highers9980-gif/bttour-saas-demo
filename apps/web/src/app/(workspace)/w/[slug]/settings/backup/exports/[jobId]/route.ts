import { prisma } from '@bttour/db';
import { auth } from '@/lib/auth';
import { modelDelegate } from '@/lib/phase4-integrations';

type BackupJob = {
  id: string;
  workspaceId: string;
  format: 'XLSX' | 'JSON';
  status: 'SUCCEEDED' | 'FAILED' | 'QUEUED' | 'RUNNING';
  scopeMasters: boolean;
  scopeOperations: boolean;
  scopeSettlements: boolean;
  scopeFinance: boolean;
  scopeAudit: boolean;
  fileName?: string | null;
  downloadExpiresAt?: Date | null;
};

function asObject(value: unknown) {
  return (value ?? null) as Record<string, unknown> | null;
}

export async function GET(
  _request: Request,
  { params }: { params: { slug: string; jobId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      status: 'ACTIVE',
      workspace: { slug: params.slug },
      role: { in: ['OWNER', 'ADMIN'] },
    },
    include: { workspace: true },
  });
  if (!membership) {
    return new Response('Forbidden', { status: 403 });
  }

  const jobDelegate = modelDelegate(prisma, 'backupExportJob');
  const job = asObject(
    jobDelegate?.findUnique ? await jobDelegate.findUnique({ where: { id: params.jobId } }) : null,
  ) as BackupJob | null;
  if (!job || job.workspaceId !== membership.workspaceId || job.status !== 'SUCCEEDED') {
    return new Response('Not found', { status: 404 });
  }
  if (job.downloadExpiresAt && job.downloadExpiresAt.getTime() < Date.now()) {
    return new Response('Download expired', { status: 410 });
  }

  const payload: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    workspace: {
      id: membership.workspace.id,
      slug: membership.workspace.slug,
      name: membership.workspace.name,
    },
    job: {
      id: job.id,
      format: job.format,
      scopes: {
        masters: job.scopeMasters,
        operations: job.scopeOperations,
        settlements: job.scopeSettlements,
        finance: job.scopeFinance,
        audit: job.scopeAudit,
      },
    },
  };

  if (job.scopeMasters) {
    payload.masters = {
      guides: await prisma.guide.findMany({
        where: { workspaceId: membership.workspaceId, deletedAt: null },
      }),
      hotels: await prisma.hotel.findMany({
        where: { workspaceId: membership.workspaceId, deletedAt: null },
      }),
      vehicles: await prisma.vehicle.findMany({
        where: { workspaceId: membership.workspaceId, deletedAt: null },
      }),
      partners: await prisma.partner.findMany({
        where: { workspaceId: membership.workspaceId, deletedAt: null },
      }),
      shoppingCenters: await prisma.shoppingCenter.findMany({
        where: { workspaceId: membership.workspaceId, deletedAt: null },
      }),
    };
  }
  if (job.scopeOperations) {
    payload.operations = {
      tourTeams: await prisma.tourTeam.findMany({
        where: { workspaceId: membership.workspaceId, deletedAt: null },
      }),
      guideAssignments: await prisma.teamGuideAssignment.findMany({
        where: { workspaceId: membership.workspaceId },
      }),
      hotelStays: await prisma.teamHotelStay.findMany({
        where: { workspaceId: membership.workspaceId },
      }),
      vehicleAssignments: await prisma.teamVehicleAssignment.findMany({
        where: { workspaceId: membership.workspaceId },
      }),
    };
  }
  if (job.scopeSettlements) {
    payload.settlements = {
      guideSettlements: await prisma.guideSettlement.findMany({
        where: { workspaceId: membership.workspaceId, deletedAt: null },
      }),
      vehicleSettlements: await prisma.vehicleSettlement.findMany({
        where: { workspaceId: membership.workspaceId, deletedAt: null },
      }),
      shoppingCommissions: await prisma.shoppingCommission.findMany({
        where: { workspaceId: membership.workspaceId, deletedAt: null },
      }),
      receivables: await prisma.receivable.findMany({
        where: { workspaceId: membership.workspaceId, deletedAt: null },
      }),
    };
  }
  if (job.scopeFinance) {
    payload.finance = {
      wallets: await prisma.financeWallet.findMany({
        where: { workspaceId: membership.workspaceId, deletedAt: null },
      }),
      ledgerLines: await prisma.financeLedgerLine.findMany({
        where: { workspaceId: membership.workspaceId },
      }),
      expenses: await prisma.expense.findMany({
        where: { workspaceId: membership.workspaceId, deletedAt: null },
      }),
    };
  }
  if (job.scopeAudit && membership.role === 'OWNER') {
    payload.auditLogs = await prisma.auditLog.findMany({
      where: { workspaceId: membership.workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
  }

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'content-disposition': `attachment; filename="${job.fileName ?? `backup-${params.jobId}.json`}"`,
      'content-type': 'application/json; charset=utf-8',
    },
  });
}
