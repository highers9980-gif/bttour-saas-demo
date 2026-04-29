import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface WorkspaceOption {
  id: string;
  slug: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'VIEWER';
}

export interface WorkspaceSwitcherProps {
  current: WorkspaceOption;
  options: WorkspaceOption[];
  onSelect: (id: string) => void;
  onCreate?: () => void;
  className?: string;
  trigger?: ReactNode;
}

/**
 * 멀티테넌시 진입을 위한 워크스페이스 전환 드롭다운 베이스.
 * 실제 메뉴 UX는 Phase 1에서 도면 적용 시 보강. 지금은 골격만.
 */
export function WorkspaceSwitcher({
  current,
  options,
  onSelect,
  onCreate,
  className,
}: WorkspaceSwitcherProps) {
  return (
    <details
      className={cn(
        'relative bg-white/5 rounded-md text-xs',
        className,
      )}
    >
      <summary className="cursor-pointer list-none px-3 py-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-slate-300">워크스페이스</div>
          <div className="font-semibold text-white truncate">
            {current.name}
          </div>
        </div>
        <span className="text-slate-400">▼</span>
      </summary>
      <div className="absolute z-10 left-0 right-0 mt-1 bg-white text-slate-700 rounded-md shadow-float overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={cn(
              'w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between',
              opt.id === current.id && 'bg-slate-50 font-semibold',
            )}
          >
            <span className="truncate">{opt.name}</span>
            <span className="text-xs text-slate-400 ml-2">{opt.role}</span>
          </button>
        ))}
        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="w-full text-left px-3 py-2 border-t border-slate-100 text-orange-600 font-semibold hover:bg-orange-50"
          >
            + 새 워크스페이스
          </button>
        )}
      </div>
    </details>
  );
}
