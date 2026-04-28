'use client';

import { Badge } from '@bttour/ui';
import type { ReactNode } from 'react';
import { useState } from 'react';

type TabKey = 'active' | 'pending' | 'invite';

interface UserManagementTabsProps {
  labels: Record<TabKey, string>;
  counts: Record<TabKey, number>;
  activePanel: ReactNode;
  pendingPanel: ReactNode;
  invitePanel: ReactNode;
}

export function UserManagementTabs({
  labels,
  counts,
  activePanel,
  pendingPanel,
  invitePanel,
}: UserManagementTabsProps) {
  const [tab, setTab] = useState<TabKey>('active');

  const tabs: Array<{ key: TabKey; tone: 'slate' | 'amber' }> = [
    { key: 'active', tone: 'slate' },
    { key: 'pending', tone: 'amber' },
    { key: 'invite', tone: 'slate' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap border-b border-slate-200">
        {tabs.map((item) => {
          const selected = item.key === tab;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={
                selected
                  ? 'border-b-2 border-navy-900 px-5 py-3 text-sm font-semibold text-navy-900'
                  : 'border-b-2 border-transparent px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-700'
              }
            >
              {labels[item.key]} <Badge tone={item.tone}>{counts[item.key]}</Badge>
            </button>
          );
        })}
      </div>

      {tab === 'active' && activePanel}
      {tab === 'pending' && pendingPanel}
      {tab === 'invite' && invitePanel}
    </div>
  );
}
