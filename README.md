# BT TOUR ERP — SaaS

인바운드 여행사 전용 통합 정산 SaaS ERP. 한·중·베트남 인바운드 동시 지원.

> 이 저장소는 신규 SaaS ERP 본체입니다. 디자인 도면(`../BTTOUR_SAAS`)과 현행 운영 ERP(`../bttour-erp`)는 별도이며, 이 프로젝트와 직접 연결되지 않습니다.

## 구조

```
bttour-saas/
├── apps/
│   ├── web/        # Next.js 14 App Router (마케팅 + 워크스페이스)
│   └── api/        # NestJS API (도메인 비즈니스 + 워커)
├── packages/
│   ├── ui/         # 디자인 시스템 (Tailwind config + 공통 컴포넌트)
│   ├── db/         # Prisma 스키마 + 클라이언트
│   └── shared/     # 도메인 타입 + 정산 순수 함수
└── docs/           # ARCHITECTURE.md, DESIGN_SYSTEM.md, HANDOFF.md
```

## 빠른 시작

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run dev
```

## 스택

- **Frontend**: Next.js 14 App Router + Tailwind v3 + Pretendard
- **Backend**: NestJS + Prisma + PostgreSQL
- **인증**: NextAuth.js v5 (이메일 + 카카오 OAuth)
- **결제**: 토스페이먼츠
- **i18n**: next-intl (KO / EN / ZH)
- **알림**: 카카오 알림톡 / Zalo / WeChat (Phase 4)

## 진행 단계

- [x] **Phase 0**: 모노레포 골격 + 디자인 토큰 + Workspace/Auth 베이스
- [ ] **Phase 1**: 도면 17 페이지 React 변환 (Codex 주도)
- [ ] **Phase 2**: 도메인 백엔드 (정산/일정/미수금)
- [ ] **Phase 3**: 인증/결제/AI 크레딧
- [ ] **Phase 4**: Hermes AI + 알림톡
- [ ] **Phase 5**: 시드 + 베타 운영

자세한 작업 분담은 [`docs/HANDOFF.md`](docs/HANDOFF.md) 참고.
