'use client';

import { Modal, type SidebarGroup } from '@bttour/ui';
import { AppLink } from './AppLink';

export interface MobileMoreMenuProps {
  open: boolean;
  onClose: () => void;
  groups: SidebarGroup[];
}

export function MobileMoreMenu({ open, onClose, groups }: MobileMoreMenuProps) {
  return (
    <Modal open={open} onClose={onClose} title="메뉴" size="xl">
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.key} className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {group.label}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {group.items.map((item) => (
                <AppLink
                  key={item.key}
                  href={item.href}
                  onClick={onClose}
                  className="flex min-h-[72px] min-w-0 flex-col justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-navy-900 transition hover:border-orange-200 hover:bg-orange-50"
                >
                  <span className="text-xl" aria-hidden="true">
                    {item.emoji ?? '•'}
                  </span>
                  <span className="truncate text-sm font-bold">{item.label}</span>
                </AppLink>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}
