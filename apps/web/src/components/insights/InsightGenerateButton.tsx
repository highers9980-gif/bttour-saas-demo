'use client';

import { Button } from '@bttour/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { generateMonthlyInsightAction } from '@/app/(workspace)/w/[slug]/insights/actions';

export function InsightGenerateButton({
  aiActive,
  canMutate,
  periodMonth,
  periodYear,
  workspaceSlug,
}: {
  aiActive: boolean;
  canMutate: boolean;
  periodMonth: number;
  periodYear: number;
  workspaceSlug: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const disabled = !canMutate || !aiActive || isPending;

  function generate() {
    setError(null);
    const formData = new FormData();
    formData.set('periodYear', String(periodYear));
    formData.set('periodMonth', String(periodMonth));

    startTransition(async () => {
      const result = await generateMonthlyInsightAction(workspaceSlug, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button disabled={disabled} onClick={generate} variant="secondary">
        {isPending ? 'AI가 분석 중입니다...' : '월말 인사이트 생성'}
      </Button>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
