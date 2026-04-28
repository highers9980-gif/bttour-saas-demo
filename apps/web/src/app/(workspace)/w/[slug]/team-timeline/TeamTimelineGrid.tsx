'use client';

import { MonthGridBar, MonthGridScroller, type MonthDay, type MonthGridBarTone } from '@bttour/ui';

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

export function TeamTimelineGrid({
  days,
  items,
  month,
}: {
  days: MonthDay[];
  items: TeamTimelineItem[];
  month: string;
}) {
  return (
    <MonthGridScroller
      month={month}
      days={days}
      rows={items}
      bars={items}
      labelColumnWidth={220}
      dayColumnWidth={40}
      maxHeight="calc(100vh - 330px)"
      getRowId={(row) => row.teamId}
      renderRowLabel={(row) => (
        <div className="min-w-0">
          <div className="truncate font-bold text-navy-900">
            #{row.teamNo} <span className="font-normal text-slate-600">{row.agentName}</span>
          </div>
          <div className="text-xs text-slate-400">
            {row.startDate.slice(5)}~{row.endDate.slice(5)}
          </div>
        </div>
      )}
      getBarRowId={(bar) => bar.teamId}
      getBarRange={(bar) => ({ fromDay: bar.fromDay, toDay: bar.toDay })}
      renderBar={(bar) => (
        <MonthGridBar
          label={`${bar.guideName ?? '미배정'} (${bar.paxDisplay}) · ${bar.agentName}`}
          tone={bar.tone}
          warning={bar.warning}
          clickable
          title={`#${bar.teamNo} ${bar.agentName}`}
        />
      )}
    />
  );
}
