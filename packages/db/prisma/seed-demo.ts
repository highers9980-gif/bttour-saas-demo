/**
 * 데모 시드 — BT TOUR 워크스페이스(slug='bttour')에 가상 운영 데이터를 일괄 적재.
 *
 * 사용:
 *   npm run db:seed:demo
 *
 * 정책:
 *   - BT TOUR 워크스페이스의 모든 도메인 데이터(마스터 + 운영 + 정산 + 회계)를 deleteMany 후 새로 적재
 *   - User/Workspace/Membership/Plan/Subscription/AICredit은 보존 (인증/플랜 데이터)
 *   - 매번 실행해도 같은 결과 (idempotent)
 */

import {
  PrismaClient,
  TourTeamStatus,
  AssignmentStatus,
  HotelStaySource,
  SettlementStatus,
  WalletKind,
  LedgerEntryType,
  ReceivableStatus,
  ExpenseStatus,
  PartnerKind,
} from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_SLUG = 'bttour';

async function clearDemoData(workspaceId: string) {
  // 외래키 의존 순서대로 삭제
  await prisma.expenseAttachment.deleteMany({ where: { workspaceId } });
  await prisma.expense.deleteMany({ where: { workspaceId } });
  await prisma.receivablePayment.deleteMany({ where: { workspaceId } });
  await prisma.receivable.deleteMany({ where: { workspaceId } });
  await prisma.financeLedgerLine.deleteMany({ where: { workspaceId } });
  await prisma.financeWallet.deleteMany({ where: { workspaceId } });
  await prisma.shoppingCommission.deleteMany({ where: { workspaceId } });
  await prisma.shoppingSale.deleteMany({ where: { workspaceId } });
  await prisma.guideSettlementPayment.deleteMany({ where: { workspaceId } });
  await prisma.guideSettlement.deleteMany({ where: { workspaceId } });
  await prisma.vehicleSettlementPayment.deleteMany({ where: { workspaceId } });
  await prisma.vehicleSettlement.deleteMany({ where: { workspaceId } });
  await prisma.teamVehicleAssignment.deleteMany({ where: { workspaceId } });
  await prisma.teamHotelStay.deleteMany({ where: { workspaceId } });
  await prisma.teamGuideAssignment.deleteMany({ where: { workspaceId } });
  await prisma.tourTeam.deleteMany({ where: { workspaceId } });
  await prisma.driver.deleteMany({ where: { workspaceId } });
  await prisma.vehicle.deleteMany({ where: { workspaceId } });
  await prisma.hotel.deleteMany({ where: { workspaceId } });
  await prisma.guide.deleteMany({ where: { workspaceId } });
  await prisma.shoppingCenter.deleteMany({ where: { workspaceId } });
  await prisma.partner.deleteMany({ where: { workspaceId } });
  await prisma.exchangeRate.deleteMany({ where: { workspaceId } });
  console.log('[seed-demo] 기존 도메인 데이터 삭제 완료');
}

function date(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

function dateTime(iso: string) {
  return new Date(iso);
}

async function main() {
  const workspace = await prisma.workspace.findUnique({ where: { slug: TARGET_SLUG } });
  if (!workspace) {
    console.error(
      `[seed-demo] 워크스페이스 "${TARGET_SLUG}"가 없습니다. /signup으로 먼저 가입하세요.`,
    );
    process.exit(1);
  }
  const ws = workspace.id;
  console.log(`[seed-demo] 대상 워크스페이스: ${workspace.name} (${ws})`);

  await clearDemoData(ws);

  // ─────────────────────────────────────────────────────────────────
  // 마스터
  // ─────────────────────────────────────────────────────────────────

  // 거래처 (Partners)
  const partners = await Promise.all([
    prisma.partner.create({
      data: {
        workspaceId: ws,
        name: 'Pacific Travel',
        kind: PartnerKind.AGENCY,
        contactName: 'Sato Hiroshi',
        contactPhone: '+81-3-1234-5678',
        contactEmail: 'pacific@example.jp',
        region: '도쿄',
      },
    }),
    prisma.partner.create({
      data: {
        workspaceId: ws,
        name: 'Summit Travel',
        kind: PartnerKind.AGENCY,
        contactName: 'Suthida',
        contactPhone: '+66-2-1234-5678',
        contactEmail: 'summit@example.th',
        region: '방콕',
      },
    }),
    prisma.partner.create({
      data: {
        workspaceId: ws,
        name: 'Skyline Tours',
        kind: PartnerKind.AGENCY,
        contactName: 'Tanaka',
        region: '도쿄',
      },
    }),
    prisma.partner.create({
      data: {
        workspaceId: ws,
        name: 'Horizon Holiday',
        kind: PartnerKind.AGENCY,
        contactName: 'Maria Santos',
        region: '마닐라',
      },
    }),
    prisma.partner.create({
      data: {
        workspaceId: ws,
        name: 'BayView Hotels Group',
        kind: PartnerKind.HOTEL_VENDOR,
        contactName: '김매니저',
        region: '서울',
      },
    }),
    prisma.partner.create({
      data: {
        workspaceId: ws,
        name: '대한관광버스',
        kind: PartnerKind.VEHICLE_VENDOR,
        contactName: '이대표',
        region: '서울',
      },
    }),
  ]);
  const [pacific, summit, skyline, horizon, bayviewVendor, busVendor] = partners;
  console.log(`[seed-demo] partners: ${partners.length}건`);

  // 가이드 (Guide)
  const guides = await Promise.all([
    prisma.guide.create({
      data: {
        workspaceId: ws,
        name: '김민수',
        region: '서울',
        phone: '010-1111-2001',
        language: '일본어',
        colorKey: 'blue',
      },
    }),
    prisma.guide.create({
      data: {
        workspaceId: ws,
        name: '이영희',
        region: '서울',
        phone: '010-1111-2002',
        language: '중국어',
        colorKey: 'pink',
      },
    }),
    prisma.guide.create({
      data: {
        workspaceId: ws,
        name: '박지훈',
        region: '부산',
        phone: '010-1111-2003',
        language: '베트남어',
        colorKey: 'green',
      },
    }),
    prisma.guide.create({
      data: {
        workspaceId: ws,
        name: '최수연',
        region: '서울',
        phone: '010-1111-2004',
        language: '영어/일본어',
        colorKey: 'amber',
      },
    }),
    prisma.guide.create({
      data: {
        workspaceId: ws,
        name: '정태호',
        region: '제주',
        phone: '010-1111-2005',
        language: '중국어',
        colorKey: 'purple',
      },
    }),
    prisma.guide.create({
      data: {
        workspaceId: ws,
        name: '윤서연',
        region: '서울',
        phone: '010-1111-2006',
        language: '태국어/영어',
        colorKey: 'cyan',
      },
    }),
  ]);
  const [g1, g2, g3, g4, g5, g6] = guides;
  console.log(`[seed-demo] guides: ${guides.length}건`);

  // 호텔 (Hotel)
  const hotels = await Promise.all([
    prisma.hotel.create({
      data: { workspaceId: ws, name: '신라호텔', region: '서울', rank: 5, phone: '02-2233-3131' },
    }),
    prisma.hotel.create({
      data: { workspaceId: ws, name: '롯데호텔', region: '서울', rank: 5, phone: '02-771-1000' },
    }),
    prisma.hotel.create({
      data: {
        workspaceId: ws,
        name: '그랜드하얏트',
        region: '서울',
        rank: 5,
        phone: '02-797-1234',
      },
    }),
    prisma.hotel.create({
      data: { workspaceId: ws, name: 'Bay View Hotel', region: '인천', rank: 4 },
    }),
    prisma.hotel.create({
      data: { workspaceId: ws, name: '코트야드 부산', region: '부산', rank: 4 },
    }),
    prisma.hotel.create({
      data: { workspaceId: ws, name: '라마다 제주', region: '제주', rank: 4 },
    }),
  ]);
  const [shilla, lotte, hyatt, bayview, courtyard, ramada] = hotels;
  console.log(`[seed-demo] hotels: ${hotels.length}건`);

  // 차량 (Vehicle) + 기사 (Driver)
  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        workspaceId: ws,
        label: '서울 25인승 #1',
        vehicleType: '25인승',
        plateNumber: '서울 12가 3456',
        region: '서울',
        vendor: '대한관광버스',
      },
    }),
    prisma.vehicle.create({
      data: {
        workspaceId: ws,
        label: '서울 45인승 #1',
        vehicleType: '45인승',
        plateNumber: '서울 34나 5678',
        region: '서울',
      },
    }),
    prisma.vehicle.create({
      data: {
        workspaceId: ws,
        label: '부산 25인승 #1',
        vehicleType: '25인승',
        plateNumber: '부산 56다 7890',
        region: '부산',
      },
    }),
    prisma.vehicle.create({
      data: {
        workspaceId: ws,
        label: '제주 미니버스 #1',
        vehicleType: '15인승',
        plateNumber: '제주 78라 1234',
        region: '제주',
      },
    }),
  ]);
  const [v1, v2, v3, v4] = vehicles;
  const drivers = await Promise.all([
    prisma.driver.create({
      data: {
        workspaceId: ws,
        vehicleId: v1.id,
        name: '강기사',
        phone: '010-2222-3001',
      },
    }),
    prisma.driver.create({
      data: {
        workspaceId: ws,
        vehicleId: v2.id,
        name: '박기사',
        phone: '010-2222-3002',
      },
    }),
    prisma.driver.create({
      data: {
        workspaceId: ws,
        vehicleId: v3.id,
        name: '오기사',
        phone: '010-2222-3003',
      },
    }),
    prisma.driver.create({
      data: {
        workspaceId: ws,
        vehicleId: v4.id,
        name: '최기사',
        phone: '010-2222-3004',
      },
    }),
  ]);
  console.log(`[seed-demo] vehicles: ${vehicles.length}건 / drivers: ${drivers.length}건`);

  // 쇼핑센터 (ShoppingCenter)
  const shoppingCenters = await Promise.all([
    prisma.shoppingCenter.create({
      data: {
        workspaceId: ws,
        name: '한국인삼센터',
        category: '인삼',
        region: '서울',
        sortOrder: 1,
        defaultCommissionRatePercent: 30,
      },
    }),
    prisma.shoppingCenter.create({
      data: {
        workspaceId: ws,
        name: '적송소나무센터',
        category: '적송',
        region: '서울',
        sortOrder: 2,
        defaultCommissionRatePercent: 25,
      },
    }),
    prisma.shoppingCenter.create({
      data: {
        workspaceId: ws,
        name: 'K-뷰티 면세점',
        category: '화장품',
        region: '서울',
        sortOrder: 3,
        defaultCommissionRatePercent: 20,
      },
    }),
    prisma.shoppingCenter.create({
      data: {
        workspaceId: ws,
        name: '영지건강원',
        category: '영지',
        region: '서울',
        sortOrder: 4,
        defaultCommissionRatePercent: 15,
      },
    }),
    prisma.shoppingCenter.create({
      data: {
        workspaceId: ws,
        name: '홍삼명가',
        category: '인삼',
        region: '부산',
        sortOrder: 5,
        defaultCommissionRatePercent: 28,
      },
    }),
  ]);
  const [ginsengCenter, redPineCenter, beautyCenter, lingzhiCenter, hongsamCenter] =
    shoppingCenters;
  console.log(`[seed-demo] shoppingCenters: ${shoppingCenters.length}건`);

  // ─────────────────────────────────────────────────────────────────
  // 환율
  // ─────────────────────────────────────────────────────────────────
  await prisma.exchangeRate.createMany({
    data: [
      {
        workspaceId: ws,
        baseCurrency: 'USD',
        quoteCurrency: 'KRW',
        rate: 1438.5,
        effectiveDate: date('2026-04-26'),
        source: 'manual',
      },
      {
        workspaceId: ws,
        baseCurrency: 'JPY',
        quoteCurrency: 'KRW',
        rate: 9.45,
        effectiveDate: date('2026-04-26'),
        source: 'manual',
      },
      {
        workspaceId: ws,
        baseCurrency: 'CNY',
        quoteCurrency: 'KRW',
        rate: 198.4,
        effectiveDate: date('2026-04-26'),
        source: 'manual',
      },
    ],
  });

  // ─────────────────────────────────────────────────────────────────
  // 운영: TourTeam 12팀 (2026-04 분포)
  // ─────────────────────────────────────────────────────────────────
  const teamSpecs = [
    {
      teamNo: 25,
      partnerId: pacific.id,
      partnerLabel: 'Pacific Travel',
      startDate: '2026-04-15',
      endDate: '2026-04-18',
      paxAdult: 22,
      paxTc: 2,
      originCode: 'TYO',
      originLabel: '도쿄',
      flightIn: 'OZ102',
      flightOut: 'OZ101',
      tourType: '패키지',
      status: TourTeamStatus.COMPLETED,
      guideId: g1.id,
      hotelId: shilla.id,
      vehicleId: v1.id,
      driverId: drivers[0]!.id,
    },
    {
      teamNo: 26,
      partnerId: summit.id,
      partnerLabel: 'Summit Travel',
      startDate: '2026-04-20',
      endDate: '2026-04-24',
      paxAdult: 30,
      paxTc: 2,
      originCode: 'BKK',
      originLabel: '방콕',
      flightIn: 'TG656',
      flightOut: 'TG655',
      tourType: '패키지',
      status: TourTeamStatus.COMPLETED,
      guideId: g6.id,
      hotelId: lotte.id,
      vehicleId: v2.id,
      driverId: drivers[1]!.id,
    },
    {
      teamNo: 27,
      partnerId: pacific.id,
      partnerLabel: 'Pacific Travel',
      startDate: '2026-04-25',
      endDate: '2026-04-28',
      paxAdult: 25,
      paxTc: 1,
      originCode: 'TYO',
      originLabel: '도쿄',
      flightIn: 'OZ102',
      flightOut: 'OZ101',
      tourType: '패키지',
      status: TourTeamStatus.IN_PROGRESS,
      guideId: g4.id,
      hotelId: bayview.id,
      vehicleId: v1.id,
      driverId: drivers[0]!.id,
    },
    {
      teamNo: 28,
      partnerId: summit.id,
      partnerLabel: 'Summit Travel',
      startDate: '2026-04-25',
      endDate: '2026-04-28',
      paxAdult: 35,
      paxTc: 3,
      originCode: 'BKK',
      originLabel: '방콕',
      flightIn: 'TG656',
      flightOut: 'TG655',
      tourType: '패키지',
      status: TourTeamStatus.IN_PROGRESS,
      guideId: g6.id,
      hotelId: lotte.id,
      vehicleId: v2.id,
      driverId: drivers[1]!.id,
    },
    {
      teamNo: 29,
      partnerId: skyline.id,
      partnerLabel: 'Skyline Tours',
      startDate: '2026-04-26',
      endDate: '2026-04-30',
      paxAdult: 18,
      paxTc: 1,
      originCode: 'TYO',
      originLabel: '도쿄',
      flightIn: 'JL091',
      flightOut: 'JL090',
      tourType: '인센티브',
      status: TourTeamStatus.IN_PROGRESS,
      // 가이드 미배정 (의도적)
      hotelId: hyatt.id,
      vehicleId: v1.id,
      driverId: drivers[0]!.id,
    },
    {
      teamNo: 30,
      partnerId: horizon.id,
      partnerLabel: 'Horizon Holiday',
      startDate: '2026-04-27',
      endDate: '2026-05-01',
      paxAdult: 22,
      originCode: 'MNL',
      originLabel: '마닐라',
      flightIn: 'PR468',
      flightOut: 'PR467',
      tourType: 'FIT',
      status: TourTeamStatus.SCHEDULED,
      guideId: g4.id,
      hotelId: bayview.id,
      vehicleId: v2.id,
      driverId: drivers[1]!.id,
    },
    {
      teamNo: 31,
      partnerId: pacific.id,
      partnerLabel: 'Pacific Travel',
      startDate: '2026-04-05',
      endDate: '2026-04-08',
      paxAdult: 20,
      paxTc: 1,
      originCode: 'TYO',
      originLabel: '도쿄',
      flightIn: 'OZ102',
      flightOut: 'OZ101',
      tourType: '패키지',
      status: TourTeamStatus.COMPLETED,
      guideId: g1.id,
      hotelId: shilla.id,
      vehicleId: v1.id,
      driverId: drivers[0]!.id,
    },
    {
      teamNo: 32,
      partnerId: skyline.id,
      partnerLabel: 'Skyline Tours',
      startDate: '2026-04-10',
      endDate: '2026-04-13',
      paxAdult: 15,
      originCode: 'TYO',
      originLabel: '도쿄',
      flightIn: 'JL091',
      flightOut: 'JL090',
      tourType: '인센티브',
      status: TourTeamStatus.COMPLETED,
      guideId: g4.id,
      hotelId: hyatt.id,
      vehicleId: v1.id,
      driverId: drivers[0]!.id,
    },
    {
      teamNo: 33,
      partnerId: pacific.id,
      partnerLabel: 'Pacific Travel',
      startDate: '2026-04-12',
      endDate: '2026-04-15',
      paxAdult: 28,
      paxTc: 2,
      originCode: 'TYO',
      originLabel: '도쿄',
      flightIn: 'OZ102',
      flightOut: 'OZ101',
      tourType: '패키지',
      status: TourTeamStatus.COMPLETED,
      guideId: g1.id,
      hotelId: lotte.id,
      vehicleId: v2.id,
      driverId: drivers[1]!.id,
    },
    {
      teamNo: 34,
      partnerId: summit.id,
      partnerLabel: 'Summit Travel',
      startDate: '2026-04-18',
      endDate: '2026-04-22',
      paxAdult: 32,
      paxTc: 2,
      originCode: 'BKK',
      originLabel: '방콕',
      flightIn: 'TG656',
      flightOut: 'TG655',
      tourType: '패키지',
      status: TourTeamStatus.COMPLETED,
      guideId: g6.id,
      hotelId: lotte.id,
      vehicleId: v2.id,
      driverId: drivers[1]!.id,
    },
    {
      teamNo: 35,
      partnerId: pacific.id,
      partnerLabel: 'Pacific Travel',
      startDate: '2026-04-29',
      endDate: '2026-05-02',
      paxAdult: 24,
      paxTc: 2,
      originCode: 'TYO',
      originLabel: '도쿄',
      flightIn: 'OZ102',
      flightOut: 'OZ101',
      tourType: '패키지',
      status: TourTeamStatus.SCHEDULED,
      guideId: g2.id, // 충돌 의도: g2를 다른 팀과 같은 기간에 배정
      hotelId: shilla.id,
      vehicleId: v1.id,
      driverId: drivers[0]!.id,
    },
    {
      teamNo: 36,
      partnerId: horizon.id,
      partnerLabel: 'Horizon Holiday',
      startDate: '2026-04-30',
      endDate: '2026-05-03',
      paxAdult: 20,
      originCode: 'MNL',
      originLabel: '마닐라',
      flightIn: 'PR468',
      flightOut: 'PR467',
      tourType: '패키지',
      status: TourTeamStatus.SCHEDULED,
      guideId: g2.id, // teamNo 35와 같은 기간 충돌
      hotelId: bayview.id,
      vehicleId: v2.id,
      driverId: drivers[1]!.id,
    },
  ];

  const teams: { id: string; teamNo: number; spec: (typeof teamSpecs)[number] }[] = [];
  for (const spec of teamSpecs) {
    const team = await prisma.tourTeam.create({
      data: {
        workspaceId: ws,
        year: 2026,
        month: 4,
        teamNo: spec.teamNo,
        partnerId: spec.partnerId,
        partnerNameSnapshot: spec.partnerLabel,
        agentLabel: spec.partnerLabel,
        startDate: date(spec.startDate),
        endDate: date(spec.endDate),
        paxAdult: spec.paxAdult,
        paxTc: spec.paxTc ?? 0,
        roomCount: Math.ceil(spec.paxAdult / 2),
        originCode: spec.originCode,
        originLabel: spec.originLabel,
        flightIn: spec.flightIn,
        flightOut: spec.flightOut,
        tourType: spec.tourType,
        status: spec.status,
      },
    });
    teams.push({ id: team.id, teamNo: team.teamNo, spec });
  }
  console.log(`[seed-demo] tourTeams: ${teams.length}건`);

  // 팀별 가이드/호텔/차량 배정
  for (const t of teams) {
    if (t.spec.guideId) {
      const guide = guides.find((g) => g.id === t.spec.guideId)!;
      await prisma.teamGuideAssignment.create({
        data: {
          workspaceId: ws,
          teamId: t.id,
          guideId: guide.id,
          guideNameSnapshot: guide.name,
          role: 'LEAD',
          status: AssignmentStatus.CONFIRMED,
          startDate: t.spec.startDate ? date(t.spec.startDate) : null,
          endDate: t.spec.endDate ? date(t.spec.endDate) : null,
        },
      });
    }
    const hotel = hotels.find((h) => h.id === t.spec.hotelId)!;
    await prisma.teamHotelStay.create({
      data: {
        workspaceId: ws,
        teamId: t.id,
        hotelId: hotel.id,
        hotelNameSnapshot: hotel.name,
        checkIn: date(t.spec.startDate),
        checkOut: date(t.spec.endDate),
        roomCount: Math.ceil(t.spec.paxAdult / 2),
        reservationNo: `BV-${t.teamNo}`,
        source: HotelStaySource.MANUAL,
        status: AssignmentStatus.CONFIRMED,
      },
    });
    const vehicle = vehicles.find((v) => v.id === t.spec.vehicleId)!;
    const totalWon = 280_000 * Math.max(1, Math.ceil((t.spec.paxAdult || 1) / 10));
    const vatWon = Math.round(totalWon * 0.1);
    await prisma.teamVehicleAssignment.create({
      data: {
        workspaceId: ws,
        teamId: t.id,
        vehicleId: vehicle.id,
        driverId: t.spec.driverId,
        vehicleLabelSnapshot: vehicle.label,
        startDate: date(t.spec.startDate),
        endDate: date(t.spec.endDate),
        totalWon,
        vatWon,
        totalWithVatWon: totalWon + vatWon,
        status: AssignmentStatus.CONFIRMED,
      },
    });
  }
  console.log('[seed-demo] team assignments (guide/hotel/vehicle) 생성 완료');

  // ─────────────────────────────────────────────────────────────────
  // 정산 — GuideSettlement / VehicleSettlement
  // ─────────────────────────────────────────────────────────────────
  for (const guide of guides) {
    const totalWon = 1_500_000 + Math.floor(Math.random() * 2_000_000 / 5_000) * 5_000;
    const settlement = await prisma.guideSettlement.create({
      data: {
        workspaceId: ws,
        guideId: guide.id,
        guideNameSnapshot: guide.name,
        periodYear: 2026,
        periodMonth: 4,
        totalWon,
        partnerId: pacific.id,
        partnerNameSnapshot: pacific.name,
        status: SettlementStatus.PARTIALLY_PAID,
      },
    });
    // 약 60% 지급
    const paid = Math.round(totalWon * 0.6 / 5_000) * 5_000;
    await prisma.guideSettlementPayment.create({
      data: {
        workspaceId: ws,
        settlementId: settlement.id,
        amountWon: paid,
        paidAt: date('2026-04-15'),
        note: '월중 1차 지급',
      },
    });
  }
  console.log(`[seed-demo] guideSettlements: ${guides.length}건 (각 60% 지급)`);

  for (let i = 0; i < 4; i++) {
    const supply = 3_500_000 + i * 500_000;
    const vat = Math.round(supply * 0.1);
    await prisma.vehicleSettlement.create({
      data: {
        workspaceId: ws,
        vehicleId: vehicles[i]!.id,
        vehicleLabelSnapshot: vehicles[i]!.label,
        periodYear: 2026,
        periodMonth: 4,
        supplyAmountWon: supply,
        vatWon: vat,
        totalWithVatWon: supply + vat,
        partnerId: busVendor.id,
        partnerNameSnapshot: busVendor.name,
        status: SettlementStatus.CONFIRMED,
      },
    });
  }
  console.log('[seed-demo] vehicleSettlements: 4건');

  // ─────────────────────────────────────────────────────────────────
  // 쇼핑 매출 + 수수료 (15건)
  // ─────────────────────────────────────────────────────────────────
  const shoppingPlan = [
    { center: ginsengCenter, sales: 12_000_000, paxRatio: 0.7 },
    { center: ginsengCenter, sales: 8_500_000, paxRatio: 0.5 },
    { center: redPineCenter, sales: 7_200_000, paxRatio: 0.6 },
    { center: redPineCenter, sales: 5_800_000, paxRatio: 0.4 },
    { center: beautyCenter, sales: 9_500_000, paxRatio: 0.8 },
    { center: beautyCenter, sales: 11_000_000, paxRatio: 0.7 },
    { center: beautyCenter, sales: 6_700_000, paxRatio: 0.5 },
    { center: lingzhiCenter, sales: 4_300_000, paxRatio: 0.3 },
    { center: lingzhiCenter, sales: 3_800_000, paxRatio: 0.3 },
    { center: hongsamCenter, sales: 6_200_000, paxRatio: 0.4 },
    { center: ginsengCenter, sales: 10_500_000, paxRatio: 0.6 },
    { center: redPineCenter, sales: 4_500_000, paxRatio: 0.4 },
    { center: beautyCenter, sales: 8_900_000, paxRatio: 0.7 },
    { center: lingzhiCenter, sales: 5_500_000, paxRatio: 0.5 },
    { center: hongsamCenter, sales: 7_800_000, paxRatio: 0.5 },
  ];
  for (let i = 0; i < shoppingPlan.length; i++) {
    const p = shoppingPlan[i]!;
    const team = teams[i % teams.length]!;
    const guide = guides[i % guides.length]!;
    const day = 5 + (i % 24);
    const rate = p.center.defaultCommissionRatePercent ?? 15;
    const commissionWon = Math.round((p.sales * rate) / 100);
    const vat = Math.round(commissionWon * 0.1);
    const sale = await prisma.shoppingSale.create({
      data: {
        workspaceId: ws,
        teamId: team.id,
        guideId: guide.id,
        centerId: p.center.id,
        visitDate: date(`2026-04-${String(day).padStart(2, '0')}`),
        paxCount: team.spec.paxAdult,
        buyerCount: Math.round(team.spec.paxAdult * p.paxRatio),
        salesWon: p.sales,
        category: p.center.category ?? null,
      },
    });
    await prisma.shoppingCommission.create({
      data: {
        workspaceId: ws,
        shoppingSaleId: sale.id,
        centerId: p.center.id,
        periodYear: 2026,
        periodMonth: 4,
        commissionWon,
        vatWon: vat,
        totalWithVatWon: commissionWon + vat,
        commissionRatePercent: rate,
        status: SettlementStatus.DRAFT,
      },
    });
  }
  console.log(`[seed-demo] shoppingSales/commissions: ${shoppingPlan.length}건`);

  // ─────────────────────────────────────────────────────────────────
  // 미수금 (Receivable + Payment)
  // ─────────────────────────────────────────────────────────────────
  const receivablePlans = [
    {
      partner: pacific,
      teamIdx: 0,
      title: '#25 Pacific Travel 4월 정산',
      currencyCode: 'KRW',
      amountMinor: 18_500_000,
      paid: 18_500_000,
      dueDate: '2026-04-30',
    },
    {
      partner: summit,
      teamIdx: 1,
      title: '#26 Summit Travel 4월 정산',
      currencyCode: 'KRW',
      amountMinor: 24_300_000,
      paid: 12_000_000,
      dueDate: '2026-04-30',
    },
    {
      partner: skyline,
      teamIdx: 4,
      title: '#29 Skyline Tours 인센티브 4월',
      currencyCode: 'KRW',
      amountMinor: 8_200_000,
      paid: 0,
      dueDate: '2026-03-15',
    },
    {
      partner: pacific,
      teamIdx: 6,
      title: '#31 Pacific Travel TOUR FEE',
      currencyCode: 'USD',
      amountMinor: 1_280_000, // 12,800 USD = $12,800.00 (cents)
      paid: 0,
      dueDate: '2026-04-30',
    },
    {
      partner: horizon,
      teamIdx: 5,
      title: '#30 Horizon Holiday TOUR FEE',
      currencyCode: 'USD',
      amountMinor: 880_000, // $8,800.00
      paid: 440_000,
      dueDate: '2026-05-15',
    },
  ];
  for (const p of receivablePlans) {
    const t = teams[p.teamIdx]!;
    const status: ReceivableStatus =
      p.paid >= p.amountMinor ? 'PAID' : p.paid > 0 ? 'PARTIALLY_PAID' : 'OPEN';
    const r = await prisma.receivable.create({
      data: {
        workspaceId: ws,
        teamId: t.id,
        partnerId: p.partner.id,
        partnerNameSnapshot: p.partner.name,
        title: p.title,
        currencyCode: p.currencyCode,
        amountMinor: p.amountMinor,
        periodYear: 2026,
        periodMonth: 4,
        dueDate: date(p.dueDate),
        status,
      },
    });
    if (p.paid > 0) {
      await prisma.receivablePayment.create({
        data: {
          workspaceId: ws,
          receivableId: r.id,
          currencyCode: p.currencyCode,
          amountMinor: p.paid,
          paidAt: date('2026-04-20'),
          note: '입금 확인',
        },
      });
    }
  }
  console.log(`[seed-demo] receivables: ${receivablePlans.length}건 (KRW 3 + USD 2)`);

  // ─────────────────────────────────────────────────────────────────
  // 회계 — FinanceWallet + LedgerLine
  // ─────────────────────────────────────────────────────────────────
  const wallets = await Promise.all([
    prisma.financeWallet.create({
      data: {
        workspaceId: ws,
        kind: WalletKind.BANK,
        name: 'KEB하나 주거래',
        institution: 'KEB하나은행',
        numberMasked: '123-***-456789',
        currencyCode: 'KRW',
        isMainKrw: true,
        openingBalanceMinor: 35_000_000,
      },
    }),
    prisma.financeWallet.create({
      data: {
        workspaceId: ws,
        kind: WalletKind.CARD,
        name: '국민카드 법인',
        institution: 'KB국민카드',
        numberMasked: '5588-****-****-1234',
        currencyCode: 'KRW',
        billingDay: 25,
        creditLimitWon: 30_000_000,
      },
    }),
    prisma.financeWallet.create({
      data: {
        workspaceId: ws,
        kind: WalletKind.CARD,
        name: '우리카드 개인',
        institution: '우리카드',
        numberMasked: '4514-****-****-5678',
        currencyCode: 'KRW',
        billingDay: 14,
        creditLimitWon: 10_000_000,
      },
    }),
    prisma.financeWallet.create({
      data: {
        workspaceId: ws,
        kind: WalletKind.FX,
        name: 'USD 보유',
        institution: 'KEB하나은행',
        currencyCode: 'USD',
        openingBalanceMinor: 850_000, // $8,500.00
      },
    }),
  ]);
  const [walletBank, walletCardKb, walletCardWoori, walletUsd] = wallets;
  console.log(`[seed-demo] wallets: ${wallets.length}개`);

  // 거래 내역 25건 (4월)
  const ledgerLines: Parameters<typeof prisma.financeLedgerLine.create>[0]['data'][] = [
    // 은행 입금/출금
    {
      workspaceId: ws,
      walletId: walletBank.id,
      entryType: LedgerEntryType.DEPOSIT,
      lineDatetime: dateTime('2026-04-03T10:00:00Z'),
      amountMinor: 18_500_000,
      note: '#25 Pacific 입금',
    },
    {
      workspaceId: ws,
      walletId: walletBank.id,
      entryType: LedgerEntryType.DEPOSIT,
      lineDatetime: dateTime('2026-04-08T10:00:00Z'),
      amountMinor: 12_000_000,
      note: '#26 Summit 1차 입금',
    },
    {
      workspaceId: ws,
      walletId: walletBank.id,
      entryType: LedgerEntryType.WITHDRAWAL,
      lineDatetime: dateTime('2026-04-10T10:00:00Z'),
      amountMinor: -8_500_000,
      note: '대한관광버스 차량비 지급',
    },
    {
      workspaceId: ws,
      walletId: walletBank.id,
      entryType: LedgerEntryType.WITHDRAWAL,
      lineDatetime: dateTime('2026-04-15T10:00:00Z'),
      amountMinor: -6_300_000,
      note: '가이드 1차 지급',
    },
    {
      workspaceId: ws,
      walletId: walletBank.id,
      entryType: LedgerEntryType.DEPOSIT,
      lineDatetime: dateTime('2026-04-20T10:00:00Z'),
      amountMinor: 8_500_000,
      note: '쇼핑 수수료 정산 입금',
    },
    {
      workspaceId: ws,
      walletId: walletBank.id,
      entryType: LedgerEntryType.WITHDRAWAL,
      lineDatetime: dateTime('2026-04-25T10:00:00Z'),
      amountMinor: -1_200_000,
      note: '4월 사무실 임차료',
    },
    // 국민카드
    {
      workspaceId: ws,
      walletId: walletCardKb.id,
      entryType: LedgerEntryType.CARD_USE,
      lineDatetime: dateTime('2026-04-05T13:30:00Z'),
      amountMinor: -350_000,
      note: '점심 식사비 (#25)',
    },
    {
      workspaceId: ws,
      walletId: walletCardKb.id,
      entryType: LedgerEntryType.CARD_USE,
      lineDatetime: dateTime('2026-04-12T19:00:00Z'),
      amountMinor: -1_200_000,
      note: '저녁 단체 식사 (#33)',
    },
    {
      workspaceId: ws,
      walletId: walletCardKb.id,
      entryType: LedgerEntryType.CARD_USE,
      lineDatetime: dateTime('2026-04-18T14:00:00Z'),
      amountMinor: -890_000,
      note: '입장료 단체구매',
    },
    {
      workspaceId: ws,
      walletId: walletCardKb.id,
      entryType: LedgerEntryType.CARD_USE,
      lineDatetime: dateTime('2026-04-22T11:00:00Z'),
      amountMinor: -460_000,
      note: '주유비',
    },
    {
      workspaceId: ws,
      walletId: walletCardKb.id,
      entryType: LedgerEntryType.CARD_PAYMENT,
      lineDatetime: dateTime('2026-04-25T09:00:00Z'),
      amountMinor: -2_900_000,
      note: '3월 결제일 자동이체',
    },
    // 우리카드
    {
      workspaceId: ws,
      walletId: walletCardWoori.id,
      entryType: LedgerEntryType.CARD_USE,
      lineDatetime: dateTime('2026-04-08T11:00:00Z'),
      amountMinor: -180_000,
      note: '소모품 구매',
    },
    {
      workspaceId: ws,
      walletId: walletCardWoori.id,
      entryType: LedgerEntryType.CARD_USE,
      lineDatetime: dateTime('2026-04-15T15:00:00Z'),
      amountMinor: -310_000,
      note: '간식/물품',
    },
    {
      workspaceId: ws,
      walletId: walletCardWoori.id,
      entryType: LedgerEntryType.CARD_PAYMENT,
      lineDatetime: dateTime('2026-04-14T08:00:00Z'),
      amountMinor: -670_000,
      note: '3월 결제일 자동이체',
    },
    // USD 외화 (환전)
    {
      workspaceId: ws,
      walletId: walletUsd.id,
      entryType: LedgerEntryType.FX_IN,
      lineDatetime: dateTime('2026-04-22T10:00:00Z'),
      amountMinor: 440_000, // $4,400.00
      note: '#30 Horizon TOUR FEE 부분 입금',
    },
    {
      workspaceId: ws,
      walletId: walletBank.id,
      entryType: LedgerEntryType.FX_OUT,
      lineDatetime: dateTime('2026-04-22T10:00:00Z'),
      amountMinor: -6_330_000,
      note: 'USD 환전 출금',
      transferGroupId: 'fx-2026-04-22',
    },
  ];
  for (const data of ledgerLines) {
    await prisma.financeLedgerLine.create({ data });
  }
  console.log(`[seed-demo] ledgerLines: ${ledgerLines.length}건`);

  // ─────────────────────────────────────────────────────────────────
  // 비용 처리 (Expense)
  // ─────────────────────────────────────────────────────────────────
  const expensePlans: Array<{
    title: string;
    category: string;
    teamIdx?: number;
    amountMinor: number;
    vendorName: string;
    expenseDate: string;
    status: ExpenseStatus;
  }> = [
    {
      title: '단체 식사 (#27 Pacific)',
      category: '식비',
      teamIdx: 2,
      amountMinor: 850_000,
      vendorName: '강남 한정식',
      expenseDate: '2026-04-26',
      status: 'PENDING_APPROVAL',
    },
    {
      title: '경복궁 입장료',
      category: '입장료',
      teamIdx: 2,
      amountMinor: 75_000,
      vendorName: '경복궁',
      expenseDate: '2026-04-26',
      status: 'PENDING_APPROVAL',
    },
    {
      title: '주유비 (서울 25인승 #1)',
      category: '주유',
      amountMinor: 320_000,
      vendorName: 'SK주유소',
      expenseDate: '2026-04-25',
      status: 'PENDING_APPROVAL',
    },
    {
      title: 'N서울타워 단체',
      category: '입장료',
      teamIdx: 3,
      amountMinor: 380_000,
      vendorName: 'N서울타워',
      expenseDate: '2026-04-26',
      status: 'PENDING_APPROVAL',
    },
    {
      title: '4월 사무실 임차료',
      category: '운영비',
      amountMinor: 1_200_000,
      vendorName: '강남빌딩관리',
      expenseDate: '2026-04-25',
      status: 'APPROVED',
    },
    {
      title: '부산 차량 식대',
      category: '식비',
      teamIdx: 9,
      amountMinor: 220_000,
      vendorName: '해운대 식당',
      expenseDate: '2026-04-19',
      status: 'APPROVED',
    },
    {
      title: '4월 알림톡 발송 비용',
      category: '운영비',
      amountMinor: 89_000,
      vendorName: 'NHN Cloud',
      expenseDate: '2026-04-20',
      status: 'APPROVED',
    },
    {
      title: '이름표 / 명찰 인쇄',
      category: '운영비',
      amountMinor: 45_000,
      vendorName: '강남인쇄소',
      expenseDate: '2026-04-10',
      status: 'REJECTED',
    },
  ];
  for (const e of expensePlans) {
    const vat = Math.round(e.amountMinor * 0.1);
    await prisma.expense.create({
      data: {
        workspaceId: ws,
        teamId: e.teamIdx != null ? teams[e.teamIdx]?.id : null,
        title: e.title,
        category: e.category,
        expenseDate: date(e.expenseDate),
        currencyCode: 'KRW',
        amountMinor: e.amountMinor,
        vatMinor: vat,
        vendorName: e.vendorName,
        status: e.status,
        approvedAt: e.status !== 'PENDING_APPROVAL' && e.status !== 'DRAFT' ? new Date() : null,
      },
    });
  }
  console.log(`[seed-demo] expenses: ${expensePlans.length}건`);

  console.log('\n✅ [seed-demo] 데모 데이터 적재 완료');
  console.log(`   - 마스터: 거래처 6 / 가이드 6 / 호텔 6 / 차량 4 / 기사 4 / 쇼핑센터 5`);
  console.log(`   - 운영: 팀 12 + 가이드/호텔/차량 배정`);
  console.log(`   - 정산: 가이드 6 / 차량 4 / 쇼핑매출+수수료 15`);
  console.log(`   - 미수금: 5 (KRW 3 + USD 2)`);
  console.log(`   - 회계: 지갑 4 / 거래 ${ledgerLines.length}건 / 비용 8`);
  console.log(`   - 환율: 3건`);
  console.log(`\n👉 브라우저에서 /w/${TARGET_SLUG}/dashboard 새로고침 후 확인`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
