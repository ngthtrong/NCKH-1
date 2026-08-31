import { request } from './client';
import type { components as ApiComponents } from './generated';
import type {
  AdminTenant,
  Board,
  CreateColumnRequest,
  CreateProjectRequest,
  CreateTaskRequest,
  DashboardResponse,
  InviteMemberRequest,
  LoginRequest,
  LoginResponse,
  Member,
  MoveTaskRequest,
  NotificationItem,
  PageResponse,
  ProjectRole,
  ProjectSummary,
  ReorderColumnsRequest,
  RefreshResponse,
  ResourceItem,
  ResourceDeadLetter,
  ResourcesResponse,
  TenantRole,
  TenantSummary,
  TenantTransferResponse,
  UpdateColumnRequest,
  UUID,
} from './types';

type ApiSchemas = ApiComponents['schemas'];
type RawDashboard = ApiSchemas['DashboardView'];
type RawProject = ApiSchemas['ProjectView'];
type RawTask = ApiSchemas['TaskView'];
type RawBoard = ApiSchemas['BoardView'];
type RawMember = ApiSchemas['MemberView'];
type RawProjectMember = ApiSchemas['ProjectMemberView'];
type RawResource = ApiSchemas['ResourceView'];
type RawNotification = ApiSchemas['NotificationView'];
type RawAudit = ApiSchemas['AuditView'];

function mapProject(project: RawProject): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    description: project.description ?? undefined,
    role: project.role,
    boardId: project.boardId ?? undefined,
    memberCount: project.memberCount,
    taskCount: project.taskCount,
    completedTaskCount: project.completedTaskCount,
    updatedAt: project.updatedAt,
  };
}

function mapBoard(raw: RawBoard): Board {
  return {
    id: raw.id,
    projectId: raw.projectId,
    name: raw.name,
    version: raw.version,
    columns: raw.columns.map((column) => ({
      id: column.id,
      name: column.name,
      position: Number(column.position),
      tasks: raw.tasks
        .filter((task) => task.columnId === column.id)
        .map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description ?? undefined,
          priority: 'MEDIUM',
          assignee: task.assigneeUserId
            ? { id: task.assigneeUserId, email: '', displayName: 'Thành viên' }
            : undefined,
          dueDate: task.dueAt ?? undefined,
          position: Number(task.position),
          version: task.version,
          subtaskCount: raw.tasks.filter((candidate) => candidate.parentTaskId === task.id).length,
          completedSubtaskCount: 0,
          commentCount: 0,
        })),
    })),
  };
}

function mapMember(
  member: RawMember,
  projectRoles: Member['projectRoles'] = [],
): Member {
  return {
    id: member.membershipId,
    user: { id: member.userId, email: member.email, displayName: member.displayName },
    role: member.role,
    projectRoles,
    status: member.active ? 'ACTIVE' : 'SUSPENDED',
  };
}

function mapResource(item: RawResource): ResourceItem {
  return {
    id: item.id,
    fileName: item.originalName,
    contentType: item.contentType,
    sizeBytes: item.sizeBytes,
    uploadedBy: { id: item.uploadedBy, email: '', displayName: 'Thành viên' },
    uploadedAt: item.createdAt,
    taskCount: item.taskCount,
  };
}

function notificationType(eventType: string): NotificationItem['type'] {
  if (eventType.startsWith('TASK_')) return 'TASK';
  if (eventType.startsWith('COMMENT_')) return 'COMMENT';
  if (eventType.startsWith('MEMBERSHIP_')) return 'MEMBERSHIP';
  return 'SYSTEM';
}

export const authApi = {
  login: (payload: LoginRequest) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: payload, skipAuth: true }),
  refresh: () =>
    request<RefreshResponse>('/auth/refresh', { method: 'POST', skipAuth: true }),
  logout: () => request<void>('/auth/logout', { method: 'POST', skipAuth: true }),
  me: () => request<ApiSchemas['MeResponse']>('/auth/me'),
  exchange: (code: string) =>
    request<RefreshResponse>('/auth/exchange', { method: 'POST', body: { code }, skipAuth: true }),
  createTenantTransfer: (tenantSlug: string) =>
    request<TenantTransferResponse>('/auth/tenant-transfer', {
      method: 'POST',
      body: { tenantSlug },
    }),
};

export const tenantsApi = {
  list: () => request<TenantSummary[]>('/tenants'),
};

export const projectsApi = {
  list: async () => (await request<RawProject[]>('/projects')).map(mapProject),
  create: async (payload: CreateProjectRequest) =>
    mapProject(await request<RawProject>('/projects', { method: 'POST', body: payload })),
  members: (projectId: UUID) =>
    request<RawProjectMember[]>(`/projects/${projectId}/members`),
};

export const dashboardApi = {
  get: async (): Promise<DashboardResponse> => {
    const [summary, projects, activity] = await Promise.all([
      request<RawDashboard>('/dashboard'),
      projectsApi.list(),
      request<RawAudit[]>('/audit?limit=8').catch(() => []),
    ]);
    return {
      metrics: [
        { label: 'Dự án', value: summary.projects, tone: 'primary' },
        { label: 'Công việc đang mở', value: summary.openTasks, tone: 'success' },
        { label: 'Công việc quá hạn', value: summary.overdueTasks, tone: 'warning' },
      ],
      recentProjects: projects.slice(0, 6),
      activity: activity.map((entry) => ({
        id: entry.id,
        actorName: entry.actorName,
        action: entry.action,
        targetLabel: entry.aggregateType,
        occurredAt: entry.occurredAt,
      })),
    };
  },
};

export const boardsApi = {
  get: async (boardId: UUID) => mapBoard(await request<RawBoard>(`/boards/${boardId}`)),
  createColumn: async (boardId: UUID, payload: CreateColumnRequest) =>
    mapBoard(await request<RawBoard>(`/boards/${boardId}/columns`, {
      method: 'POST',
      body: payload,
    })),
  updateColumn: async (boardId: UUID, columnId: UUID, payload: UpdateColumnRequest) =>
    mapBoard(await request<RawBoard>(`/boards/${boardId}/columns/${columnId}`, {
      method: 'PATCH',
      body: payload,
    })),
  reorderColumns: async (boardId: UUID, payload: ReorderColumnsRequest) =>
    mapBoard(await request<RawBoard>(`/boards/${boardId}/columns/order`, {
      method: 'PUT',
      body: payload,
    })),
  deleteColumn: async (boardId: UUID, columnId: UUID, version: number) =>
    mapBoard(await request<RawBoard>(
      `/boards/${boardId}/columns/${columnId}?version=${encodeURIComponent(version)}`,
      { method: 'DELETE' },
    )),
  createTask: async (boardId: UUID, columnId: UUID, payload: CreateTaskRequest) => {
    await request<RawTask>(`/boards/${boardId}/tasks`, {
      method: 'POST',
      body: {
        columnId,
        parentTaskId: payload.parentTaskId,
        title: payload.title,
        description: payload.description,
        assigneeUserId: payload.assigneeId,
        dueAt: payload.dueDate,
      },
    });
    return boardsApi.get(boardId);
  },
  moveTask: (boardId: UUID, taskId: UUID, payload: MoveTaskRequest) =>
    request<void>(`/boards/${boardId}/tasks/${taskId}/position`, {
      method: 'PATCH',
      body: payload,
    }),
};

export const membersApi = {
  list: async () => {
    const [members, projects] = await Promise.all([
      request<RawMember[]>('/members'),
      projectsApi.list(),
    ]);
    const memberships = await Promise.all(
      projects.map(async (project) => ({
        project,
        memberships: await projectsApi.members(project.id),
      })),
    );
    return members.map((member) => mapMember(
      member,
      memberships.flatMap(({ project, memberships: projectMemberships }) =>
        projectMemberships
          .filter((projectMember) => projectMember.userId === member.userId)
          .map((projectMember) => ({
            projectId: project.id,
            projectName: project.name,
            role: projectMember.role,
          })),
      ),
    ));
  },
  invite: async (payload: InviteMemberRequest) =>
    mapMember(await request<RawMember>('/members/invitations', { method: 'POST', body: payload })),
  changeRole: async (membershipId: UUID, role: Exclude<TenantRole, 'OWNER'>) =>
    mapMember(await request<RawMember>(`/members/${membershipId}/role`, { method: 'PATCH', body: { role } })),
  revoke: (membershipId: UUID) =>
    request<void>(`/members/${membershipId}`, { method: 'DELETE' }),
};

export const resourcesApi = {
  list: async (): Promise<ResourcesResponse> => {
    const [items, quota] = await Promise.all([
      request<RawResource[]>('/resources'),
      request<NonNullable<ResourcesResponse['quota']>>('/resources/quota').catch(() => undefined),
    ]);
    return { items: items.map(mapResource), quota };
  },
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return mapResource(await request<RawResource>('/resources', { method: 'POST', body: formData }));
  },
  downloadUrl: (resourceId: UUID) =>
    request<{ url: string; expiresAt: string }>(`/resources/${resourceId}/download-url`),
  remove: (resourceId: UUID) =>
    request<void>(`/resources/${resourceId}`, { method: 'DELETE' }),
};

export const notificationsApi = {
  list: async (): Promise<NotificationItem[]> =>
    (await request<RawNotification[]>('/notifications')).map((item) => ({
      id: item.id,
      title: item.title,
      message: item.body,
      type: notificationType(item.eventType),
      readAt: item.readAt ?? undefined,
      createdAt: item.createdAt,
    })),
  markRead: (notificationId: UUID) =>
    request<void>(`/notifications/${notificationId}/read`, { method: 'PATCH' }),
  markAllRead: () => request<void>('/notifications/read-all', { method: 'POST' }),
};

export const adminApi = {
  tenants: (page = 0, search = '') =>
    request<PageResponse<AdminTenant>>(
      `/admin/tenants?page=${page}&search=${encodeURIComponent(search)}`,
    ),
  retryProvisioning: (tenantId: UUID) =>
    request<void>(`/admin/tenants/${tenantId}/provisioning/retry`, { method: 'POST' }),
  resourceDeadLetters: (tenantId: UUID, page = 0) =>
    request<PageResponse<ResourceDeadLetter>>(
      `/admin/tenants/${tenantId}/resource-dead-letters?page=${page}`,
    ),
  requeueResourceDeadLetter: ({ tenantId, eventId }: { tenantId: UUID; eventId: UUID }) =>
    request<void>(
      `/admin/tenants/${tenantId}/resource-dead-letters/${eventId}/requeue`,
      { method: 'POST' },
    ),
};
