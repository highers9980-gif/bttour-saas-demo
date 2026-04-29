'use server';

import { canMutateSettlement } from '@bttour/shared';
import { revalidatePath } from 'next/cache';
import { generateMonthlyInsightCore } from '@/lib/insights/generate';
import { assertWorkspace } from '@/lib/workspace-guard';

export type GenerateMonthlyInsightActionResult =
  | { ok: true; insightId: string; summaryMarkdown: string }
  | { ok: false; error: string };

function periodFromForm(formData: FormData) {
  const periodYear = Number(formData.get('periodYear'));
  const periodMonth = Number(formData.get('periodMonth'));

  if (!Number.isInteger(periodYear) || periodYear < 2020 || periodYear > 2100) {
    throw new Error('연도를 확인해 주세요.');
  }
  if (!Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12) {
    throw new Error('월은 1월부터 12월 사이여야 합니다.');
  }

  return { periodYear, periodMonth };
}

export async function generateMonthlyInsightAction(
  slug: string,
  formData: FormData,
): Promise<GenerateMonthlyInsightActionResult> {
  const { periodYear, periodMonth } = periodFromForm(formData);
  const { workspace, role, userId } = await assertWorkspace(slug, 'MANAGER');

  if (!canMutateSettlement(role)) {
    return { ok: false, error: '월말 인사이트를 생성할 권한이 없습니다.' };
  }

  const result = await generateMonthlyInsightCore({
    workspaceId: workspace.id,
    periodYear,
    periodMonth,
    actorUserId: userId,
    mode: 'USER',
  });

  revalidatePath(`/w/${slug}/insights`);

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    insightId: result.insightId,
    summaryMarkdown: result.summaryMarkdown,
  };
}
