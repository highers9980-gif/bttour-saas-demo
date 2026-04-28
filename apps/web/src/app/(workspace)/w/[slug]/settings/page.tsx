import { Card } from '@bttour/ui';
import { canMutateMaster } from '@bttour/shared';
import Link from 'next/link';
import { requireWorkspace } from '@/lib/workspace-guard';

const integrationCards = [
  {
    title: 'Hermes AI',
    description: 'OpenAI, Gemini, Anthropic BYO 키와 모델명을 연결합니다.',
    href: 'ai',
    label: '🤖',
  },
  {
    title: '카카오 알림톡',
    description: '발신 프로필과 템플릿 초안을 저장합니다. 현재는 비활성 상태입니다.',
    href: 'messaging',
    label: '🟡',
  },
  {
    title: '데이터 백업',
    description: 'Neon PITR 상태와 수동 export, Phase 5 일별 백업 설정을 관리합니다.',
    href: 'backup',
    label: '💾',
  },
] as const;

const masterCards = [
  {
    title: '가이드',
    description: '가이드 연락처, 언어, 지역, 색상 키를 관리합니다.',
    href: 'guides',
    label: 'G',
  },
  {
    title: '호텔',
    description: '호텔명, 지역, 연락처, 등급 정보를 관리합니다.',
    href: 'hotels',
    label: 'H',
  },
  {
    title: '차량',
    description: '차량 라벨, 차종, 번호판, 벤더 정보를 관리합니다.',
    href: 'vehicles',
    label: 'V',
  },
  {
    title: '기사',
    description: '기사 연락처와 담당 차량 연결 정보를 관리합니다.',
    href: 'vehicles#drivers',
    label: 'D',
  },
  {
    title: '거래처',
    description: '에이전트, 호텔/차량 벤더, 고객 거래처를 관리합니다.',
    href: 'partners',
    label: 'P',
  },
  {
    title: '쇼핑센터',
    description: '쇼핑센터 카테고리, 지역, 표시 순서를 관리합니다.',
    href: 'shopping-centers',
    label: 'S',
  },
] as const;

export default async function SettingsPage({ params }: { params: { slug: string } }) {
  const { workspace, role } = await requireWorkspace(params.slug, 'VIEWER');
  const canMutate = canMutateMaster(role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-navy-900">워크스페이스 설정</h1>
        <p className="text-xs text-slate-500">운영 입력 전에 필요한 마스터 데이터를 관리합니다.</p>
      </div>

      <Card padding="lg">
        <h2 className="mb-4 text-base font-bold text-navy-900">워크스페이스 정보</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">이름</div>
            <div className="font-semibold text-navy-900">{workspace.name}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Slug</div>
            <div className="font-mono font-semibold text-navy-900">{workspace.slug}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">마스터 수정 권한</div>
            <div className="font-semibold text-navy-900">{canMutate ? '허용' : '읽기 전용'}</div>
          </div>
        </div>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-navy-900">통합 패널</h2>
          <span className="text-xs font-semibold text-slate-500">Phase 4</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {integrationCards.map((card) => (
            <Link key={card.href} href={`/w/${params.slug}/settings/${card.href}`}>
              <Card hover padding="lg" className="h-full">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-orange-50 text-xl">
                  {card.label}
                </div>
                <h3 className="mb-2 text-base font-bold text-navy-900">{card.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{card.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-navy-900">마스터 관리</h2>
        <span className="text-xs font-semibold text-slate-500">운영 기본 데이터</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {masterCards.map((card) => (
          <Link key={card.href} href={`/w/${params.slug}/settings/${card.href}`}>
            <Card hover padding="lg" className="h-full">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-navy-900 text-sm font-bold text-white">
                {card.label}
              </div>
              <h2 className="mb-2 text-base font-bold text-navy-900">{card.title}</h2>
              <p className="text-sm leading-relaxed text-slate-500">{card.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
