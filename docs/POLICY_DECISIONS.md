# 정책 결정 사항

> 작성: 2026-04-28 / 결정자: Claude(사용자 위임) / 출처: Codex `codex-analysis/06-policy-decisions-options.md`
>
> 11개 정책 항목 모두 결정 완료. 디폴트는 코드에 반영되어 있으며, 변경하려면 본 문서 갱신 후 코드 동기 변경.
>
> **일관된 결정 원칙**: MVP 단순함 우선 + 운영 중 필요해지면 확장 (over-engineering 회피).

---

## 결정 표 (요약)

| # | 항목 | 결정 | 디폴트 코드 위치 |
|---|---|---|---|
| 1 | VAT 10% 소수 처리 | **A. round** | `packages/shared/src/finance/vat.ts` |
| 2 | 5천원 반올림 적용 | **A. 표시 전용** | `packages/shared/src/finance/won-display.ts` |
| 3 | 가이드/차량 과지급 허용 | **A. 금지** | `packages/shared/src/finance/settlement.ts` |
| 4 | 미수금 다중통화 | **A. 단일 Receivable + currencyCode** | (Phase 2 모델) |
| 5 | xlsx/Drive import | **A. Phase 1 제외** (Phase 5 이관 스크립트) | — |
| 6 | FinanceWallet 잔액 override | **A. 제거** (BALANCE_ADJUSTMENT ledger로 대체) | (Phase 2 모델) |
| 7 | TourTeam.teamNo unique | **A. workspace + year + month** | (Phase 2 모델) |
| 8 | 마스터 강제 | **C. 선택 + snapshot 허용** | (Phase 2 모델) |
| 9 | AI/OCR/Kakao Phase 1 범위 | **A. UI 상태만** | — |
| 10 | RBAC 세분화 | **A. 4 role + 인-코드 정책 함수** | `packages/shared/src/types/rbac.ts` |
| 11 | 결제 PG 연동 시점 | **A. Phase 1 수동** (Phase 3에서 토스페이먼츠) | — |

---

## 1. VAT 10% 소수 처리 — A. round

`Math.round(amount * 0.1)`로 통일. `packages/shared/src/finance/vat.ts`의 `DEFAULT_VAT_POLICY = { rounding: 'round', rate: 0.1 }`.

기존 ERP에서 차량비는 round, 쇼핑 수수료는 trunc로 불일치했던 것을 round로 통일. 정책 객체로 분리해 두어 향후 워크스페이스별 변경 가능.

## 2. 5천원 반올림 적용 — A. 표시 전용

DB는 원 단위 정수 그대로 저장, 화면 표시 시에만 `formatWonDisplay(amount, { roundStep: 5000 })`로 반올림. 입력 정규화 `normalizeWonInput`은 절사만(반올림 X).

**Codex C 옵션(calculatedWon + confirmedWon 두 컬럼) 거절 사유**: MVP 과설계. 정산 확정은 운영 프로세스이지 데이터 모델 책임이 아님. 원값 보존이 감사·재계산 모두에 유리.

## 3. 가이드/차량 과지급 허용 — A. 금지

`validateSettlementPayment`이 `paid + next > total`이면 `OverpaymentError` throw. `packages/shared/src/finance/settlement.ts`.

운영 중 예외가 잦아지면 C(ADMIN override)로 확장. 현재는 단순함 우선.

## 4. 미수금 다중통화 — A. 단일 Receivable 다중통화

`Receivable` 모델은 `currencyCode: CurrencyCode` + `amountMinor: Int`로. 한 거래처/투어에 KRW와 USD가 있으면 행 2개로 저장. `ReceivablePayment`도 동일 구조.

## 5. xlsx/Drive import — A. Phase 1 제외

Phase 1~4는 직접 입력 + 폼 + 워크스페이스 내부 작성만. 기존 `2023 월별합계표 (1).xlsx`, `BOOKING LIST 2023 (5).xlsx` 데이터는 **Phase 5에서 1회성 마이그레이션 스크립트**로 BT TOUR 워크스페이스에 적재. 매핑 UI 자체를 만들지 않음.

**Codex B(초기 seed import) 거절 사유**: 매핑 UI를 정식 페이지로 만드는 작업량이 크고, 한 번 쓰고 버릴 기능. 스크립트 1회 실행이 더 합리.

## 6. FinanceWallet 잔액 override — A. 제거

`currentBalanceMinor` 컬럼 자체 만들지 않음. 잔액은 항상 `openingBalanceMinor + sum(ledgerLines.amountMinor)`. 실제 통장 잔액과 어긋나면 `LedgerEntryType.BALANCE_ADJUSTMENT` 라인을 추가해 차이를 ledger에 명시 — AuditLog는 자동.

`packages/shared/src/finance/wallet.ts`의 `computeWalletBalance`는 이미 currentBalanceMinor가 nullable로 되어 있음 → Phase 2 schema에서 컬럼 자체 제외.

**Codex C(이름 변경 + override 유지) 거절 사유**: override 자체가 회계적 안티 패턴. ledger line으로 표현 가능한 걸 별도 컬럼으로 두면 진실 두 군데가 됨.

## 7. TourTeam.teamNo unique — A. workspace + year + month

`@@unique([workspaceId, year, month, teamNo])`. URL 등 외부 식별은 cuid `id` 사용. 월별 팀번호 재사용은 기존 운영 관행과 일치.

## 8. 마스터 강제 — C. 선택 + snapshot

`Guide`, `Hotel`, `Vehicle`, `Driver`, `Partner`, `ShoppingCenter` 마스터 등록 권장하되 미등록 시 문자열 snapshot 허용:

```prisma
model TeamGuideAssignment {
  guideId       String?  // 마스터 연결 시
  guideNameSnapshot String  // 항상 저장 (히스토리/legacy)
}
```

이름만 입력된 행은 `unmatched` 상태로 사용자 관리에 노출. 나중에 마스터로 병합하는 UI는 Phase 3 이후.

## 9. AI/OCR/Kakao Phase 1 범위 — A. UI 상태만

도면의 Hermes AI 카드, 알림톡 큐 위젯, 영수증 업로드 버튼 등은 모두 mock 상태로만 표시. `interface NotificationAdapter`, `interface OcrAdapter` 같은 추상 인터페이스도 만들지 않음.

**Codex B(adapter + mock) 거절 사유**: 인터페이스를 미리 정의하면 Phase 4 본 설계 시점에 제약. 실제 통합 단계에 한 번에 설계가 더 좋은 결정 도출.

## 10. RBAC — A. 4 role + 인-코드 정책 함수

DB에는 `Role enum { OWNER, ADMIN, MANAGER, VIEWER }`만. 권한 매트릭스 테이블이나 별도 config JSON 파일 없음. 권한 검사는 코드 함수로:

```ts
// packages/shared/src/types/rbac.ts
hasAtLeast(actual, required)

// 신규 (Phase 2에서 추가):
canChangeRole(actor: Role, target: Role): boolean
canManageBilling(role: Role): boolean
canApproveMembership(role: Role): boolean
```

**Codex C(config matrix 파일) 거절 사유**: 정책 함수가 더 타입 안전하고 테스트 쉬움. 도면의 권한 매트릭스 표는 화면 컴포넌트에서 정책 함수 호출 결과를 표로 렌더하면 됨.

## 11. 결제 PG 연동 — A. Phase 1 수동

Phase 1~2는 `Plan`, `Subscription` DB 모델만. 결제 PG 연동 없음. 사용자 본인이 첫 워크스페이스 운영하면서 외부 결제는 수동.

Phase 3에서 토스페이먼츠 빌링키 + 웹훅 + 자동 갱신 본구현.

---

## 결정 이력

- **2026-04-28** — 11개 항목 모두 결정. Claude가 사용자 위임 받아 일관 원칙(MVP 단순함 + 확장 가능성) 기준으로 판단. Codex 권장안과 6개 동일, 5개 다름(2, 5, 6, 9, 10).

## 변경 절차

위 결정을 바꾸려면:
1. 본 문서의 해당 섹션 갱신 + 결정 이력에 이유 + 일자 추가
2. 영향 받는 코드(`packages/shared/src/finance/`, Prisma 스키마 등) 동기 변경
3. 영향 받는 페이지/테스트 갱신
