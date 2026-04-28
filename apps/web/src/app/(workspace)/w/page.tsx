import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@bttour/db';
import { Card, Button } from '@bttour/ui';

/**
 * 워크스페이스 진입 라우터.
 * - 멤버십 0개: 워크스페이스 생성 페이지로 안내
 * - 1개: 그 슬러그로 자동 진입
 * - 2개 이상: 선택 화면
 */
export default async function WorkspaceIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id, status: 'ACTIVE' },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });

  if (memberships.length === 0) {
    redirect('/signup');
  }
  if (memberships.length === 1) {
    const [membership] = memberships;
    if (membership) {
      redirect(`/w/${membership.workspace.slug}/dashboard`);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 grid place-items-center p-6">
      <Card className="max-w-md w-full" padding="lg">
        <h1 className="text-xl font-bold text-navy-900 mb-1">워크스페이스 선택</h1>
        <p className="text-sm text-slate-500 mb-6">
          소속된 워크스페이스가 여러 개입니다. 입장할 워크스페이스를 선택하세요.
        </p>
        <div className="space-y-2">
          {memberships.map((m: (typeof memberships)[number]) => (
            <Link
              key={m.id}
              href={`/w/${m.workspace.slug}/dashboard`}
              className="block p-3 rounded-lg border border-slate-200 hover:border-navy-900 transition"
            >
              <div className="font-semibold text-navy-900">{m.workspace.name}</div>
              <div className="text-xs text-slate-500">
                /{m.workspace.slug} · {m.role}
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-6 pt-6 border-t border-slate-100">
          <Link href="/signup">
            <Button variant="outline" className="w-full">
              + 새 워크스페이스 만들기
            </Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
