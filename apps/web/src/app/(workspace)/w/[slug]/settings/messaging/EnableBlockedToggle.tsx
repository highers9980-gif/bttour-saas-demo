'use client';

import { Button, Modal } from '@bttour/ui';
import { useState } from 'react';

export function EnableBlockedToggle() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm"
      >
        <span>
          <span className="block font-semibold text-amber-900">활성화 토글</span>
          <span className="block text-xs text-amber-700">
            현재는 OFF 고정 · Phase 4 후반 활성화
          </span>
        </span>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-700">
          OFF
        </span>
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="현재는 사용할 수 없습니다"
        footer={
          <Button type="button" onClick={() => setOpen(false)}>
            확인
          </Button>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">
          카카오 알림톡은 설정값 저장까지만 준비되어 있습니다. 실제 활성화와 테스트 발송은 Phase 4
          후반에 제공됩니다.
        </p>
      </Modal>
    </>
  );
}
