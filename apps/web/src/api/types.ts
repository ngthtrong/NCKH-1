import type { components as ApiComponents } from './generated';

type ApiSchemas = ApiComponents['schemas'];
type ApiUserView = ApiSchemas['UserView'];
type ApiTenantView = ApiSchemas['TenantView'];

export type UUID = ApiSchemas['UUID'];
export type TenantRole = ApiSchemas['TenantRole'];
export type ProjectRole = ApiSchemas['ProjectRole'];
export type TenantTier = ApiSchemas['TenantTier'];
export type TenantPlacement = ApiSchemas['TenantPlacement'];
export type TenantStatus = ApiSchemas['TenantStatus'];
export type ProvisioningStatus = ApiSchemas['ProvisioningStatus'];

export interface UserSummary extends ApiUserView {
  avatarUrl?: string;
  platformRoles?: Array<'PLATFORM_ADMIN'>;
}

export interface TenantSummary extends ApiTenantView {
  host?: string;
}

export interface Session {
  accessToken: string;
  user: UserSummary;
  activeTenant?: TenantSummary;
}

export type LoginRequest = ApiSchemas['LoginRequest'];

export type LoginResponse = ApiSchemas['LoginResponse'];

export type RefreshResponse = ApiSchemas['TenantSessionResponse'];

export type TenantTransferResponse = ApiSchemas['TenantTransferResponse'];

export interface DashboardMetric {
  label: string;
  value: number;
  delta?: number;
  tone?: 'primary' | 'success' | 'warning';
}

export interface ProjectSummary {
  id: UUID;
  name: string;
  description?: string;
  role: ProjectRole;
  boardId?: UUID;
  memberCount: number;
  taskCount: number;
  completedTaskCount: number;
  updatedAt: string;
}

export interface DashboardResponse {
  metrics: DashboardMetric[];
  recentProjects: ProjectSummary[];
  activity: AuditEntry[];
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskCard {
  id: UUID;
  title: string;
  description?: string;
  priority: TaskPriority;
  assignee?: UserSummary;
  dueDate?: string;
  position: number;
  version: number;
  subtaskCount: number;
  completedSubtaskCount: number;
  commentCount: number;
}

export interface BoardColumn {
  id: UUID;
  name: string;
  position: number;
  taskLimit?: number;
  tasks: TaskCard[];
}

export interface Board {
  id: UUID;
  projectId: UUID;
  name: string;
  columns: BoardColumn[];
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority: TaskPriority;
  assigneeId?: UUID;
  dueDate?: string;
  parentTaskId?: UUID;
}

export interface MoveTaskRequest {
  targetColumnId: UUID;
  targetPosition: number;
  version: number;
}

export interface Member {
  id: UUID;
  user: UserSummary;
  role: TenantRole;
  projectRoles: Array<{ projectId: UUID; projectName: string; role: ProjectRole }>;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  joinedAt?: string;
}

export interface InviteMemberRequest {
  email: string;
  role: Exclude<TenantRole, 'OWNER'>;
}

export interface ResourceItem {
  id: UUID;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: UserSummary;
  uploadedAt: string;
  taskCount: number;
}

export interface ResourceQuota {
  usedBytes: number;
  limitBytes: number;
}

export interface ResourcesResponse {
  items: ResourceItem[];
  quota?: ResourceQuota;
}

export interface NotificationItem {
  id: UUID;
  title: string;
  message: string;
  type: 'TASK' | 'COMMENT' | 'MEMBERSHIP' | 'SYSTEM';
  readAt?: string;
  createdAt: string;
  actionUrl?: string;
}

export interface AuditEntry {
  id: UUID;
  actorName: string;
  action: string;
  targetLabel?: string;
  occurredAt: string;
}

export interface AdminTenant {
  id: UUID;
  name: string;
  slug: string;
  tier: TenantTier;
  placement: TenantPlacement;
  status: TenantStatus;
  provisioningStatus?: ProvisioningStatus;
  memberCount: number;
  createdAt: string;
  lastError?: string;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiProblem {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  message?: string;
  violations?: Array<{ field: string; message: string }>;
}
