import { request } from './client';
import type { components as ApiComponents } from './generated';
import type {
  AdminTenant,
  AdminTenantDetail,
  Board,
  BoardSummary,
  Comment,
  CreateColumnRequest,
  CreateProjectRequest,
  CreateTenantRequest,
  CreateTaskRequest,
  DashboardResponse,
  InviteMemberRequest,
  InvitationCreatedView,
  InvitationView,
  LoginRequest,
  LoginResponse,
  Member,
  MoveTaskRequest,
  NotificationItem,
  NotificationPreferences,
  OnboardingView,
  PageResponse,
  PaymentSession,
  ProjectRole,
  ProjectMember,
  ProjectStatus,
  ProjectSummary,
  PushSubscription,
  ReorderColumnsRequest,
  RefreshResponse,
  RegisterRequest,
  ResourceItem,
  ResourceDeadLetter,
  ResourcesResponse,
  TenantRole,
  TenantPlacement,
  TenantStatus,
  TenantSummary,
  TenantTransferResponse,
  UpdateColumnRequest,
  UpdateTaskRequest,
  UpdateProjectRequest,
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
    status: project.status,
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
          columnId: task.columnId,
          parentTaskId: task.parentTaskId ?? undefined,
          title: task.title,
          description: task.description ?? undefined,
          priority: 'MEDIUM',
          assignee: task.assigneeUserId
            ? { id: task.assigneeUserId, email: '', displayName: 'Thành viên', platformRoles: [] }
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
    user: { id: member.userId, email: member.email, displayName: member.displayName, platformRoles: [] },
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
    uploadedBy: { id: item.uploadedBy, email: '', displayName: 'Thành viên', platformRoles: [] },
    uploadedAt: item.createdAt,
    taskCount: item.taskCount,
    kind: item.kind,
    linkUrl: item.linkUrl ?? undefined,
    taskIds: item.taskIds,
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
  register: (payload: RegisterRequest) =>
    request<LoginResponse>('/auth/register', { method: 'POST', body: payload, skipAuth: true }),
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
  create: (payload: CreateTenantRequest) =>
    request<TenantSummary>('/tenants', { method: 'POST', body: payload }),
  onboarding: (tenantId: UUID) =>
    request<OnboardingView>(`/tenants/${tenantId}/onboarding`),
};

export const paymentsApi = {
  createSession: (tenantId: UUID, payload: ApiSchemas['CreatePaymentRequest']) =>
    request<PaymentSession>(`/tenants/${tenantId}/payment-session`, {
      method: 'POST',
      headers: { 'Idempotency-Key': `onboarding-${tenantId}` },
      body: payload,
    }),
  completeFake: (tenantId: UUID, paymentId: UUID) =>
    request<ApiSchemas['PaymentResultView']>(
      `/tenants/${tenantId}/payments/${paymentId}/fake-complete`,
      { method: 'POST' },
    ),
};

export const projectsApi = {
  list: async () => (await request<RawProject[]>('/projects')).map(mapProject),
  create: async (payload: CreateProjectRequest) =>
    mapProject(await request<RawProject>('/projects', { method: 'POST', body: payload })),
  update: async (projectId: UUID, payload: UpdateProjectRequest) =>
    mapProject(await request<RawProject>(`/projects/${projectId}`, { method: 'PUT', body: payload })),
  changeStatus: async (projectId: UUID, status: Exclude<ProjectStatus, 'DELETED'>) =>
    mapProject(await request<RawProject>(`/projects/${projectId}/status`, {
      method: 'PATCH',
      body: { status },
    })),
  remove: (projectId: UUID) => request<void>(`/projects/${projectId}`, { method: 'DELETE' }),
  members: (projectId: UUID) =>
    request<ProjectMember[]>(`/projects/${projectId}/members`),
  setMember: (projectId: UUID, userId: UUID, role: ProjectRole) =>
    request<ProjectMember>(`/projects/${projectId}/members/${userId}`, {
      method: 'PUT',
      body: { role },
    }),
  removeMember: (projectId: UUID, userId: UUID) =>
    request<void>(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
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
      recentProjects: projects.filter((project) => project.status === 'ACTIVE').slice(0, 6),
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
  list: (projectId: UUID) => request<BoardSummary[]>(`/projects/${projectId}/boards`),
  create: async (projectId: UUID, name: string) =>
    mapBoard(await request<RawBoard>(`/projects/${projectId}/boards`, {
      method: 'POST',
      body: { name },
    })),
  get: async (boardId: UUID) => mapBoard(await request<RawBoard>(`/boards/${boardId}`)),
  update: async (boardId: UUID, name: string, version: number) =>
    mapBoard(await request<RawBoard>(`/boards/${boardId}`, {
      method: 'PUT',
      body: { name, version },
    })),
  remove: (boardId: UUID) => request<void>(`/boards/${boardId}`, { method: 'DELETE' }),
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
  moveTask: async (boardId: UUID, taskId: UUID, payload: MoveTaskRequest) =>
    mapBoard(await request<RawBoard>(`/boards/${boardId}/tasks/order`, {
      method: 'PUT',
      body: { items: [{ taskId, ...payload }] },
    })),
  updateTask: (taskId: UUID, payload: UpdateTaskRequest) =>
    request<RawTask>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: {
        columnId: payload.columnId,
        title: payload.title,
        description: payload.description,
        assigneeUserId: payload.assigneeId,
        dueAt: payload.dueDate,
        position: payload.position,
        version: payload.version,
      },
    }),
  deleteTask: (taskId: UUID) => request<void>(`/tasks/${taskId}`, { method: 'DELETE' }),
  comments: (taskId: UUID) => request<Comment[]>(`/tasks/${taskId}/comments`),
  addComment: (taskId: UUID, body: string) =>
    request<Comment>(`/tasks/${taskId}/comments`, { method: 'POST', body: { body } }),
  updateComment: (commentId: UUID, body: string) =>
    request<Comment>(`/comments/${commentId}`, { method: 'PATCH', body: { body } }),
  deleteComment: (commentId: UUID) =>
    request<void>(`/comments/${commentId}`, { method: 'DELETE' }),
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
  invitations: () => request<InvitationView[]>('/members/invitations'),
  invite: (payload: InviteMemberRequest) =>
    request<InvitationCreatedView>('/members/invitations', { method: 'POST', body: payload }),
  revokeInvitation: (invitationId: UUID) =>
    request<void>(`/members/invitations/${invitationId}`, { method: 'DELETE' }),
  changeRole: async (membershipId: UUID, role: Exclude<TenantRole, 'OWNER'>) =>
    mapMember(await request<RawMember>(`/members/${membershipId}/role`, { method: 'PATCH', body: { role } })),
  revoke: (membershipId: UUID) =>
    request<void>(`/members/${membershipId}`, { method: 'DELETE' }),
  transferOwnership: async (membershipId: UUID) =>
    mapMember(await request<RawMember>(`/members/${membershipId}/transfer-ownership`, { method: 'POST' })),
};

export const invitationsApi = {
  preview: (token: string) =>
    request<InvitationView>(`/invitations/${encodeURIComponent(token)}`, { skipAuth: true }),
  accept: (token: string) =>
    request<InvitationView>(`/invitations/${encodeURIComponent(token)}/accept`, { method: 'POST' }),
  reject: (token: string) =>
    request<InvitationView>(`/invitations/${encodeURIComponent(token)}/reject`, { method: 'POST' }),
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
  createLink: async (name: string, url: string) =>
    mapResource(await request<RawResource>('/resources/links', {
      method: 'POST',
      body: { name, url },
    })),
  downloadUrl: (resourceId: UUID) =>
    request<{ url: string; expiresAt: string }>(`/resources/${resourceId}/download-url`),
  remove: (resourceId: UUID) =>
    request<void>(`/resources/${resourceId}`, { method: 'DELETE' }),
  attach: (resourceId: UUID, taskId: UUID) =>
    request<void>(`/resources/${resourceId}/tasks/${taskId}`, { method: 'POST' }),
  detach: (resourceId: UUID, taskId: UUID) =>
    request<void>(`/resources/${resourceId}/tasks/${taskId}`, { method: 'DELETE' }),
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
  preferences: () => request<NotificationPreferences>('/notifications/preferences'),
  updatePreferences: (preferences: NotificationPreferences) =>
    request<NotificationPreferences>('/notifications/preferences', { method: 'PUT', body: preferences }),
  pushSubscriptions: () => request<PushSubscription[]>('/notifications/push-subscriptions'),
  addPushSubscription: (payload: ApiSchemas['PushSubscriptionRequest']) =>
    request<PushSubscription>('/notifications/push-subscriptions', { method: 'POST', body: payload }),
  removePushSubscription: (subscriptionId: UUID) =>
    request<void>(`/notifications/push-subscriptions/${subscriptionId}`, { method: 'DELETE' }),
};

export const adminApi = {
  tenants: (
    page = 0,
    search = '',
    status: TenantStatus | '' = '',
    placement: TenantPlacement | '' = '',
  ) => {
    const query = new URLSearchParams({ page: String(page), search });
    if (status) query.set('status', status);
    if (placement) query.set('placement', placement);
    return request<PageResponse<AdminTenant>>(`/admin/tenants?${query.toString()}`);
  },
  tenant: (tenantId: UUID) =>
    request<AdminTenantDetail>(`/admin/tenants/${tenantId}`),
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
