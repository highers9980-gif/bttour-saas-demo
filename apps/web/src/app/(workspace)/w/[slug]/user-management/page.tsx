import { Badge, Button, Card, DataTable, EmptyState, Field, TextField } from '@bttour/ui';
import {
  ROLES,
  buildPermissionMatrix,
  canApproveMembership,
  canChangeRole,
  canInviteMember,
  type Role,
} from '@bttour/shared';
import { getTranslations } from 'next-intl/server';
import { revalidatePath } from 'next/cache';
import { assertWorkspace, requireWorkspace } from '@/lib/workspace-guard';
import {
  activeMembers,
  pendingMembers,
  sentInvitations,
  type MockMember,
} from '@/lib/mocks/user-management';
import { UserManagementTabs } from './UserManagementTabs';

async function inviteMemberAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  await assertWorkspace(slug, 'ADMIN');
  revalidatePath(`/w/${slug}/user-management`);
}

async function changeRoleAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  await assertWorkspace(slug, 'ADMIN');
  revalidatePath(`/w/${slug}/user-management`);
}

async function approveMembershipAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  await assertWorkspace(slug, 'ADMIN');
  revalidatePath(`/w/${slug}/user-management`);
}

async function rejectMembershipAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  await assertWorkspace(slug, 'ADMIN');
  revalidatePath(`/w/${slug}/user-management`);
}

async function invitationAction(formData: FormData) {
  'use server';
  const slug = String(formData.get('workspaceSlug') ?? '');
  await assertWorkspace(slug, 'ADMIN');
  revalidatePath(`/w/${slug}/user-management`);
}

const roleTone: Record<Role, 'orange' | 'navy' | 'purple' | 'slate'> = {
  OWNER: 'orange',
  ADMIN: 'navy',
  MANAGER: 'purple',
  VIEWER: 'slate',
};

function StatusBadge({ status }: { status: MockMember['status'] }) {
  if (status === 'SUSPICIOUS') {
    return <Badge tone="red">⚠</Badge>;
  }
  if (status === 'PENDING') {
    return <Badge tone="amber">대기</Badge>;
  }
  return <Badge tone="green">활성</Badge>;
}

export default async function UserManagementPage({ params }: { params: { slug: string } }) {
  const t = await getTranslations();
  const { role } = await requireWorkspace(params.slug, 'ADMIN');
  const canInvite = canInviteMember(role);
  const canApprove = canApproveMembership(role);
  const matrix = buildPermissionMatrix();

  const activeColumns = [
    {
      key: 'user',
      header: t('admin.users.user'),
      cell: (member: MockMember) => (
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-orange-500 text-sm font-bold text-white">
            {member.avatar}
          </div>
          <div>
            <div className="font-semibold text-navy-900">{member.name}</div>
            <div className="text-xs text-slate-500">{member.joinedAt}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: t('admin.users.email'),
      cell: (member: MockMember) => member.email,
      hideOnMobile: true,
    },
    {
      key: 'role',
      header: t('admin.users.role'),
      cell: (member: MockMember) => <Badge tone={roleTone[member.role]}>{member.role}</Badge>,
    },
    {
      key: 'lastLogin',
      header: t('admin.users.last_login'),
      cell: (member: MockMember) => member.lastLogin,
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: t('admin.users.status'),
      cell: (member: MockMember) => <StatusBadge status={member.status} />,
    },
    {
      key: 'manage',
      header: t('admin.users.manage'),
      align: 'right' as const,
      cell: (member: MockMember) => {
        const nextRole: Role = member.role === 'VIEWER' ? 'MANAGER' : 'VIEWER';
        const allowed = canChangeRole({
          actor: role,
          actorIsSelf: false,
          targetCurrent: member.role,
          targetNewRole: nextRole,
        });

        return (
          <form action={changeRoleAction} className="flex justify-end">
            <input type="hidden" name="workspaceSlug" value={params.slug} />
            <input type="hidden" name="memberId" value={member.id} />
            <input type="hidden" name="targetNewRole" value={nextRole} />
            <Button type="submit" size="sm" variant="ghost" disabled={!allowed}>
              {t('admin.users.change_role')}
            </Button>
          </form>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-navy-900">{t('admin.users.title')}</h1>
          <p className="text-xs text-slate-500">{t('admin.users.subtitle')}</p>
        </div>
        <Button disabled={!canInvite} variant="secondary">
          + {t('admin.users.invite_member')}
        </Button>
      </div>

      <UserManagementTabs
        labels={{
          active: t('admin.users.active_users'),
          pending: t('admin.users.pending'),
          invite: t('admin.users.invitations'),
        }}
        counts={{
          active: activeMembers.length,
          pending: pendingMembers.length,
          invite: sentInvitations.length,
        }}
        activePanel={
          <Card padding="none" className="overflow-hidden">
            <DataTable
              rows={activeMembers}
              columns={activeColumns}
              rowKey={(member) => member.id}
              empty={<EmptyState title={t('common.empty')} variant="inline" />}
            />
          </Card>
        }
        pendingPanel={
          <div className="grid gap-4">
            {pendingMembers.map((member) => (
              <Card
                key={member.id}
                padding="lg"
                className={member.status === 'SUSPICIOUS' ? 'border-red-200' : 'border-amber-200'}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-100 text-lg font-bold text-amber-700">
                    {member.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-bold text-navy-900">{member.name}</h3>
                      <StatusBadge status={member.status} />
                      <span className="text-xs text-slate-400">{member.joinedAt}</span>
                    </div>
                    <div className="mb-3 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <span className="text-slate-500">{t('admin.users.email')}:</span>{' '}
                        <strong className="text-navy-900">{member.email}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">{t('admin.users.role')}:</span>{' '}
                        <strong className="text-purple-700">{member.requestedRole}</strong>
                      </div>
                      {member.phone && (
                        <div>
                          <span className="text-slate-500">Phone:</span>{' '}
                          <strong className="text-navy-900">{member.phone}</strong>
                        </div>
                      )}
                      {member.team && (
                        <div>
                          <span className="text-slate-500">Team:</span>{' '}
                          <strong className="text-navy-900">{member.team}</strong>
                        </div>
                      )}
                    </div>
                    {member.suspiciousReasonKey ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        ⚠ {t(member.suspiciousReasonKey)}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                        {member.intro}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2 lg:flex-col">
                    <form action={approveMembershipAction}>
                      <input type="hidden" name="workspaceSlug" value={params.slug} />
                      <input type="hidden" name="memberId" value={member.id} />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!canApprove || member.status === 'SUSPICIOUS'}
                        className="w-full"
                      >
                        {t('common.approve')}
                      </Button>
                    </form>
                    <form action={rejectMembershipAction}>
                      <input type="hidden" name="workspaceSlug" value={params.slug} />
                      <input type="hidden" name="memberId" value={member.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant={member.status === 'SUSPICIOUS' ? 'danger' : 'outline'}
                        disabled={!canApprove}
                        className="w-full"
                      >
                        {t('common.reject')}
                      </Button>
                    </form>
                    <Button size="sm" variant="ghost" disabled={!canApprove}>
                      {t('admin.users.adjust_role')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        }
        invitePanel={
          <div className="space-y-6">
            <Card padding="lg">
              <h3 className="mb-1 font-bold text-navy-900">{t('admin.users.new_invite')}</h3>
              <p className="mb-5 text-sm text-slate-500">{t('admin.users.invite_desc')}</p>
              <form action={inviteMemberAction} className="grid gap-3 sm:grid-cols-3">
                <input type="hidden" name="workspaceSlug" value={params.slug} />
                <Field label={t('admin.users.email')} className="sm:col-span-2">
                  <TextField
                    name="destination"
                    placeholder="employee@bttour.kr"
                    disabled={!canInvite}
                  />
                </Field>
                <Field label={t('admin.users.role')}>
                  <select
                    name="role"
                    disabled={!canInvite}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm disabled:bg-slate-50"
                    defaultValue="MANAGER"
                  >
                    <option value="MANAGER">MANAGER</option>
                    <option value="VIEWER">VIEWER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </Field>
                <div className="flex justify-end sm:col-span-3">
                  <Button type="submit" disabled={!canInvite}>
                    {t('common.send')}
                  </Button>
                </div>
              </form>
            </Card>

            <Card padding="none" className="overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="font-bold text-navy-900">{t('admin.users.invitations')}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {sentInvitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex flex-col gap-3 px-5 py-4 text-sm sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-navy-900">{invite.destination}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {invite.role} · {invite.meta}
                      </div>
                    </div>
                    <form action={invitationAction} className="flex gap-2">
                      <input type="hidden" name="workspaceSlug" value={params.slug} />
                      <input type="hidden" name="invitationId" value={invite.id} />
                      <Button type="submit" size="sm" variant="outline" disabled={!canInvite}>
                        {t('admin.users.resend')}
                      </Button>
                      <Button type="submit" size="sm" variant="danger" disabled={!canInvite}>
                        {t('admin.users.cancel_invite')}
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        }
      />

      <Card padding="lg">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-navy-900">
          <span>🔐</span>
          {t('admin.users.permission_matrix')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-4 text-left font-semibold">Action</th>
                {ROLES.map((matrixRole) => (
                  <th key={matrixRole} className="px-3 py-2 text-center font-semibold">
                    {matrixRole}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrix.map((row) => (
                <tr key={row.key}>
                  <td className="py-2.5 pr-4">{t(row.label)}</td>
                  {ROLES.map((matrixRole) => (
                    <td key={matrixRole} className="px-3 py-2.5 text-center">
                      {row.roles[matrixRole] ? (
                        <span className="font-bold text-green-500">✓</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
