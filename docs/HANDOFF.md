# Phase 1 진입 핸드오프

> 작성: 2026-04-28 / 작성자: Claude / 대상: Codex(GPT-5.5 high Pro) + 사용자

## Phase 0 완료 항목

| 영역 | 결과물 | 위치 |
|---|---|---|
| 모노레포 | apps/(web,api), packages/(ui,db,shared), docs/ | `bttour-saas/` |
| 디자인 토큰 | navy/orange/Pretendard/shadow/animation/grad/dot-grid | `packages/ui/src/tailwind-preset.ts` |
| 공통 컴포넌트 | Button, Card, KpiCard, Badge, MonthNavigator, OpsHeader, TopHeader, Sidebar, WorkspaceSwitcher | `packages/ui/src/components/` |
| Prisma 스키마 | User, Workspace, Membership, Invitation, Plan, Subscription, AiCreditLedger, AuditLog | `packages/db/prisma/schema.prisma` |
| 정산 함수 | formatWonDisplay, computeVat10, computeSettlementBalance, computePerPaxMinusUsd, computeShoppingCommissionTotals, computeReceivableBalance, computeWalletBalance, computeCardRemainingLimit (Codex 명세 반영) | `packages/shared/src/finance/` |
| Next.js 골격 | App Router + (marketing)/(auth)/(workspace) 그룹 + middleware | `apps/web/src/` |
| 워크스페이스 셸 | Sidebar 13개 메뉴 + TopHeader + 인증 게이트 | `apps/web/src/components/WorkspaceShell.tsx` + `app/(workspace)/w/[slug]/layout.tsx` |
| 인증 | NextAuth v5 + Prisma adapter + 가입 트랜잭션 | `apps/web/src/lib/auth.ts`, `app/(auth)/signup/page.tsx` |
| NestJS API | 스켈레톤 + /health | `apps/api/src/` |
| 시드 | Plan 카탈로그 4건 (STARTER/PRO/PRO_AI/BUSINESS_AI) | `packages/db/prisma/seed.ts` |

## Phase 1 시작 전 사용자가 결정해야 할 5가지

`docs/POLICY_DECISIONS.md` 참고:

1. VAT 10% 소수 처리 (round / trunc / floor)
2. 5천원 반올림 적용 범위 (표시 전용 / 저장값 포함)
3. 가이드 정산 과지급 허용 여부
4. 미수금 다중통화 처리 방식
5. 카카오 OAuth + 토스페이먼츠 활성화 시점 (Phase 1 / Phase 3)

## Phase 1 작업 — 도면 17페이지 React 변환

### 변환 우선순위 (Codex `01-bttour-saas-blueprint-inventory.md` §우선 변환 순서 기준)

1. `login.html`, `signup.html`, `dashboard.html`, `user-management.html` — 멀티테넌시/권한 흐름
2. `schedule.html`, `team-timeline.html`, `hotel-calendar.html` — 일정/팀 코어
3. `guide-settlement.html`, `vehicle.html`, `shopping-fee.html`, `receivables.html` — 정산
4. `finance.html`, `expense.html` — 회계
5. `revenue.html`, `statistics.html`, `guide-recommend.html` — 통계
6. `index.html` — 마케팅 랜딩

### 작업 분담

#### Codex 담당 (페이지 변환 양산)
- 페이지별 React 컴포넌트 작성 (한 페이지 한 PR)
- 각 페이지의 컴포넌트 트리·props는 Codex의 `04-priority-page-component-tree.md` 분석 명세 따름
- i18n 키는 `05-i18n-dictionary-draft.md`에서 추출
- mock 데이터는 `apps/web/src/lib/mocks/{page}.ts`로 분리해서 두기 — Phase 2에서 실 데이터로 교체
- `@bttour/ui` 컴포넌트 + 토큰만 사용. **새 색·그림자·폰트 추가 금지**
- 새 공통 컴포넌트가 필요하면 PR에서 알리고 Claude가 `@bttour/ui`로 승격

#### Claude 담당 (검토 + 보완)
- Codex PR 리뷰 (디자인 일관성, RBAC 가드, workspaceId 누락 등)
- 새 공통 컴포넌트(`DataTable`, `MobileCardList`, `ViewToggle`, `Modal`, `Toast`, `EmptyState`, `LanguageSwitcher`) 본승급
- next-intl 설정 + `apps/web/src/messages/` 구성
- middleware/layout의 RBAC 가드 보강
- 모바일 시안 (도면 부족분) 보강

### 충돌 방지 룰

- `tailwind-preset.ts`, `globals.css`, Prisma schema, NextAuth 설정은 Claude 단독 점유
- 페이지는 한 사람이 한 파일을 처음부터 끝까지 작성
- 새 토큰·새 공통 컴포넌트가 필요하면 코드 작성 전에 PR 코멘트로 요청

## 빌드/실행 (Phase 0 검증)

```bash
cd bttour-saas
npm install
cp .env.example .env
# DATABASE_URL을 로컬 Postgres 또는 Supabase/Neon으로 설정
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
# web: http://localhost:3000
# api: http://localhost:3001/api/health
```

## 알려진 제약

- Phase 0 Credentials provider는 비밀번호 검증 미구현 (이메일만으로 통과). Phase 3에서 bcrypt로 교체.
- `apps/web/src/app/page.tsx`는 임시 랜딩. Phase 1에서 `(marketing)/page.tsx`(도면 index.html 변환본)로 대체.
- 도면의 `workspace settings`, `billing` 페이지는 Phase 1에서 라우트만 만들고 "준비 중" 상태로 둠 (Phase 3 결제 도입 시 본구현).
- 모바일 시안은 도면에 미설계 → Phase 1에서 페이지별로 명시.

## 참고 문서

- `BTTOUR_SAAS/` — 디자인 도면 (동결, 참고만)
- `bttour-erp/` — 운영 ERP (도메인 지식 참고. 코드 복사 금지)
- `codex-analysis/01-bttour-saas-blueprint-inventory.md` — 도면 인벤토리
- `codex-analysis/02-settlement-formula-spec.md` — 정산 공식
- `codex-analysis/03-domain-field-mapping.md` — 도메인 매핑
- `codex-analysis/04-priority-page-component-tree.md` — Phase 1 우선순위 페이지 분해 (작성 중)
- `codex-analysis/05-i18n-dictionary-draft.md` — i18n 사전 초안 (작성 중)
- `codex-analysis/06-policy-decisions-options.md` — 정책 결정 옵션 (작성 중)
