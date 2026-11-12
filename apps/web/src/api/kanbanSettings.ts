import { request } from './client';

export interface KanbanField { key: string; label: string; type: 'STRING' | 'NUMBER' | 'BOOLEAN'; required: boolean }
export interface KanbanSettings {
  wipMode: 'STRICT' | 'WARN' | 'OFF';
  wipLimit: number;
  cardStyle: 'FULL' | 'COMPACT';
  defaultColumns: string[];
  fields: KanbanField[];
}
export interface KanbanConfiguration { settings: KanbanSettings; version: number }
export const kanbanSettingsApi = {
  get: () => request<KanbanConfiguration>('/tenant-settings/kanban'),
  save: (body: KanbanConfiguration) => request<KanbanConfiguration>('/tenant-settings/kanban', { method: 'PUT', body }),
};
