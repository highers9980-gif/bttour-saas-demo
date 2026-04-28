import type { MonthGridBarTone } from '@bttour/ui';

export interface TeamTimelineItem {
  teamId: string;
  teamNo: number;
  agentName: string;
  fromDay: number;
  toDay: number;
  startDate: string;
  endDate: string;
  guideName?: string;
  paxDisplay: string;
  tone: MonthGridBarTone;
  warning?: boolean;
}

export const teamTimelineMonth = '2026-04';

export const teamTimelineItems: TeamTimelineItem[] = [
  {
    teamId: 'team-19',
    teamNo: 19,
    agentName: 'Pacific Travel',
    fromDay: 1,
    toDay: 4,
    startDate: '2026-04-01',
    endDate: '2026-04-04',
    guideName: 'Mia',
    paxDisplay: '25+1',
    tone: 'green',
  },
  {
    teamId: 'team-22',
    teamNo: 22,
    agentName: 'Skyline Tours',
    fromDay: 2,
    toDay: 6,
    startDate: '2026-04-02',
    endDate: '2026-04-06',
    guideName: 'Lucas',
    paxDisplay: '30+2',
    tone: 'blue',
  },
  {
    teamId: 'team-24',
    teamNo: 24,
    agentName: 'Summit Travel',
    fromDay: 10,
    toDay: 15,
    startDate: '2026-04-10',
    endDate: '2026-04-15',
    guideName: 'Olivia',
    paxDisplay: '35+3',
    tone: 'amber',
  },
  {
    teamId: 'team-27',
    teamNo: 27,
    agentName: 'Pacific Travel',
    fromDay: 25,
    toDay: 28,
    startDate: '2026-04-25',
    endDate: '2026-04-28',
    guideName: 'Sophia',
    paxDisplay: '25+1',
    tone: 'pink',
    warning: true,
  },
  {
    teamId: 'team-28',
    teamNo: 28,
    agentName: 'Summit Travel',
    fromDay: 25,
    toDay: 28,
    startDate: '2026-04-25',
    endDate: '2026-04-28',
    guideName: 'Ethan',
    paxDisplay: '35+3',
    tone: 'purple',
  },
  {
    teamId: 'team-29',
    teamNo: 29,
    agentName: 'Skyline Tours',
    fromDay: 26,
    toDay: 30,
    startDate: '2026-04-26',
    endDate: '2026-04-30',
    paxDisplay: '18+1',
    tone: 'slate',
  },
  {
    teamId: 'team-31',
    teamNo: 31,
    agentName: 'Pacific Travel',
    fromDay: 27,
    toDay: 30,
    startDate: '2026-04-27',
    endDate: '2026-04-30',
    guideName: 'Sophia',
    paxDisplay: '40',
    tone: 'pink',
    warning: true,
  },
];

export const guideSummaries: Array<{
  id: string;
  name: string;
  teamCount: number;
  tone: MonthGridBarTone;
  hasConflict?: boolean;
}> = [
  { id: 'sophia', name: 'Sophia', teamCount: 2, tone: 'pink' as const, hasConflict: true },
  { id: 'lucas', name: 'Lucas', teamCount: 2, tone: 'blue' as const },
  { id: 'ethan', name: 'Ethan', teamCount: 2, tone: 'purple' as const },
  { id: 'mia', name: 'Mia', teamCount: 1, tone: 'green' as const },
  { id: 'olivia', name: 'Olivia', teamCount: 1, tone: 'amber' as const },
] as const;

export const guideConflicts = [
  {
    id: 'guide-conflict-sophia',
    severity: 'danger' as const,
    title: '가이드 중복 배정 감지: Sophia',
    detail: '04/27~04/28에 #27, #31 동시 배정. 한쪽 변경 필요.',
  },
] as const;
