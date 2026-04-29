// 베이스 컴포넌트 (Phase 0)
export { Button, type ButtonProps } from './components/Button';
export { Card, type CardProps } from './components/Card';
export { KpiCard, type KpiCardProps } from './components/KpiCard';
export { Badge, type BadgeProps } from './components/Badge';
export {
  MonthNavigator,
  type MonthNavigatorProps,
} from './components/MonthNavigator';
export { OpsHeader, type OpsHeaderProps } from './components/OpsHeader';
export { TopHeader, type TopHeaderProps } from './components/TopHeader';
export {
  Sidebar,
  type SidebarProps,
  type SidebarItem,
  type SidebarGroup,
} from './components/Sidebar';
export {
  BottomTabBar,
  type BottomTabBarProps,
  type BottomTabItem,
} from './components/BottomTabBar';
export {
  WorkspaceSwitcher,
  type WorkspaceSwitcherProps,
  type WorkspaceOption,
} from './components/WorkspaceSwitcher';

// Phase 1A 신규 컴포넌트
export {
  AuthSplitLayout,
  AuthFormPanel,
  AuthBrandPanel,
  type AuthSplitLayoutProps,
  type AuthFormPanelProps,
  type AuthBrandPanelProps,
} from './components/AuthSplitLayout';
export {
  LanguageSwitcher,
  type LanguageSwitcherProps,
  type LanguageCode,
} from './components/LanguageSwitcher';
export { Modal, type ModalProps } from './components/Modal';
export {
  ToastProvider,
  useToast,
  type ToastItem,
  type ToastTone,
} from './components/Toast';
export { EmptyState, type EmptyStateProps } from './components/EmptyState';
export {
  DataTable,
  type DataTableProps,
  type DataTableColumn,
} from './components/DataTable';
export {
  MobileCardList,
  type MobileCardListProps,
} from './components/MobileCardList';
export {
  ViewToggle,
  type ViewToggleProps,
  type ViewToggleOption,
} from './components/ViewToggle';
export {
  Field,
  TextField,
  type FieldProps,
  type TextFieldProps,
} from './components/Field';

// Phase 1B 신규 — 운영 월간 그리드(Codex 07 §공통 컴포넌트)
export {
  MonthGridScroller,
  type MonthGridScrollerProps,
} from './components/MonthGridScroller';
export {
  MonthGridBar,
  type MonthGridBarProps,
  type MonthGridBarTone,
} from './components/MonthGridBar';
export {
  ConflictBanner,
  type ConflictBannerProps,
  type ConflictBannerItem,
  type ConflictSeverity,
} from './components/ConflictBanner';
export {
  FilterToolbar,
  type FilterToolbarProps,
} from './components/FilterToolbar';
export {
  MonthlyOpsPageShell,
  type MonthlyOpsPageShellProps,
} from './components/MonthlyOpsPageShell';

// 유틸/토큰
export { cn } from './lib/cn';
export {
  buildMonthDays,
  dateToDayInMonth,
  shiftMonth,
  todayIso,
  type MonthDay,
} from './lib/month';
export { bttourPreset } from './tailwind-preset';
