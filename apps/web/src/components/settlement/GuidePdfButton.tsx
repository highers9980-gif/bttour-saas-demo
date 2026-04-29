'use client';

import { Button, Field, Modal, TextField } from '@bttour/ui';
import { useState, useTransition } from 'react';
import {
  generateGuideSettlementPdfAction,
  type GenerateGuideSettlementPdfResult,
} from '@/app/(workspace)/w/[slug]/guide-settlement/actions';

function downloadBase64Pdf(fileName: string, base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function GuidePdfButton({
  canExport,
  defaultPeriodEnd,
  defaultPeriodStart,
  guideId,
  guideName,
  workspaceSlug,
}: {
  canExport: boolean;
  defaultPeriodEnd: string;
  defaultPeriodStart: string;
  guideId: string;
  guideName: string;
  workspaceSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleResult(result: GenerateGuideSettlementPdfResult) {
    if (!result.ok) {
      setError(result.error);
      return;
    }
    downloadBase64Pdf(result.fileName, result.base64);
    setOpen(false);
    setError(null);
  }

  function generatePdf() {
    setError(null);
    const formData = new FormData();
    formData.set('guideId', guideId);
    formData.set('periodStart', periodStart);
    formData.set('periodEnd', periodEnd);

    startTransition(async () => {
      const result = await generateGuideSettlementPdfAction(workspaceSlug, formData);
      handleResult(result);
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" disabled={!canExport} onClick={() => setOpen(true)}>
        정산서 PDF
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="가이드 정산서 PDF"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button disabled={isPending} onClick={generatePdf}>
              {isPending ? '생성 중...' : 'PDF 다운로드'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold text-slate-500">정산 대상</div>
            <div className="mt-1 font-bold text-navy-900">{guideName}</div>
          </div>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="시작일" required>
              <TextField
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                required
              />
            </Field>
            <Field label="종료일" required>
              <TextField
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
                required
              />
            </Field>
          </div>
          <p className="text-xs text-slate-500">
            PDF는 저장하지 않고 매번 재생성합니다. 생성 이력과 감사 로그만 남습니다.
          </p>
        </div>
      </Modal>
    </>
  );
}
