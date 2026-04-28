// Phase 0 시드: Plan 카탈로그만 등록.
// 도메인 데이터(Team/Schedule/Guide 등) 시드는 Phase 2 이후 추가한다.

import { PrismaClient, PlanCode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 도면 index.html PRICING 섹션 기준
  const plans: Array<Parameters<typeof prisma.plan.upsert>[0]['create']> = [
    {
      code: PlanCode.STARTER,
      name: 'Starter',
      monthlyPriceKrw: 199_000,
      maxUsers: 2,
      maxTeamsPerMonth: 50,
      alimtalkQuota: 200,
      aiEnabled: false,
      aiCreditIncluded: 0,
      setupFeeKrw: 2_300_000,
      description: '~50팀/월 기본 ERP',
      sortOrder: 1,
    },
    {
      code: PlanCode.PRO,
      name: 'Pro',
      monthlyPriceKrw: 249_000,
      maxUsers: 3,
      maxTeamsPerMonth: 100,
      alimtalkQuota: 500,
      aiEnabled: false,
      aiCreditIncluded: 0,
      setupFeeKrw: 4_800_000,
      description: '~100팀/월',
      sortOrder: 2,
    },
    {
      code: PlanCode.PRO_AI,
      name: 'Pro AI',
      monthlyPriceKrw: 449_000,
      maxUsers: 5,
      maxTeamsPerMonth: 100,
      alimtalkQuota: 500,
      aiEnabled: true,
      aiCreditIncluded: 50_000,
      setupFeeKrw: 4_800_000,
      description: '~100팀/월 + Hermes AI 5종',
      highlight: true,
      sortOrder: 3,
    },
    {
      code: PlanCode.BUSINESS_AI,
      name: 'Business AI',
      monthlyPriceKrw: 799_000,
      maxUsers: 10,
      maxTeamsPerMonth: 200,
      alimtalkQuota: null, // 무제한
      aiEnabled: true,
      aiCreditIncluded: 150_000,
      setupFeeKrw: 7_000_000,
      description: '~200팀/월 + 무제한 알림톡',
      sortOrder: 4,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }

  console.log(`[seed] plans: ${plans.length}건 upsert 완료`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
