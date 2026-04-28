# 아키텍처 — bttour-saas

> 이 문서는 Phase 0 골격이 안착한 시점(2026-04-28)의 1차안이며, Phase 1 이후 도메인이 추가될 때 갱신한다.

## 1. 한눈에 보기

```
┌──────────────────────┐    ┌──────────────────────┐
│   apps/web           │    │   apps/api           │
│   Next.js 14         │    │   NestJS             │
│   - 마케팅 + 워크스페이스   │    │   - 도메인 비즈니스 (Phase 2~)
│   - Server Actions   │    │   - 워커/큐 (Phase 4~) │
│   - NextAuth v5      │    │   - Hermes AI 슈퍼바이저   │
└────────┬─────────────┘    └────────┬─────────────┘
         │                           │
         └──────── @bttour/db (Prisma) ───────┐
                                              │
                       PostgreSQL ◄───────────┘
```

`apps/web`이 1차 진입점이며, Phase 0~1에서 가입/로그인/워크스페이스/페이지 변환을 모두 담당한다. NestJS API는 도메인 비즈니스가 복잡해지는 Phase 2 이후 본격 가동된다.

## 2. 모노레포 구성

| 패키지 | 역할 | Phase 0 상태 |
|---|---|---|
| `apps/web` | Next.js 14 App Router. 마케팅 랜딩 + 워크스페이스 콘솔. | ✅ 골격 + 가입/로그인/대시보드 placeholder |
| `apps/api` | NestJS. 도메인 비즈니스, 워커, AI supervisor. | ✅ 스켈레톤 + /health |
| `packages/ui` | 디자인 시스템(Tailwind preset + 공통 컴포넌트). | ✅ 9종 컴포넌트 + 토큰 |
| `packages/db` | Prisma 스키마 + 클라이언트 싱글턴. | ✅ Workspace/Plan/Subscription/AICredit/AuditLog |
| `packages/shared` | 도메인 타입 + 정산 순수 함수. Codex 정산 공식 명세 반영. | ✅ 8종 정산 함수 |

## 3. 라우트 구조 (apps/web)

```
src/app/
├── (marketing)/         # Phase 1: 도면 index.html 변환
├── (auth)/
│   ├── signin/page.tsx  # ✅ 골격
│   └── signup/page.tsx  # ✅ 골격 (워크스페이스 생성 트랜잭션)
├── (workspace)/
│   └── w/
│       ├── page.tsx     # ✅ 멤버십 0/1/N 분기
│       └── [slug]/
│           ├── layout.tsx          # ✅ 인증 게이트 + WorkspaceShell
│           ├── dashboard/page.tsx  # ✅ placeholder
│           ├── schedule/...        # Phase 1
│           ├── guide-settlement/... # Phase 1
│           └── ... (13 모듈)
├── api/auth/[...nextauth]/route.ts # ✅ NextAuth v5
└── page.tsx             # 임시 랜딩
```

라우트 그룹 `(marketing)/(auth)/(workspace)`는 URL에 영향 없이 레이아웃을 분리하기 위함. Phase 1에서 각 라우트 그룹에 자체 `layout.tsx`를 둔다.

## 4. 멀티테넌시

- 모든 워크스페이스 라우트는 `/w/[slug]`. 슬러그는 사람이 읽는 식별자.
- 모든 도메인 테이블은 `workspaceId` 외래키 필수 (Phase 2 이후 추가될 모델 포함).
- 사용자는 `Membership`을 통해 N개 워크스페이스에 속할 수 있음. `(workspaceId, userId)` UNIQUE.
- 권한: `OWNER` > `ADMIN` > `MANAGER` > `VIEWER` (`@bttour/shared/types/rbac`).
- 가입 동선:
  1. `/signup` → User + Workspace + OWNER Membership을 한 트랜잭션으로 생성
  2. 추후 초대(`Invitation`)를 통한 가입 = `Membership.status: PENDING` → 관리자 승인 후 `ACTIVE`
- `apps/web/src/middleware.ts`가 `/w/*` 라우트의 인증 요구를 강제한다.

## 5. 인증 (NextAuth v5)

- Adapter: `@auth/prisma-adapter` → `User/Account/Session/VerificationToken` 자동 사용
- Strategy: `jwt` (서버 컴포넌트에서 `auth()` 사용 시 DB 왕복 없이 검증)
- Phase 0 Provider: Credentials (비밀번호 검증 미구현 — 시드용)
- Phase 3 추가 예정:
  - 카카오 OAuth (환경변수 셋팅 시 자동 활성)
  - 이메일 매직 링크
  - 비밀번호 bcrypt 해시 + 정식 가입 폼

## 6. 결제 / 플랜 / AI 크레딧

- `Plan` 카탈로그: `STARTER/PRO/PRO_AI/BUSINESS_AI` (도면 PRICING 섹션 기준, `prisma/seed.ts`로 upsert).
- `Subscription`: 워크스페이스 1:1, 토스페이먼츠 빌링키는 `externalBillingKey` 컬럼.
- `AiCreditLedger`: 입출입 라인 누적 + `balanceAfter` 캐시. 잔액 = 마지막 ledger의 `balanceAfter`.
- Phase 3에서 토스페이먼츠 webhook → Subscription 갱신 + AiCreditLedger GRANT 로직 추가.

## 7. 도메인 모델 (Phase 2 스키마 추가 완료 — 2026-04-28)

`codex-analysis/03-domain-field-mapping.md` + `docs/POLICY_DECISIONS.md` 11개 결정사항 반영.

### 마스터 (6)
- `Partner` (kind: AGENCY/HOTEL_VENDOR/VEHICLE_VENDOR/SHOPPING_CENTER/CUSTOMER/OTHER)
- `Guide` (region/phone/language/colorKey)
- `Hotel` (address/phone/rank/region)
- `Vehicle` (label/vehicleType/plateNumber/region)
- `Driver` (vehicleId/name/phone)
- `ShoppingCenter` (category/sortOrder)

### 운영 (4)
- `TourTeam` — 핵심. `@@unique([workspaceId, year, month, teamNo])` (정책 7-A)
- `TeamGuideAssignment` (LEAD/SUB/INTERPRETER, TENTATIVE/CONFIRMED/CANCELLED)
- `TeamHotelStay` (source: MANUAL/SCHEDULE_AUTO — 호텔캘린더 dashed/solid 구분)
- `TeamVehicleAssignment` (totalWon/vatWon/totalWithVatWon)

### 정산 (6)
- `GuideSettlement` + `GuideSettlementPayment` (과지급 금지 — 코드 레벨 검증, 정책 3-A)
- `VehicleSettlement` + `VehicleSettlementPayment` (VAT round, 정책 1-A)
- `ShoppingSale` + `ShoppingCommission` (VAT round 통일 — 기존 ERP에서 trunc였던 것 정책으로 round)

### 회계 (6)
- `FinanceWallet` (currentBalanceMinor 컬럼 폐지 — 정책 6-A)
- `FinanceLedgerLine` (entryType: DEPOSIT/WITHDRAWAL/CARD_USE/CARD_PAYMENT/FX_OUT/FX_IN/**BALANCE_ADJUSTMENT**/OTHER)
- `Receivable` + `ReceivablePayment` (단일 다중통화 — currencyCode + amountMinor, 정책 4-A)
- `Expense` + `ExpenseAttachment` (OCR ocrStatus/ocrJson은 Phase 4에서 채움)

### 분석 (1)
- `ExchangeRate` (workspaceId nullable — 전역 시스템 캐시 가능)

### 공통 패턴
- 모든 도메인 테이블에 **`workspaceId` 외래키 필수** (멀티테넌시 격리)
- 마스터 외래키는 nullable + **`*NameSnapshot` 컬럼 동시 보유** (정책 8-C)
- soft delete (`deletedAt`) 일괄 적용
- 핵심 조회 쿼리에 인덱스 명시

### 폐기한 모델 (사용 안 함)
기존 ERP의 다음 모델은 **신규 SaaS에서 만들지 않음** (정책 5-A):
- `SettlementMonthSheet`, `SettlementLine` (JSON 시트 컬럼)
- `MonthlyLedger` (외부 sync 전용)
- `BookingShoppingMonthSheet`, `BookingShoppingRow` (xlsx import staging)

### 다음 단계
- `npm run db:generate` → Prisma Client 재생성
- `npm run db:migrate` → 마이그레이션 생성 (`prisma/migrations/<timestamp>_phase2_domain/`)
- Phase 2 시작 시점에 도메인 시드 + Server Actions 본구현

## 8. 외부 의존 정책

| 항목 | 정책 |
|---|---|
| Google Drive sync | 사용 안 함. 도입 검토 자체 차단. |
| Google Sheets writeback | 사용 안 함. |
| 정산봇 proxy/import | Phase 4 이후 optional integration으로만. |
| xlsx import | Phase 4 이후 선택 기능. 핵심 데이터 흐름은 입력형. |
| 카카오 알림톡 / Zalo / WeChat | Phase 4. 추상 어댑터 인터페이스로. |

## 9. 데이터 흐름

```
사용자 입력 (apps/web 폼)
  → Server Action 또는 NestJS API
  → @bttour/shared 정산 함수로 계산
  → @bttour/db Prisma로 영속화
  → workspaceId 격리 보장 (각 쿼리에 무조건 포함)
  → AuditLog 기록
```

## 10. 보안 / RBAC 가드

- 라우트 레벨: `middleware.ts`가 `/w/*` 인증 요구
- 페이지 레벨: `layout.tsx`가 멤버십 존재 검증
- 액션 레벨: 각 Server Action 또는 NestJS 컨트롤러에서 `hasAtLeast(role, REQUIRED)` 체크
- 데이터 레벨: 모든 Prisma 쿼리는 `where: { workspaceId }` 필수

## 11. 알려진 정책 결정 미결

`docs/POLICY_DECISIONS.md` 참고. 가장 시급한 5가지:
1. VAT 10% 소수 처리: round / trunc / floor
2. 5천원 반올림 적용 범위 (표시 전용 vs 저장값)
3. 가이드 정산 과지급 허용 여부
4. 미수금 다중통화 처리 방식
5. 정산봇/엑셀 import의 Phase 1 포함 여부 (현재 정책: 제외)
