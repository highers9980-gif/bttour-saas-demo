export const dashboardKpis = [
  {
    key: 'revenue',
    labelKey: 'dashboard.kpi.month_revenue',
    value: '340,598,176',
    unitKey: 'unit.krw',
    emoji: '💰',
    delta: { direction: 'up' as const, text: '18.2%' },
    footer: undefined,
    highlight: false,
  },
  {
    key: 'profit',
    labelKey: 'dashboard.kpi.month_profit',
    value: '70,560,396',
    unitKey: 'unit.krw',
    emoji: '📈',
    delta: { direction: 'up' as const, text: '22.4%' },
    footer: undefined,
    highlight: true,
  },
  {
    key: 'teams',
    labelKey: 'dashboard.kpi.active_teams',
    value: '19',
    unitKey: 'unit.team',
    emoji: '👥',
    delta: undefined,
    footer: '553명 · 미배정 3팀',
    highlight: false,
  },
  {
    key: 'receivables',
    labelKey: 'dashboard.kpi.receivables_balance',
    value: '42,387,500',
    unitKey: 'unit.krw',
    emoji: '💳',
    delta: { direction: 'down' as const, text: '8,200,000' },
    footer: undefined,
    highlight: false,
  },
] as const;

export const weeklyTeams = [
  {
    id: 'team-27',
    no: 27,
    agent: 'Pacific Travel',
    origin: 'TYO · 도쿄',
    period: '04/25~04/28',
    pax: '25+1',
    flight: 'AB1234 (ICN)',
    guide: 'Sophia',
    tone: 'blue' as const,
    bar: 'bg-orange-500',
  },
  {
    id: 'team-28',
    no: 28,
    agent: 'Summit Travel',
    origin: 'BKK · 방콕',
    period: '04/25~04/28',
    pax: '35+3',
    flight: 'CD2345 (PUS)',
    guide: 'Ethan',
    tone: 'amber' as const,
    bar: 'bg-amber-500',
  },
  {
    id: 'team-29',
    no: 29,
    agent: 'Skyline Tours',
    origin: 'TYO · 도쿄',
    period: '04/26~04/30',
    pax: '18+1',
    flight: 'AB1236 (ICN)',
    guide: null,
    tone: 'blue' as const,
    bar: 'bg-red-500',
  },
  {
    id: 'team-30',
    no: 30,
    agent: 'Horizon Holiday',
    origin: 'MNL · 마닐라',
    period: '04/27~05/01',
    pax: '22',
    flight: 'EF8210 (ICN)',
    guide: 'Lucas',
    tone: 'green' as const,
    bar: 'bg-green-500',
  },
] as const;

export const aiActivities = [
  {
    id: 'ai-1',
    icon: '✓',
    text: '정산서 자동 생성 - Sophia #27',
    time: '2분 전',
    tone: 'text-green-500',
  },
  {
    id: 'ai-2',
    icon: '✓',
    text: '미수금 독촉 카톡 자동 발송 - 4건',
    time: '12분 전',
    tone: 'text-green-500',
  },
  {
    id: 'ai-3',
    icon: '⏳',
    text: '영수증 OCR 처리중 - 3건',
    time: '진행중',
    tone: 'text-amber-500',
  },
  {
    id: 'ai-4',
    icon: '✓',
    text: '일정 변경 감지 - 호텔 재예약 알림 #27',
    time: '35분 전',
    tone: 'text-green-500',
  },
] as const;

export const notificationQueue = [
  { id: 'q-1', titleKey: 'dashboard.queue.settlement_notice', detail: 'Sophia 외 4명 · 09:00' },
  {
    id: 'q-2',
    titleKey: 'dashboard.queue.receivable_reminder',
    detail: 'Pacific Travel · 1,800,000원 · 18:00',
  },
  { id: 'q-3', titleKey: 'dashboard.queue.hotel_confirmed', detail: 'Bay View Hotel · #29' },
] as const;

export const quickActions = [
  { key: 'new_team', labelKey: 'dashboard.quick.new_team', href: 'schedule', emoji: '➕' },
  { key: 'receipt', labelKey: 'dashboard.quick.upload_receipt', href: 'expense', emoji: '📷' },
  {
    key: 'month_end',
    labelKey: 'dashboard.quick.start_month_end',
    href: 'guide-settlement',
    emoji: '💰',
  },
  { key: 'report', labelKey: 'dashboard.quick.monthly_report', href: 'revenue', emoji: '📊' },
] as const;

export const fxRates = [
  { pair: 'USD → KRW', value: '1,438.50', delta: '▲ 0.3%', tone: 'text-green-400' },
  { pair: 'USD → VND', value: '25,420', delta: '▼ 0.1%', tone: 'text-red-400' },
  { pair: 'KRW → VND', value: '17.67', delta: '─', tone: 'text-slate-400' },
] as const;
