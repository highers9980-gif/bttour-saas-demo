import { Badge, Button, Card, EmptyState, KpiCard, todayIso } from '@bttour/ui';
import { canMutateSettlement, type MonthlyInsightStatistics } from '@bttour/shared';
import { prisma } from '@bttour/db';
import Link from 'next/link';
import { InsightGenerateButton } from '@/components/insights/InsightGenerateButton';
import { requireWorkspace } from '@/lib/workspace-guard';

function parsePeriod(raw?: string) {
  const fallback = todayIso().slice(0, 7);
  const period = raw && /^\d{4}-\d{2}$/.test(raw) ? raw : fallback;
  const [year, month] = period.split('-').map(Number);
  return {
    label: period,
    periodYear: year ?? Number(fallback.slice(0, 4)),
    periodMonth: month ?? Number(fallback.slice(5, 7)),
  };
}

// 인사이트 페이지는 정밀 모드 — KPI 카드와 AI 본문의 숫자가 일치하도록
// 5000원 라운딩 없이 원본값을 천단위 콤마로 표시. 다른 운영 대시보드는
// 가독성 위해 formatWonDisplay({ roundStep: 5000 }) 유지.
function money(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function asStatistics(value: unknown): MonthlyInsightStatistics | null {
  if (!value || typeof value !== 'object') return null;
  return value as MonthlyInsightStatistics;
}

type MarkdownBlock =
  | { type: 'header'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; text: string };

// AI가 빈 줄 없이 ## 헤더와 본문을 붙여서 출력해도 정확히 분리하도록
// 라인 단위 파서. ## 헤더 / - 리스트 / 일반 단락 3종을 각각 블록으로.
function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.split('\n').map((line) => line.trim());
  let pending: { type: 'list' | 'paragraph'; lines: string[] } | null = null;

  function flush() {
    if (!pending) return;
    if (pending.type === 'list') {
      blocks.push({
        type: 'list',
        items: pending.lines.map((line) => line.replace(/^-\s+/, '')),
      });
    } else if (pending.lines.length > 0) {
      blocks.push({ type: 'paragraph', text: pending.lines.join(' ') });
    }
    pending = null;
  }

  for (const line of lines) {
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith('## ')) {
      flush();
      blocks.push({ type: 'header', text: line.slice(3).trim() });
    } else if (line.startsWith('- ')) {
      if (pending?.type !== 'list') {
        flush();
        pending = { type: 'list', lines: [] };
      }
      pending.lines.push(line);
    } else {
      if (pending?.type !== 'paragraph') {
        flush();
        pending = { type: 'paragraph', lines: [] };
      }
      pending.lines.push(line);
    }
  }
  flush();
  return blocks;
}

function MarkdownView({ markdown }: { markdown: string }) {
  const blocks = parseMarkdownBlocks(markdown);

  return (
    <div className="space-y-4 text-sm leading-7 text-slate-700">
      {blocks.map((block, index) => {
        if (block.type === 'header') {
          return (
            <h2
              key={`h-${index}`}
              className="border-l-4 border-navy-900 pl-3 text-base font-bold text-navy-900"
            >
              {block.text}
            </h2>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={`l-${index}`} className="list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`p-${index}`} className="whitespace-pre-line">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

export default async function InsightsPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { period?: string };
}) {
  const { label, periodYear, periodMonth } = parsePeriod(searchParams?.period);
  const { workspace, role } = await requireWorkspace(params.slug, 'VIEWER');
  const canMutate = canMutateSettlement(role);

  const [settings, primaryAiConfig, latestInsight] = await Promise.all([
    prisma.workspaceAiSettings.findUnique({ where: { workspaceId: workspace.id } }),
    prisma.workspaceAiProviderConfig.findUnique({
      where: { workspaceId_role: { workspaceId: workspace.id, role: 'PRIMARY' } },
    }),
    prisma.monthlyInsight.findFirst({
      where: { workspaceId: workspace.id, periodYear, periodMonth },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const aiActive = Boolean(settings?.enabled && primaryAiConfig);
  const statistics = asStatistics(latestInsight?.statisticsJson);
  const summaryMarkdown = latestInsight?.summaryMarkdown ?? '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-navy-900">월말 인사이트</h1>
          <p className="text-xs text-slate-500">
            Hermes AI가 월별 매출·비용·정산·미수금을 분석합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <form className="flex items-center gap-2">
            <input
              type="month"
              name="period"
              defaultValue={label}
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
            <Button type="submit" variant="outline">
              조회
            </Button>
          </form>
          <InsightGenerateButton
            aiActive={aiActive}
            canMutate={canMutate}
            periodMonth={periodMonth}
            periodYear={periodYear}
            workspaceSlug={params.slug}
          />
        </div>
      </div>

      {!aiActive && (
        <Card className="border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-bold text-amber-900">AI 설정이 필요합니다</h2>
              <p className="mt-1 text-sm text-amber-800">
                설정 &gt; AI에서 Provider 키를 등록하고 활성화해야 월말 인사이트를 생성할 수
                있습니다.
              </p>
            </div>
            <Link
              href={`/w/${params.slug}/settings/ai`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white"
            >
              AI 설정으로 이동
            </Link>
          </div>
        </Card>
      )}

      {!latestInsight && aiActive && (
        <Card className="p-8">
          <EmptyState
            title="아직 생성된 인사이트가 없습니다"
            description={`${periodYear}년 ${periodMonth}월 데이터를 기준으로 월말 보고서를 생성하세요.`}
            action={
              <InsightGenerateButton
                aiActive={aiActive}
                canMutate={canMutate}
                periodMonth={periodMonth}
                periodYear={periodYear}
                workspaceSlug={params.slug}
              />
            }
          />
        </Card>
      )}

      {latestInsight && (
        <>
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      latestInsight.status === 'SUCCESS'
                        ? 'green'
                        : latestInsight.status === 'FAILED'
                          ? 'red'
                          : 'amber'
                    }
                  >
                    {latestInsight.status}
                  </Badge>
                  <span className="text-sm font-semibold text-navy-900">
                    {periodYear}년 {periodMonth}월
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  생성 {formatDateTime(latestInsight.createdAt)} · {latestInsight.provider ?? '-'} /{' '}
                  {latestInsight.modelName ?? '-'} · {latestInsight.latencyMs ?? 0}ms
                </p>
              </div>
              <InsightGenerateButton
                aiActive={aiActive}
                canMutate={canMutate}
                periodMonth={periodMonth}
                periodYear={periodYear}
                workspaceSlug={params.slug}
              />
            </div>
            {latestInsight.status === 'FAILED' && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {latestInsight.errorMessage ?? '인사이트 생성에 실패했습니다.'}
              </div>
            )}
          </Card>

          {statistics && (
            <div className="grid gap-4 md:grid-cols-4">
              <KpiCard
                label="매출"
                value={money(statistics.revenue.totalMinor)}
                unit="원"
                emoji="💰"
              />
              <KpiCard
                label="비용"
                value={money(statistics.expense.totalMinor)}
                unit="원"
                emoji="🧾"
              />
              <KpiCard label="팀수" value={statistics.revenue.teamCount} unit="팀" emoji="👥" />
              <KpiCard
                label="미수금"
                value={money(statistics.receivables.totalOutstandingMinor)}
                unit="원"
                emoji="💳"
                footer={`연체 ${statistics.receivables.overdueCount}건`}
              />
            </div>
          )}

          {summaryMarkdown ? (
            <Card className="p-6">
              <MarkdownView markdown={summaryMarkdown} />
            </Card>
          ) : (
            <Card className="p-8">
              <EmptyState title="표시할 요약이 없습니다" variant="inline" />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
