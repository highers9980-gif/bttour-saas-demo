import { Badge, Button, Card, Field, TextField } from '@bttour/ui';
import { Prisma, prisma } from '@bttour/db';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requestedRoleOptions, signupPlanOptions, signupStepper } from '@/lib/mocks/signup';

const signupSchema = z
  .object({
    mode: z.enum(['new', 'join']),
    email: z.string().email(),
    name: z.string().min(1).max(60),
    phone: z.string().max(40).optional(),
    password: z.string().min(8),
    passwordConfirm: z.string().min(8),
    workspaceName: z.string().max(60).optional(),
    workspaceSlug: z
      .string()
      .min(2)
      .max(40)
      .regex(/^[a-z0-9-]+$/),
    plan: z.string().optional(),
    requestedRole: z.enum(['ADMIN', 'MANAGER', 'VIEWER']).optional(),
    intro: z.string().max(300).optional(),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'password mismatch',
  })
  .refine((value) => value.mode === 'join' || Boolean(value.workspaceName), {
    path: ['workspaceName'],
    message: 'workspace name required',
  });

async function signupAction(formData: FormData) {
  'use server';

  const parsed = signupSchema.safeParse({
    mode: formData.get('mode'),
    email: formData.get('email'),
    name: formData.get('name'),
    phone: formData.get('phone'),
    password: formData.get('password'),
    passwordConfirm: formData.get('passwordConfirm'),
    workspaceName: formData.get('workspaceName'),
    workspaceSlug: formData.get('workspaceSlug'),
    plan: formData.get('plan'),
    requestedRole: formData.get('requestedRole'),
    intro: formData.get('intro'),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '));
  }

  const values = parsed.data;

  if (values.mode === 'new') {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.upsert({
        where: { email: values.email },
        update: { name: values.name },
        create: { email: values.email, name: values.name },
      });

      const workspace = await tx.workspace.create({
        data: {
          slug: values.workspaceSlug,
          name: values.workspaceName ?? values.workspaceSlug,
        },
      });

      await tx.membership.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: 'OWNER',
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });
    });

    redirect(`/w/${values.workspaceSlug}/dashboard`);
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const workspace = await tx.workspace.findUnique({
      where: { slug: values.workspaceSlug },
    });
    if (!workspace) throw new Error('workspace not found');

    const user = await tx.user.upsert({
      where: { email: values.email },
      update: { name: values.name },
      create: { email: values.email, name: values.name },
    });

    await tx.membership.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
      update: {
        role: values.requestedRole ?? 'VIEWER',
        status: 'PENDING',
      },
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        role: values.requestedRole ?? 'VIEWER',
        status: 'PENDING',
      },
    });
  });

  redirect('/signin?status=pending');
}

export default async function SignUpPage() {
  const t = await getTranslations();

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy-900 text-xs font-bold text-white">
              BT
            </span>
            <span className="text-lg font-bold text-navy-900">ERP</span>
          </Link>
          <div className="text-sm text-slate-600">
            {t('auth.signup.have_account')}{' '}
            <Link href="/signin" className="font-semibold text-navy-900 hover:underline">
              {t('common.login')}
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-3">
            {signupStepper.map((item, index) => (
              <div key={item.step} className="flex flex-1 items-center gap-3 last:flex-none">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">
                  {item.step}
                </div>
                {index < signupStepper.length - 1 && (
                  <div className="h-0.5 flex-1 bg-navy-900/25" />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            {signupStepper.map((item) => (
              <span key={item.step}>{t(item.key)}</span>
            ))}
          </div>
        </div>

        <form action={signupAction} className="space-y-6">
          <Card padding="lg">
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-navy-900">
              {t('auth.signup.company_title')}
            </h1>
            <p className="mb-8 text-slate-600">{t('auth.signup.company_desc')}</p>

            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <label className="cursor-pointer rounded-xl border-2 border-orange-500 bg-orange-50/30 p-6 text-left transition">
                <input type="radio" name="mode" value="new" defaultChecked className="sr-only" />
                <div className="mb-3 text-3xl">🏢</div>
                <h3 className="mb-1 font-bold text-navy-900">{t('auth.signup.new_company')}</h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  {t('auth.signup.new_company_desc')}
                </p>
              </label>

              <label className="cursor-pointer rounded-xl border-2 border-slate-200 p-6 text-left transition hover:border-navy-900">
                <input type="radio" name="mode" value="join" className="sr-only" />
                <div className="mb-3 text-3xl">👥</div>
                <h3 className="mb-1 font-bold text-navy-900">{t('auth.signup.join_company')}</h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  {t('auth.signup.join_company_desc')}
                </p>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('auth.signup.company_name')} required>
                <TextField name="workspaceName" placeholder="BT TOUR" defaultValue="BT TOUR" />
              </Field>
              <Field
                label={t('auth.signup.workspace_id')}
                hint={t('auth.signup.workspace_id_hint')}
                required
              >
                <TextField
                  name="workspaceSlug"
                  placeholder="bttour"
                  defaultValue="bttour"
                  pattern="[a-z0-9-]+"
                />
              </Field>
              <Field label={t('auth.signup.starting_plan')} className="md:col-span-2">
                <select
                  name="plan"
                  defaultValue="trial"
                  className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
                >
                  {signupPlanOptions.map((plan) => (
                    <option key={plan.value} value={plan.value}>
                      {plan.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card padding="lg">
            <div className="mb-8">
              <Badge tone="navy">2</Badge>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-navy-900">
                {t('auth.signup.account_title')}
              </h2>
              <p className="mt-1 text-slate-600">{t('auth.signup.account_desc')}</p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('auth.signup.name')} required>
                  <TextField name="name" placeholder="홍길동" required />
                </Field>
                <Field label={t('auth.signup.phone')}>
                  <TextField name="phone" placeholder="010-0000-0000" />
                </Field>
              </div>
              <Field label={t('auth.signup.email')} required>
                <TextField type="email" name="email" placeholder="you@company.com" required />
              </Field>
              <Field
                label={t('auth.login.password')}
                hint={t('auth.signup.password_hint')}
                required
              >
                <TextField type="password" name="password" minLength={8} required />
              </Field>
              <Field label={t('auth.signup.password_confirm')} required>
                <TextField type="password" name="passwordConfirm" minLength={8} required />
              </Field>
              <Field label={t('admin.users.role')}>
                <select
                  name="requestedRole"
                  defaultValue="MANAGER"
                  className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
                >
                  {requestedRoleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('auth.signup.join_company_desc')}>
                <textarea
                  name="intro"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
                />
              </Field>
            </div>

            <div className="mt-6 space-y-2.5 rounded-lg border border-slate-200 p-4">
              {[
                'auth.signup.terms',
                'auth.signup.privacy',
                'auth.signup.ai_transfer',
                'auth.signup.marketing',
              ].map((key, index) => (
                <label key={key} className="flex items-center gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name={key}
                    required={index < 3}
                    className="h-4 w-4 rounded border-slate-300 text-navy-900 focus:ring-navy-900/20"
                  />
                  {t(key)}
                </label>
              ))}
            </div>
          </Card>

          <Card padding="lg" className="text-center">
            <Badge tone="green">3</Badge>
            <h2 className="mt-3 text-2xl font-bold text-navy-900">{t('auth.signup.step_done')}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {t('auth.signup.success_title')} / {t('auth.signup.pending_title')}
            </p>
            <Button type="submit" size="lg" className="mt-8 w-full">
              {t('auth.signup.submit')}
            </Button>
          </Card>
        </form>
      </div>
    </main>
  );
}
