import {
  AuthBrandPanel,
  AuthFormPanel,
  AuthSplitLayout,
  Button,
  Field,
  TextField,
} from '@bttour/ui';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { signIn } from '@/lib/auth';
import { authBrandKpis, loginSeedAccounts } from '@/lib/mocks/login';

async function signInAction(formData: FormData) {
  'use server';

  const workspace = String(formData.get('workspace') ?? 'bttour').trim();
  await signIn('credentials', {
    email: formData.get('email'),
    password: formData.get('password'),
    redirectTo: `/w/${workspace || 'bttour'}/dashboard`,
  });
}

export default async function SignInPage() {
  const t = await getTranslations();

  return (
    <AuthSplitLayout
      left={
        <AuthFormPanel
          brand={
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900 text-sm font-bold text-white">
                BT
              </span>
              <span className="text-xl font-bold text-navy-900">ERP</span>
            </Link>
          }
          title={t('auth.login.title')}
          subtitle={t('auth.login.welcome_back')}
          footer={
            <>
              {t('auth.login.no_account')}{' '}
              <Link href="/signup" className="font-semibold text-navy-900 hover:underline">
                {t('auth.login.free_signup')}
              </Link>
            </>
          }
        >
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <span className="text-amber-600">🔑</span>
              <div className="text-sm">
                <div className="mb-1.5 font-semibold text-amber-900">
                  {t('auth.login.dev_mode')}
                </div>
                <div className="space-y-0.5 font-mono text-xs text-amber-800">
                  {loginSeedAccounts.map((account) => (
                    <div key={account.id}>
                      <strong>{account.email}</strong> / {account.passwordHint}{' '}
                      <span className="text-amber-600">({account.label})</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-amber-700">{t('auth.login.dev_mode_remove')}</p>
              </div>
            </div>
          </div>

          <form action={signInAction} className="space-y-4">
            <Field label={t('auth.login.email_or_id')} required>
              <TextField
                type="email"
                name="email"
                defaultValue="admin@example.com"
                autoComplete="username"
                required
              />
            </Field>

            <Field label={t('auth.login.password')} required>
              <TextField
                type="password"
                name="password"
                defaultValue="password1234"
                autoComplete="current-password"
                minLength={8}
                required
              />
            </Field>

            <Field label={t('auth.login.workspace')} hint={t('auth.login.workspace_hint')} required>
              <TextField
                type="text"
                name="workspace"
                defaultValue="bttour"
                placeholder="bttour"
                required
              />
            </Field>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                name="remember"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300 text-navy-900 focus:ring-navy-900/20"
              />
              {t('auth.login.remember')}
            </label>

            <Button type="submit" variant="secondary" size="lg" className="w-full">
              {t('common.login')}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-2.5">
            <Button
              type="button"
              className="w-full bg-yellow-400 text-navy-900 hover:bg-yellow-500"
            >
              🟡 {t('auth.login.with_kakao')}
            </Button>
            <Button type="button" variant="outline" className="w-full">
              G {t('auth.login.with_google')}
            </Button>
          </div>
        </AuthFormPanel>
      }
      right={
        <AuthBrandPanel
          badge={t('auth.brand.badge')}
          titleLines={[
            t('auth.brand.headline_1'),
            <span key="highlight" className="text-orange-400">
              {t('auth.brand.headline_highlight')}
            </span>,
            t('auth.brand.headline_2'),
          ]}
          description={t('auth.brand.description')}
          kpis={[...authBrandKpis]}
          copyright="© 2026 BT TOUR · BEST TRAVEL"
        />
      }
    />
  );
}
