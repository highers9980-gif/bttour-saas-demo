'use client';

import { Badge, Button, Field, Modal, TextField } from '@bttour/ui';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  confirmReceiptExpenseAction,
  scanReceiptAction,
  type ReceiptScanActionResult,
} from '@/app/(workspace)/w/[slug]/expense/actions';

type Confidence = 'high' | 'medium' | 'low';

interface ReceiptItemDraft {
  name: string;
  quantity: string;
  price: string;
}

interface ReceiptDraft {
  storeName: string;
  totalAmount: string;
  taxAmount: string;
  receiptDate: string;
  confidence: Confidence;
  items: ReceiptItemDraft[];
  memo: string;
}

const MAX_BYTES = 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function confidenceTone(confidence: Confidence) {
  if (confidence === 'high') return 'green' as const;
  if (confidence === 'medium') return 'amber' as const;
  return 'red' as const;
}

function confidenceLabel(confidence: Confidence) {
  if (confidence === 'high') return '높음';
  if (confidence === 'medium') return '보통';
  return '낮음';
}

function initialDraft(): ReceiptDraft {
  return {
    storeName: '',
    totalAmount: '',
    taxAmount: '',
    receiptDate: '',
    confidence: 'low',
    items: [],
    memo: '',
  };
}

function resultToDraft(result: Extract<ReceiptScanActionResult, { ok: true }>['data']) {
  return {
    storeName: result.storeName ?? '',
    totalAmount: result.totalAmount ? String(result.totalAmount) : '',
    taxAmount: result.taxAmount ? String(result.taxAmount) : '',
    receiptDate: result.receiptDate ?? '',
    confidence: result.confidence,
    items: result.items.length
      ? result.items.map((item) => ({
          name: item.name,
          quantity: item.quantity ? String(item.quantity) : '',
          price: item.price ? String(item.price) : '',
        }))
      : [{ name: '', quantity: '', price: '' }],
    memo: result.rawText ? `OCR 원문: ${result.rawText}` : '',
  } satisfies ReceiptDraft;
}

export function ReceiptScanModal({
  canScan,
  workspaceSlug,
}: {
  canScan: boolean;
  workspaceSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReceiptDraft>(() => initialDraft());
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [isScanning, startScanTransition] = useTransition();
  const [isConfirming, startConfirmTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canConfirm = useMemo(
    () => Boolean(jobId && draft.totalAmount.trim()),
    [draft.totalAmount, jobId],
  );

  function resetModal() {
    setFile(null);
    setJobId(null);
    setDraft(initialDraft());
    setError(null);
    setDoneMessage(null);
  }

  function handleClose() {
    setOpen(false);
    resetModal();
  }

  function selectFile(nextFile: File | null) {
    setError(null);
    setDoneMessage(null);
    setJobId(null);
    setDraft(initialDraft());

    if (!nextFile) {
      setFile(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(nextFile.type)) {
      setError('JPG, PNG, WebP 이미지만 업로드할 수 있습니다.');
      return;
    }
    if (nextFile.size > MAX_BYTES) {
      setError('영수증 이미지는 1MB 이하만 업로드할 수 있습니다.');
      return;
    }
    setFile(nextFile);
  }

  function runScan() {
    if (!file) {
      setError('영수증 이미지 파일을 먼저 선택해 주세요.');
      return;
    }

    setError(null);
    setDoneMessage(null);
    const formData = new FormData();
    formData.append('image', file);

    startScanTransition(async () => {
      const result = await scanReceiptAction(workspaceSlug, formData);
      if (!result.ok) {
        setJobId(result.jobId ?? null);
        setError(result.error);
        return;
      }
      setJobId(result.jobId);
      setDraft(resultToDraft(result.data));
    });
  }

  function updateItem(index: number, key: keyof ReceiptItemDraft, value: string) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  }

  function addItem() {
    setDraft((current) => ({
      ...current,
      items: [...current.items, { name: '', quantity: '', price: '' }],
    }));
  }

  function removeItem(index: number) {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function confirmExpense() {
    if (!jobId) {
      setError('먼저 AI 인식을 실행해 주세요.');
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.set('workspaceSlug', workspaceSlug);
    formData.set('storeName', draft.storeName);
    formData.set('title', draft.storeName ? `${draft.storeName} 영수증` : '영수증 비용');
    formData.set('category', '영수증');
    formData.set('totalAmount', draft.totalAmount);
    formData.set('taxAmount', draft.taxAmount);
    formData.set('receiptDate', draft.receiptDate);
    formData.set('memo', draft.memo);
    draft.items.forEach((item) => {
      formData.append('itemName', item.name);
      formData.append('itemQuantity', item.quantity);
      formData.append('itemPrice', item.price);
    });

    startConfirmTransition(async () => {
      const result = await confirmReceiptExpenseAction(jobId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDoneMessage('비용 목록에 등록했습니다.');
      setOpen(false);
      resetModal();
    });
  }

  return (
    <>
      <Button variant="secondary" disabled={!canScan} onClick={() => setOpen(true)}>
        영수증 스캔
      </Button>
      <Modal
        open={open}
        onClose={handleClose}
        title="영수증 스캔"
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={handleClose}>
              닫기
            </Button>
            <Button variant="secondary" disabled={!file || isScanning} onClick={runScan}>
              {isScanning ? '분석 중...' : 'AI 인식'}
            </Button>
            <Button disabled={!canConfirm || isConfirming} onClick={confirmExpense}>
              {isConfirming ? '등록 중...' : '비용 등록'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div className="font-semibold">인식 실패</div>
              <p className="mt-1">{error}</p>
              <Button className="mt-3" size="sm" variant="outline" onClick={handleClose}>
                수동으로 입력하기
              </Button>
            </div>
          )}
          {doneMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {doneMessage}
            </div>
          )}

          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              selectFile(event.dataTransfer.files.item(0));
            }}
            className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => selectFile(event.target.files?.item(0) ?? null)}
            />
            <div className="text-sm font-semibold text-navy-900">
              영수증 이미지를 끌어오거나 파일을 선택하세요
            </div>
            <div className="mt-1 text-xs text-slate-500">JPG, PNG, WebP · 최대 1MB</div>
            <Button
              className="mt-4"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              파일 선택
            </Button>
            {file && <div className="mt-3 text-xs text-slate-600">{file.name}</div>}
          </div>

          {previewUrl && (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <img
                src={previewUrl}
                alt="영수증 미리보기"
                className="max-h-64 w-full object-contain bg-white"
              />
            </div>
          )}

          {isScanning && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              AI가 영수증을 분석 중입니다...
            </div>
          )}

          {jobId && (
            <div className="space-y-4 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-navy-900">추출 결과 확인</h3>
                <Badge tone={confidenceTone(draft.confidence)}>
                  신뢰도 {confidenceLabel(draft.confidence)}
                </Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="가맹점">
                  <TextField
                    value={draft.storeName}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, storeName: event.target.value }))
                    }
                  />
                </Field>
                <Field label="날짜">
                  <TextField
                    type="date"
                    value={draft.receiptDate}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, receiptDate: event.target.value }))
                    }
                  />
                </Field>
                <Field label="금액">
                  <TextField
                    type="number"
                    value={draft.totalAmount}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, totalAmount: event.target.value }))
                    }
                  />
                </Field>
                <Field label="세액">
                  <TextField
                    type="number"
                    value={draft.taxAmount}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, taxAmount: event.target.value }))
                    }
                  />
                </Field>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-navy-900">항목</h4>
                  <Button size="sm" variant="outline" onClick={addItem}>
                    항목 추가
                  </Button>
                </div>
                <div className="space-y-2">
                  {draft.items.map((item, index) => (
                    <div
                      key={`${index}-${item.name}`}
                      className="grid gap-2 rounded-lg border border-slate-100 p-2 sm:grid-cols-[1fr_90px_120px_auto]"
                    >
                      <TextField
                        placeholder="항목명"
                        value={item.name}
                        onChange={(event) => updateItem(index, 'name', event.target.value)}
                      />
                      <TextField
                        placeholder="수량"
                        type="number"
                        value={item.quantity}
                        onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                      />
                      <TextField
                        placeholder="금액"
                        type="number"
                        value={item.price}
                        onChange={(event) => updateItem(index, 'price', event.target.value)}
                      />
                      <Button size="sm" variant="ghost" onClick={() => removeItem(index)}>
                        삭제
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Field label="메모">
                <textarea
                  value={draft.memo}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, memo: event.target.value }))
                  }
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
                />
              </Field>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
