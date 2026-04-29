# Phase 4G 완료 → Phase 5 진입 핸드오프

> 작성: 2026-04-29 / 작성자: Claude / 대상: Codex(GPT-5.5 high Pro) + 사용자
> 이전 버전: Phase 1 진입 핸드오프 (2026-04-28)

---

## 누적 완료 항목

### Phase 0 — 모노레포 + 디자인 토큰 + 기본 골격

| 영역            | 결과물                                                                                                                                                                                                        | 위치                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 모노레포        | apps/(web,api), packages/(ui,db,shared), docs/                                                                                                                                                                | `bttour-saas/`                                                                       |
| 디자인 토큰     | navy/orange/Pretendard/shadow/animation/grad/dot-grid                                                                                                                                                         | `packages/ui/src/tailwind-preset.ts`                                                 |
| 공통 컴포넌트   | Button, Card, KpiCard, Badge, MonthNavigator, OpsHeader, TopHeader, Sidebar, WorkspaceSwitcher, DataTable, MobileCardList, Modal, EmptyState, FilterToolbar, Field, TextField                                 | `packages/ui/src/components/`                                                        |
| 정산 함수       | formatWonDisplay, computeVat10, computeSettlementBalance, computePerPaxMinusUsd, computeShoppingCommissionTotals, computeReceivableBalance, computeWalletBalance, computeCardRemainingLimit                   | `packages/shared/src/finance/`                                                       |
| Next.js 골격    | App Router + (marketing)/(auth)/(workspace) 그룹 + middleware                                                                                                                                                 | `apps/web/src/`                                                                      |
| 워크스페이스 셸 | Sidebar 메뉴 + TopHeader + 인증 게이트                                                                                                                                                                        | `apps/web/src/components/WorkspaceShell.tsx` + `app/(workspace)/w/[slug]/layout.tsx` |
| 인증            | NextAuth v5 (Credentials + JWT, trustHost) — Phase 4B에서 PrismaAdapter 제거                                                                                                                                  | `apps/web/src/lib/auth.ts`                                                           |
| NestJS API      | 스켈레톤 + /health (Phase 5에서 미수금/카카오 webhook 추가 예정)                                                                                                                                              | `apps/api/src/`                                                                      |
| 시드            | Plan 4건 + 데모 워크스페이스 + 67건 마스터/운영 데이터                                                                                                                                                        | `packages/db/prisma/seed.ts`, `seed-demo.ts`                                         |

### Phase 1~2E — 도면 17페이지 React 변환 + 통계/매출

| 영역             | 결과물                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| 인증/온보딩      | login, signup, workspace-switcher                                                               |
| 운영             | dashboard, schedule, team-timeline, hotel-calendar                                              |
| 정산             | guide-settlement, vehicle, shopping-fee, receivables                                            |
| 회계             | finance, expense                                                                                |
| 통계             | revenue, statistics                                                                             |
| 마스터/관리      | user-management, workspace-settings (partners/guides/hotels/vehicles/shopping-centers), billing |
| 정책 결정 11+    | docs/POLICY_DECISIONS.md (VAT 반올림, 5천원 라운딩, 과지급, 다중통화 등)                        |
| RBAC 함수        | OWNER/ADMIN/MANAGER/VIEWER + 16개 정책 함수                                                     |

### Phase 3 — Vercel + Neon 운영 배포

- Vercel 모노레포 배포 (Root Directory 비움 + vercel-build script)
- Neon Postgres Singapore (Free tier)
- Vercel ICN1 region
- 환경변수: DATABASE_URL, DIRECT_URL, AUTH_SECRET, AUTH_URL (Sensitive)

### Phase 4 — Hermes AI 통합 + 자동화 (90% 완료)

| Sub-phase | 내용                                                       | 시각 검증                                                          |
| --------- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| 4A        | DB 모델 5종 + AES-256-GCM 암호화 + RBAC 6함수              | ✅ migrate 통과                                                    |
| 4B        | settings/ai · settings/messaging · settings/backup 패널    | ✅ OPENAI gpt-4o-mini SUCCESS 897ms                                |
| 4C        | 영수증 OCR (Vision 3종 어댑터 + 모달 UI + 한국어 에러)     | ✅ 코드 경로 전면 정상 (실제 OCR 정확도는 Phase 5 Gemini 2.5 후)   |
| 4D        | 가이드 정산서 PDF (@react-pdf/renderer + NotoSansKR)       | ✅ 윤서연 정산서 1장 한글/계산/레이아웃 완벽 렌더                  |
| 4F        | 월말 인사이트 (통계 6종 + AI 한국어 요약 + 마크다운 렌더)  | ✅ Pacific Travel 53.7% 의존도 등 4섹션 자동 분석 (gpt-4o 7048ms)  |
| 4G        | Vercel Cron + Hermes Supervisor + 일정변경 감지            | ✅ Bearer 인증 + KST 1일 05:00 윈도우 발화 + HermesJob 추적        |
| **4E**    | **미수금 카카오 알림톡 — 사용자 카카오 비즈 셋업 후 진행** | ⏳                                                                 |

### Phase 2 마무리 (현재 사이클)

| 항목                               | 상태                                                          |
| ---------------------------------- | ------------------------------------------------------------- |
| Hermes Supervisor OWNER 우선 정렬  | ✅ findSystemActor 분리 쿼리                                  |
| 인사이트 KPI 라운딩 통일           | ✅ 원본값 + Intl.NumberFormat (AI 본문과 일치)                |
| 마크다운 렌더 라인 단위 파서       | ✅ 헤더/리스트/단락 정확 분리                                 |
| next.config tracing top-level      | ✅ Next.js 14.2 stable 옵션으로 이동                          |
| 폰트 사이즈 최적화 (10MB → ~700KB) | ⏳ 사용자 pyftsubset 명령 후 적용                             |
| HANDOFF.md 갱신                    | ✅ (이 문서)                                                  |

---

## 운영 환경 (현재)

### 배포

- **호스팅**: Vercel (Hobby/Free, ICN1 region)
- **DB**: Neon Postgres (Free, Singapore region)
- **도메인**: bttour-saas-demo.vercel.app

### 환경변수 (Vercel)

| 키                         | 환경                | Sensitive | 용도                                         |
| -------------------------- | ------------------- | --------- | -------------------------------------------- |
| `DATABASE_URL`             | Production, Preview | ✅        | Neon connection (pgbouncer)                  |
| `DIRECT_URL`               | Production, Preview | ✅        | Neon direct (마이그레이션)                   |
| `AUTH_SECRET`              | Production, Preview | ✅        | NextAuth JWT 서명                            |
| `AUTH_URL`                 | Production, Preview | (해제 권장) | NextAuth base URL — trustHost 설정 시 백업    |
| `AI_KEY_ENCRYPTION_SECRET` | Production, Preview | ✅        | 워크스페이스 AI 키 envelope 암호화 KEK 시드  |
| `CRON_SECRET`              | Production, Preview | ✅        | Vercel Cron 호출 인증 (32자+ 랜덤 권장)      |

### Vercel Cron

- 매시간 (`0 * * * *`) `/api/cron` GET
- KST 매월 1일 05:00 ± 30분 윈도우 → 월말 인사이트 자동 생성

### Workspace 자동화 (`/w/[slug]/automation`)

- OWNER만 토글 변경 가능
- 현재 활성화 가능: 월말 인사이트 자동
- Phase 4E/4G-2: 일정변경 알림 / 미수금 알림톡 자동 (자리만 잡힘)

---

## 작업 분담 (현 시점)

### Codex 담당 (장시간 양산)

- Phase 본 구현 (DB → 어댑터 → Server Action → UI → 시각 검증) 5~7단계 분할 커밋
- 한 사이클 1000~2000줄 자율 진행 (4C/4D/4F/4G 패턴 검증됨)
- main에 직접 push (PR 사용 X)

### Claude 담당 (정합성 + 정책)

- 작업 명세서 작성 (정책 박스 + 코드블록 명세)
- Codex PR 정합성 리뷰 (RBAC, AuditLog, 트랜잭션, 한국어 에러 정규화, keyVersion 스냅샷, 시각 검증)
- 충돌 발생 시 fix-up 커밋
- 작은 P2/P3 부채는 Claude 직접 묶어서 처리 (현재 사이클)

### 충돌 방지 룰

- 같은 파일 동시 편집 금지 — 분담 명확히
- 새 토큰·공통 컴포넌트는 Claude가 packages/ui로 승급
- 정책 결정 (RBAC, 다중통화, 환경변수 등)은 Claude 단독

---

## 알려진 제약 + P2/P3 부채

### Vercel Hobby tier 한계

- Functions maxDuration 60초 (Cron 핸들러는 300초로 선언했지만 실제 60초)
- Cron 1개만 등록 가능 (현재 매시간 1개로 통합)
- → Phase 5에서 Pro 업그레이드 검토

### Neon Singapore latency

- KR 사용자 ~80ms 추가 지연
- → Phase 5에서 Supabase 서울 리전 이전 검토

### 영수증 OCR 정확도

- 현재 default `gpt-4o-mini`는 한국어 OCR 약함 (4C 시점에 사용자 검증)
- → Phase 5에서 Gemini 2.5 Flash로 교체 (무료 tier + 성능 우수)

### 폰트 사이즈

- NotoSansKR Regular/Bold 각 10.4MB (총 ~20MB)
- → Phase 2 마무리 #1에서 pyftsubset으로 한국어 subset + woff2 변환 (~700KB)

### Phase 4E 카카오 의존성

- 카카오 비즈니스 채널 개설 (사업자등록증 인증)
- 발신 프로필 + 알림톡 템플릿 사전 등록 (영업일 1~3일 카카오 심사)
- 솔라피/알리고 등 발송 대행 가입 + API 키 (메시지당 ~9원)
- → 사용자 외부 작업 완료 시점에 4E 진입

### 기타 부채

- i18n EN/ZH 번역 누락분 (Phase 0/1에서 KO만 충실)
- .env 파일 루트 vs apps/web/ 이원화 (Vercel은 영향 없음)
- HermesJob 메타데이터 schema 미정형화 (workflow별 자유 JSON)
- Bottom-line: ScheduleChangeLog 알림 발송은 Phase 4G-2 (4E 카카오 의존)

---

## 다음 단계

### 단기 (현재 사이클 마무리)

1. **폰트 최적화** — 사용자가 pyftsubset 명령 1회 실행 후 Claude가 코드 경로 갱신
2. **commit + push** — 현재 사이클 5개 변경 (OWNER 정렬 / 라운딩 / 마크다운 / tracing / HANDOFF) 묶음 push

### 중기 (다음 사이클)

- **Phase 5 — 운영 안정화**: Gemini 2.5 Flash default + Supabase 서울 + Vercel Pro
- 또는 **Phase 4E 시작** — 사용자 카카오 셋업 완료 시점에

### 장기

- Phase 4G-2: ScheduleChangeLog 카카오 알림 (4E 인프라 활용)
- Phase 6+: 고객 onboarding, 결제(Toss), 다중 워크스페이스 marketplace 등

---

## 빌드/실행

```bash
cd bttour-saas
npm install
cp .env.example .env
# DATABASE_URL/DIRECT_URL/AUTH_SECRET/AI_KEY_ENCRYPTION_SECRET/CRON_SECRET 설정
npm run db:generate
npm run db:migrate
npm run db:seed         # Plan 카탈로그
npm run db:seed-demo    # 데모 워크스페이스 + 67건 데이터
npm run dev             # web :3000, api :3001
```

### Cron 수동 호출 (검증)

```bash
curl -H "Authorization: Bearer ${CRON_SECRET}" http://localhost:3000/api/cron
# 응답: { ok: true, firedAt, kst, workflows: [], jobs: [] }
# 시간 윈도우 밖이면 jobs 비어있음 (정상)
```

### 운영 cron 발화 확인 (Vercel)

- Vercel Dashboard → 프로젝트 → Cron Jobs 탭
- `/api/cron` 옆 **Run Now** 또는 매시간 정각 자동 호출
- AuditLog SQL: `SELECT * FROM audit_logs WHERE action LIKE 'hermes.%' ORDER BY "createdAt" DESC LIMIT 10;`

---

## 참고 문서

- `BTTOUR_SAAS/` — 디자인 도면 (동결)
- `bttour-erp/` — 현행 운영 ERP (도메인 참고)
- `docs/POLICY_DECISIONS.md` — 11+ 정책 결정
- `codex-analysis/01-bttour-saas-blueprint-inventory.md` — 도면 인벤토리
- `codex-analysis/02-settlement-formula-spec.md` — 정산 공식
- `codex-analysis/03-domain-field-mapping.md` — 도메인 매핑
- `codex-analysis/04-priority-page-component-tree.md` — 페이지 컴포넌트 트리
- `codex-analysis/05-i18n-dictionary-draft.md` — i18n 사전
- `codex-analysis/06-policy-decisions-options.md` — 정책 결정 옵션
- `codex-analysis/08-phase4-integration-panels.md` — Phase 4 통합 명세
