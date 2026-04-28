import Link from 'next/link';

/**
 * 임시 루트 페이지. Phase 1에서 (marketing) 라우트 그룹의 랜딩(index.html 변환본)으로 대체.
 */
export default function HomePage() {
  return (
    <main className="min-h-screen grad-navy text-white">
      <div className="absolute inset-0 bg-dot-grid opacity-50 pointer-events-none" />
      <div className="relative max-w-3xl mx-auto px-6 py-32">
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8 text-sm">
          <span className="w-2 h-2 bg-orange-500 rounded-full" />
          Phase 0 — SaaS 골격 가동 중
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
          BT TOUR <span className="grad-text-orange">ERP SaaS</span>
        </h1>
        <p className="text-lg text-slate-300 mb-10">
          인바운드 여행사 전용 통합 정산 SaaS. 디자인 토큰·DB 스키마·인증 골격이
          준비되었으며, Phase 1에서 도면 17개 페이지를 변환합니다.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/signin"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg shadow-glow transition"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="bg-white/10 hover:bg-white/20 backdrop-blur text-white font-semibold px-6 py-3 rounded-lg border border-white/20 transition"
          >
            워크스페이스 만들기
          </Link>
        </div>
      </div>
    </main>
  );
}
