export type TourTeamStatus = 'ACTIVE' | 'SCHEDULED' | 'COMPLETED' | 'UNASSIGNED';

export interface ScheduleTeam {
  id: string;
  teamNo: number;
  agentName: string;
  period: string;
  startDate: string;
  endDate: string;
  originCode: 'TYO' | 'BKK' | 'MNL';
  originLabel: string;
  paxDisplay: string;
  inboundFlightNo: string;
  outboundFlightNo: string;
  hotelName?: string;
  guideName?: string;
  status: TourTeamStatus;
}

export const scheduleMonth = '2026-04';

export const scheduleTeams: ScheduleTeam[] = [
  {
    id: 'team-19',
    teamNo: 19,
    agentName: 'Pacific Travel',
    period: '03/31~04/04',
    startDate: '2026-03-31',
    endDate: '2026-04-04',
    originCode: 'TYO',
    originLabel: '도쿄',
    paxDisplay: '25+1',
    inboundFlightNo: 'AB1234',
    outboundFlightNo: 'CD2389',
    hotelName: 'Bay View',
    guideName: 'Mia',
    status: 'ACTIVE',
  },
  {
    id: 'team-20',
    teamNo: 20,
    agentName: 'Coastal Express',
    period: '03/31~04/03',
    startDate: '2026-03-31',
    endDate: '2026-04-03',
    originCode: 'BKK',
    originLabel: '방콕',
    paxDisplay: '18',
    inboundFlightNo: 'CD2345',
    outboundFlightNo: 'AB1289',
    hotelName: 'Crown Hotel',
    guideName: 'Ethan',
    status: 'ACTIVE',
  },
  {
    id: 'team-22',
    teamNo: 22,
    agentName: 'Skyline Tours',
    period: '04/02~04/06',
    startDate: '2026-04-02',
    endDate: '2026-04-06',
    originCode: 'TYO',
    originLabel: '도쿄',
    paxDisplay: '30+2',
    inboundFlightNo: 'AB1236',
    outboundFlightNo: 'CD2378',
    hotelName: 'Bay View',
    guideName: 'Lucas',
    status: 'ACTIVE',
  },
  {
    id: 'team-24',
    teamNo: 24,
    agentName: 'Summit Travel',
    period: '04/10~04/15',
    startDate: '2026-04-10',
    endDate: '2026-04-15',
    originCode: 'BKK',
    originLabel: '방콕',
    paxDisplay: '35+3',
    inboundFlightNo: 'CD2345',
    outboundFlightNo: 'AB1289',
    hotelName: 'Royal Park',
    guideName: 'Olivia',
    status: 'ACTIVE',
  },
  {
    id: 'team-27',
    teamNo: 27,
    agentName: 'Pacific Travel',
    period: '04/25~04/28',
    startDate: '2026-04-25',
    endDate: '2026-04-28',
    originCode: 'TYO',
    originLabel: '도쿄',
    paxDisplay: '25+1',
    inboundFlightNo: 'AB1234',
    outboundFlightNo: 'CD2389',
    hotelName: 'Bay View',
    guideName: 'Sophia',
    status: 'ACTIVE',
  },
  {
    id: 'team-28',
    teamNo: 28,
    agentName: 'Summit Travel',
    period: '04/25~04/28',
    startDate: '2026-04-25',
    endDate: '2026-04-28',
    originCode: 'BKK',
    originLabel: '방콕',
    paxDisplay: '35+3',
    inboundFlightNo: 'CD2345',
    outboundFlightNo: 'AB1289',
    hotelName: 'Plaza Hotel',
    guideName: 'Ethan',
    status: 'ACTIVE',
  },
  {
    id: 'team-29',
    teamNo: 29,
    agentName: 'Skyline Tours',
    period: '04/26~04/30',
    startDate: '2026-04-26',
    endDate: '2026-04-30',
    originCode: 'TYO',
    originLabel: '도쿄',
    paxDisplay: '18+1',
    inboundFlightNo: 'AB1236',
    outboundFlightNo: 'CD2378',
    status: 'UNASSIGNED',
  },
  {
    id: 'team-30',
    teamNo: 30,
    agentName: 'Horizon Holiday',
    period: '04/27~05/01',
    startDate: '2026-04-27',
    endDate: '2026-05-01',
    originCode: 'MNL',
    originLabel: '마닐라',
    paxDisplay: '22',
    inboundFlightNo: 'EF8210',
    outboundFlightNo: 'EF8211',
    hotelName: 'Plaza Hotel',
    guideName: 'Lucas',
    status: 'SCHEDULED',
  },
];

export const scheduleStats = {
  totalTeams: 39,
  activeTeams: 19,
  scheduledTeams: 17,
  unassignedTeams: 3,
  totalPax: 827,
} as const;

export const scheduleFilterOptions = {
  guides: ['Sophia', 'Lucas', 'Ethan', 'Mia', 'Olivia'],
  origins: ['TYO', 'BKK', 'MNL'],
  statuses: ['ACTIVE', 'SCHEDULED', 'UNASSIGNED'],
} as const;
