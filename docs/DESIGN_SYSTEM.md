# 디자인 시스템 — bttour-saas

`BTTOUR_SAAS` 도면(정적 HTML 17페이지)에서 추출한 토큰을 `packages/ui`에 통합한 표준.

## 1. 토큰 (Tailwind preset)

`packages/ui/src/tailwind-preset.ts` 진입점. apps/web/api에서 `presets: [bttourPreset]`로 사용.

### 색상

| 토큰 | 값 | 용도 |
|---|---|---|
| `navy.50` | #f0f4f8 | 배경 (보조) |
| `navy.100` | #d9e2ec | 보더 |
| `navy.700` | #334e68 | 본문 텍스트 (보조) |
| `navy.800` | #243b53 | 사이드바 hover |
| `navy.900` | #1e3a5f | **브랜드 메인 (사이드바·CTA·헤딩)** |
| `navy.950` | #0f1e30 | 그라디언트 끝점 |
| `orange.500` | #ff6b35 | **액션·active·강조** |
| `orange.600` | #ea580c | hover |

`slate-*`, `red-*`, `green-*`, `amber-*`, `blue-*` 등 Tailwind 기본 팔레트는 그대로 사용.

### 폰트

- 기본: `Pretendard Variable`, fallback `Pretendard`, system-ui, sans-serif
- 숫자 표 정렬: `font-variant-numeric: tabular-nums` → `.num-tabular` 유틸

### 그림자

| 토큰 | 용도 |
|---|---|
| `shadow-soft` | 카드 기본 |
| `shadow-float` | hover 부유 |
| `shadow-glow` | primary CTA (오렌지 글로우) |

### 그라디언트 / 효과

- `.grad-navy` — 사이드바 배경, 마케팅 hero
- `.grad-text-orange` — 강조 텍스트 그라디언트
- `.glass` — backdrop-filter blur(12px)
- `.bg-dot-grid` — 도면 hero/CTA 섹션의 점 패턴
- `animate-fade-up` — 진입 애니메이션

## 2. 컴포넌트 카탈로그 (`@bttour/ui`)

| 컴포넌트 | 도면 출처 | Phase 0 상태 |
|---|---|---|
| `Button` | 모든 페이지 CTA | ✅ primary/secondary/outline/ghost/danger × sm/md/lg |
| `Card` | dashboard/settlement 카드 | ✅ padding/hover variants |
| `KpiCard` | dashboard.html KPI 4개 | ✅ delta(up/down/flat) + emoji + highlight |
| `Badge` | 팀 상태/도시/긴급 표시 | ✅ 11색 tone + pulse |
| `MonthNavigator` | 일정현황 erp-sch-header | ✅ 인라인 ‹ 2026년 4월 › |
| `OpsHeader` | 운영 뷰 공용 상단 | ✅ emoji + 타이틀 + monthNav + rightSlot |
| `TopHeader` | dashboard.html 상단 64px | ✅ 타이틀/서브 + AI 크레딧 슬롯 |
| `Sidebar` | dashboard.html 좌측 256px | ✅ navy + groups + LinkComponent 슬롯 |
| `WorkspaceSwitcher` | 사이드바 헤더 | ✅ details 기반 드롭다운 |

### Phase 1에서 추가 예정

- `DataTable` — 데스크톱 표 (정산/미수금/재무)
- `MobileCardList` — 모바일 카드 리스트 (조회 동선)
- `ViewToggle` — 카드형/표형 토글
- `LanguageSwitcher` — 도면 KO/EN/ZH 토글
- `Modal`, `Toast`, `EmptyState` — 공통 UX
- `AdminTabs` — 사용자 관리 탭

## 3. 글로벌 스타일

`packages/ui/src/styles/globals.css`를 `apps/web/src/app/layout.tsx`에서 import.

- Pretendard CDN 로드 (jsdelivr)
- 기본 antialiased
- `.scroll-thin` (사이드바·내부 스크롤 영역)
- 위 그라디언트/glass/dot-grid 클래스

## 4. 사용 규칙

1. **`packages/ui`의 토큰 외 색·그림자·폰트 사용 금지** (특히 신규 페이지 변환 시)
2. 새 컴포넌트가 두 곳 이상에서 쓰이면 `@bttour/ui`로 승격
3. Lucide 아이콘 사용 가능. 도면의 emoji 아이콘은 Phase 1에서 점진적으로 lucide로 교체 검토
4. 클래스 결합은 `cn()`(@bttour/ui) 헬퍼 사용 — clsx + tailwind-merge

## 5. 다국어

- 마스터 언어: 한국어
- next-intl 사용. 키는 페이지 namespace + dot 표기 (예: `dashboard.kpi.this_month_revenue`)
- KO/EN/ZH 사전 초안은 Codex `codex-analysis/05-i18n-dictionary-draft.md`에서 받아 `apps/web/src/messages/{ko,en,zh}.json`으로 옮김

## 6. 모바일 정책

도면이 데스크톱 위주라 모바일 시안 보강 필요. 기준선:
- 조회용으로만 동작 (편집 불가/숨김)
- sticky 헤더 + 카드형 리스트
- 표형 컴포넌트는 모바일에서 자동으로 카드형 폴백
- Phase 1에서 페이지별 모바일 레이아웃을 명시적으로 정의
