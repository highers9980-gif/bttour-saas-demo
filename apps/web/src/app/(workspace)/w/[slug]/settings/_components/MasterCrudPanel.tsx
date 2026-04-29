'use client';

import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  MobileCardList,
  Modal,
  TextField,
} from '@bttour/ui';
import { useMemo, useState, type ReactNode } from 'react';

type MasterValue = string | number | boolean | null | undefined;

export type MasterRow = {
  id: string;
  active?: boolean;
} & Record<string, MasterValue>;

export interface MasterFieldOption {
  value: string;
  label: string;
}

export interface MasterField {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select';
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: MasterFieldOption[];
}

export interface MasterColumn {
  key: string;
  header: string;
  hideOnMobile?: boolean;
  render?: (row: MasterRow) => ReactNode;
}

export interface MasterCrudPanelProps {
  title: string;
  description: string;
  rows: MasterRow[];
  columns: MasterColumn[];
  fields: MasterField[];
  workspaceSlug: string;
  canMutate: boolean;
  createAction: (formData: FormData) => void | Promise<void>;
  updateAction: (formData: FormData) => void | Promise<void>;
  deactivateAction: (formData: FormData) => void | Promise<void>;
  newButtonLabel?: string;
}

function valueToString(value: MasterValue) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function MasterFormFields({ fields, row }: { fields: MasterField[]; row?: MasterRow | null }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const defaultValue = valueToString(row?.[field.name]);
        const common = {
          name: field.name,
          defaultValue,
          required: field.required,
          placeholder: field.placeholder,
        };

        if (field.type === 'textarea') {
          return (
            <Field
              key={field.name}
              label={field.label}
              required={field.required}
              className="sm:col-span-2"
            >
              <textarea
                {...common}
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
              />
            </Field>
          );
        }

        if (field.type === 'select') {
          return (
            <Field key={field.name} label={field.label} required={field.required}>
              <select
                {...common}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-base md:text-sm focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
              >
                <option value="">선택</option>
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          );
        }

        return (
          <Field key={field.name} label={field.label} required={field.required}>
            <TextField
              type={field.type ?? 'text'}
              min={field.min}
              max={field.max}
              step={field.step}
              {...common}
            />
          </Field>
        );
      })}
    </div>
  );
}

export function MasterCrudPanel({
  title,
  description,
  rows,
  columns,
  fields,
  workspaceSlug,
  canMutate,
  createAction,
  updateAction,
  deactivateAction,
  newButtonLabel = '새로 추가',
}: MasterCrudPanelProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<MasterRow | null>(null);

  const tableColumns = useMemo(
    () => [
      ...columns.map((column) => ({
        key: column.key,
        header: column.header,
        hideOnMobile: column.hideOnMobile,
        cell: (row: MasterRow) =>
          column.render ? column.render(row) : valueToString(row[column.key]),
      })),
      {
        key: 'status',
        header: '상태',
        cell: (row: MasterRow) =>
          row.active === false ? (
            <Badge tone="slate">비활성</Badge>
          ) : (
            <Badge tone="green">활성</Badge>
          ),
      },
      {
        key: 'actions',
        header: '관리',
        align: 'right' as const,
        cell: (row: MasterRow) => (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={!canMutate}
              onClick={() => setEditingRow(row)}
            >
              수정
            </Button>
            <form action={deactivateAction}>
              <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
              <input type="hidden" name="id" value={row.id} />
              <Button size="sm" variant="danger" type="submit" disabled={!canMutate}>
                비활성
              </Button>
            </form>
          </div>
        ),
      },
    ],
    [canMutate, columns, deactivateAction, workspaceSlug],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-navy-900">{title}</h1>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <Button variant="secondary" disabled={!canMutate} onClick={() => setCreateOpen(true)}>
          + {newButtonLabel}
        </Button>
      </div>

      <Card padding="none" className="hidden overflow-hidden md:block">
        <DataTable
          rows={rows}
          columns={tableColumns}
          rowKey={(row) => row.id}
          empty={
            <EmptyState
              title="등록된 데이터가 없습니다"
              description="오른쪽 상단 버튼으로 첫 데이터를 등록하세요."
            />
          }
        />
      </Card>

      <MobileCardList
        className="md:hidden"
        rows={rows}
        rowKey={(row) => row.id}
        empty={<EmptyState title="등록된 데이터가 없습니다" />}
        renderCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-navy-900">
                  {columns[0]?.render
                    ? columns[0].render(row)
                    : valueToString(row[columns[0]?.key ?? 'name'])}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {columns
                    .slice(1, 3)
                    .map((column) => valueToString(row[column.key]))
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              {row.active === false ? (
                <Badge tone="slate">비활성</Badge>
              ) : (
                <Badge tone="green">활성</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!canMutate}
                onClick={() => setEditingRow(row)}
              >
                수정
              </Button>
              <form action={deactivateAction}>
                <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
                <input type="hidden" name="id" value={row.id} />
                <Button size="sm" variant="danger" type="submit" disabled={!canMutate}>
                  비활성
                </Button>
              </form>
            </div>
          </div>
        )}
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={`${title} 추가`}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              취소
            </Button>
            <Button type="submit" form="master-create-form">
              저장
            </Button>
          </>
        }
      >
        <form id="master-create-form" action={createAction} className="space-y-4">
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <MasterFormFields fields={fields} />
        </form>
      </Modal>

      <Modal
        open={Boolean(editingRow)}
        onClose={() => setEditingRow(null)}
        title={`${title} 수정`}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingRow(null)}>
              취소
            </Button>
            <Button type="submit" form="master-update-form">
              저장
            </Button>
          </>
        }
      >
        <form id="master-update-form" action={updateAction} className="space-y-4">
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <input type="hidden" name="id" value={editingRow?.id ?? ''} />
          <MasterFormFields fields={fields} row={editingRow} />
        </form>
      </Modal>
    </div>
  );
}
