import { Badge, Button, Card, KpiCard, MobileCardList } from '@bttour/ui';
import { canMutateMaster, canRechargeAiCredit } from '@bttour/shared';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { requireWorkspace } from '@/lib/workspace-guard';
import {
  aiActivities,
  dashboardKpis,
  fxRates,
  notificationQueue,
  quickActions,
  weeklyTeams,
} from '@/lib/mocks/dashboard';

export default async function DashboardPage({ params }: { params: { slug: string } }) {
  const t = await getTranslations();
  const { role } = await requireWorkspace(params.slug, 'VIEWER');
  const canCreateTeam = canMutateMaster(role);
  const canRecharge = canRechargeAiCredit(role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-navy-900">{t('dashboard.title')}</h1>
          <p className="text-xs text-slate-500">2026년 4월 · bttour</p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm">
          <span className="text-orange-500">⚡</span>
          <span className="num-tabular font-semibold text-navy-900">42,386</span>
          <span className="text-slate-500">credits</span>
          {canRecharge && (
            <Link
              href={`/w/${params.slug}/billing`}
              className="text-xs font-semibold text-orange-600 hover:underline"
            >
              {t('common.recharge')}
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardKpis.map((kpi) => (
          <KpiCard
            key={kpi.key}
            label={t(kpi.labelKey)}
            value={kpi.value}
            unit={t(kpi.unitKey)}
            emoji={kpi.emoji}
            delta={kpi.delta}
            footer={kpi.footer}
            highlight={kpi.highlight}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card padding="lg">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy-900">{t('dashboard.weekly_teams')}</h2>
              <Link
                href={`/w/${params.slug}/schedule`}
                className="text-sm font-semibold text-orange-500 hover:underline"
              >
                {t('common.view_all_arrow')}
              </Link>
            </div>

            <MobileCardList
              rows={[...weeklyTeams]}
              rowKey={(team) => team.id}
              renderCard={(team) => (
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-1 rounded-full ${team.bar}`} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <span className="font-bold text-navy-900">#{team.no}</span>
                      <span className="text-sm font-semibold text-slate-700">{team.agent}</span>
                      <Badge tone={team.tone}>{team.origin}</Badge>
                      {!team.guide && (
                        <Badge tone="red" pulse>
                          {t('status.unassigned')}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {team.period} · {team.pax}명 · {team.flight}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {team.guide ? (
                      <Badge tone="pink">{team.guide}</Badge>
                    ) : (
                      <Button size="sm" disabled={!canCreateTeam} className="whitespace-nowrap">
                        {t('dashboard.assign_guide')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            />
          </Card>

          <Card padding="lg">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
                  <span className="text-orange-500">🤖</span>
                  {t('dashboard.ai.title')}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">{t('dashboard.ai.subtitle')}</p>
              </div>
              <Badge tone="green">● {t('dashboard.ai.running')}</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-1 text-xs text-slate-500">
                  {t('dashboard.ai.completed_today')}
                </div>
                <div className="num-tabular text-2xl font-bold text-navy-900">
                  127
                  <span className="ml-1 text-sm text-slate-500">{t('unit.item')}</span>
                </div>
                <div className="mt-2 text-xs text-slate-600">OCR 89 · PDF 12 · Kakao 26</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-1 text-xs text-slate-500">{t('dashboard.ai.queue')}</div>
                <div className="num-tabular text-2xl font-bold text-orange-500">
                  8<span className="ml-1 text-sm text-slate-500">{t('unit.item')}</span>
                </div>
                <div className="mt-2 text-xs text-slate-600">{t('dashboard.ai.avg_time')} 12s</div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {aiActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 border-b border-slate-100 py-1.5 text-sm last:border-b-0"
                >
                  <span className={activity.tone}>{activity.icon}</span>
                  <span className="flex-1 text-slate-700">{activity.text}</span>
                  <span className="text-xs text-slate-400">{activity.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card padding="lg">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
                <span className="text-yellow-500">🟡</span>
                {t('dashboard.queue.title')}
              </h2>
              <Badge tone="yellow">7</Badge>
            </div>
            <div className="space-y-3">
              {notificationQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-yellow-100 bg-yellow-50/50 p-3"
                >
                  <span className="text-lg">📨</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-navy-900">{t(item.titleKey)}</div>
                    <div className="truncate text-xs text-slate-500">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="mb-4 text-base font-bold text-navy-900">{t('dashboard.quick.title')}</h2>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.key}
                  href={`/w/${params.slug}/${action.href}`}
                  aria-disabled={!canCreateTeam && action.key !== 'report'}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 text-left transition hover:bg-slate-50"
                >
                  <span className="text-lg">{action.emoji}</span>
                  <span className="text-sm font-semibold text-navy-900">{t(action.labelKey)}</span>
                </Link>
              ))}
            </div>
          </Card>

          <div className="rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 p-6 text-white">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
              💱 {t('dashboard.fx.title')}
            </h2>
            <div className="space-y-3">
              {fxRates.map((rate) => (
                <div key={rate.pair} className="flex items-baseline justify-between">
                  <span className="text-sm text-slate-300">{rate.pair}</span>
                  <span className="num-tabular text-xl font-bold">
                    {rate.value}
                    <span className={`ml-2 text-xs ${rate.tone}`}>{rate.delta}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-400">
              2026-04-26 02:48
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
