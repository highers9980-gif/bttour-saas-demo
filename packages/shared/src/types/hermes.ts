export interface HermesJobMetadataBase {
  periodLabel?: string;
  latencyMs?: number;
}

export interface MonthlyInsightAutoMetadata extends HermesJobMetadataBase {
  workflow: 'MONTHLY_INSIGHT_AUTO';
  periodYear?: number;
  periodMonth?: number;
  insightId?: string;
  provider?: string;
  modelName?: string;
  errorMessage?: string;
}

export interface ReceivableReminderAutoMetadata extends HermesJobMetadataBase {
  workflow: 'RECEIVABLE_REMINDER_AUTO';
  receivableIds?: string[];
  sentCount?: number;
}

export interface ScheduleChangeNotifyMetadata extends HermesJobMetadataBase {
  workflow: 'SCHEDULE_CHANGE_NOTIFY';
  scheduleIds?: string[];
}

export type HermesJobMetadata =
  | MonthlyInsightAutoMetadata
  | ReceivableReminderAutoMetadata
  | ScheduleChangeNotifyMetadata;

function hasWorkflow(
  metadata: unknown,
  workflow: HermesJobMetadata['workflow'],
): metadata is HermesJobMetadata {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'workflow' in metadata &&
    (metadata as { workflow?: unknown }).workflow === workflow
  );
}

export function isMonthlyInsightMetadata(
  metadata: unknown,
): metadata is MonthlyInsightAutoMetadata {
  return hasWorkflow(metadata, 'MONTHLY_INSIGHT_AUTO');
}

export function isReceivableReminderMetadata(
  metadata: unknown,
): metadata is ReceivableReminderAutoMetadata {
  return hasWorkflow(metadata, 'RECEIVABLE_REMINDER_AUTO');
}

export function isScheduleChangeNotifyMetadata(
  metadata: unknown,
): metadata is ScheduleChangeNotifyMetadata {
  return hasWorkflow(metadata, 'SCHEDULE_CHANGE_NOTIFY');
}
