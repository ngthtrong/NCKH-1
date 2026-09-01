import {
  Add,
  ArchiveOutlined,
  DeleteOutline,
  EditOutlined,
  GroupsOutlined,
  OpenInNew,
  UnarchiveOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { membersApi, projectsApi } from '../api/endpoints';
import type { Member, ProjectRole, ProjectSummary, UUID } from '../api/types';
import { EmptyState, ErrorState, SectionLoader } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';
import { StatusChip } from '../components/StatusChip';

const roleLabels: Record<ProjectRole, string> = {
  MANAGER: 'Quản lý',
  MEMBER: 'Thành viên',
  VIEWER: 'Chỉ xem',
};

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectSummary | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [managedProject, setManagedProject] = useState<ProjectSummary | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<UUID | ''>('');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('MEMBER');

  const projects = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });
  const tenantMembers = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.list,
    enabled: Boolean(managedProject),
  });
  const projectMembers = useQuery({
    queryKey: ['project-members', managedProject?.id],
    queryFn: () => projectsApi.members(managedProject!.id),
    enabled: Boolean(managedProject),
  });

  useEffect(() => {
    if (!managedProject) return;
    const refreshed = projects.data?.find((project) => project.id === managedProject.id);
    if (refreshed) setManagedProject(refreshed);
  }, [projects.data, managedProject?.id]);

  const refreshProjects = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const saveProject = useMutation({
    mutationFn: () => editing
      ? projectsApi.update(editing.id, { name: name.trim(), description: description.trim() || null })
      : projectsApi.create({ name: name.trim(), description: description.trim() || undefined }),
    onSuccess: async () => {
      setEditorOpen(false);
      setEditing(null);
      setName('');
      setDescription('');
      setFeedback(editing ? 'Đã cập nhật dự án.' : 'Đã tạo dự án và bảng Kanban mặc định.');
      await refreshProjects();
    },
    onError: (cause) => setFeedback(errorMessage(cause)),
  });
  const changeStatus = useMutation({
    mutationFn: ({ project, status }: { project: ProjectSummary; status: 'ACTIVE' | 'ARCHIVED' }) =>
      projectsApi.changeStatus(project.id, status),
    onSuccess: async (project) => {
      setFeedback(project.status === 'ARCHIVED' ? 'Đã lưu trữ dự án.' : 'Đã khôi phục dự án.');
      await refreshProjects();
    },
    onError: (cause) => setFeedback(errorMessage(cause)),
  });
  const removeProject = useMutation({
    mutationFn: projectsApi.remove,
    onSuccess: async () => {
      setFeedback('Đã xóa mềm dự án; dữ liệu vẫn được giữ cho audit.');
      setManagedProject(null);
      await refreshProjects();
    },
    onError: (cause) => setFeedback(errorMessage(cause)),
  });
  const setMember = useMutation({
    mutationFn: ({ userId, role }: { userId: UUID; role: ProjectRole }) =>
      projectsApi.setMember(managedProject!.id, userId, role),
    onSuccess: async () => {
      setSelectedUserId('');
      setSelectedRole('MEMBER');
      setFeedback('Đã cập nhật thành viên dự án.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-members', managedProject?.id] }),
        queryClient.invalidateQueries({ queryKey: ['members'] }),
        refreshProjects(),
      ]);
    },
    onError: (cause) => setFeedback(errorMessage(cause)),
  });
  const removeMember = useMutation({
    mutationFn: (userId: UUID) => projectsApi.removeMember(managedProject!.id, userId),
    onSuccess: async () => {
      setFeedback('Đã gỡ thành viên khỏi dự án.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-members', managedProject?.id] }),
        queryClient.invalidateQueries({ queryKey: ['members'] }),
        refreshProjects(),
      ]);
    },
    onError: (cause) => setFeedback(errorMessage(cause)),
  });

  const memberByUserId = useMemo(
    () => new Map((tenantMembers.data ?? []).map((member) => [member.user.id, member])),
    [tenantMembers.data],
  );
  const availableMembers = useMemo(() => {
    const assigned = new Set((projectMembers.data ?? []).map((member) => member.userId));
    return (tenantMembers.data ?? []).filter(
      (member) => member.status === 'ACTIVE' && !assigned.has(member.user.id),
    );
  }, [projectMembers.data, tenantMembers.data]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setEditorOpen(true);
  };
  const openEdit = (project: ProjectSummary) => {
    setEditing(project);
    setName(project.name);
    setDescription(project.description ?? '');
    setEditorOpen(true);
  };
  const submitProject = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim()) saveProject.mutate();
  };
  const confirmDelete = (project: ProjectSummary) => {
    if (window.confirm(`Xóa mềm dự án “${project.name}”? Dự án sẽ biến mất khỏi workspace.`)) {
      removeProject.mutate(project.id);
    }
  };
  const confirmRemoveMember = (member: Member | undefined, userId: UUID) => {
    const label = member?.user.displayName ?? userId;
    if (window.confirm(`Gỡ ${label} khỏi dự án?`)) removeMember.mutate(userId);
  };

  return (
    <Box className="page-container">
      <PageHeader
        eyebrow="Không gian làm việc"
        title="Dự án"
        description="Tạo, lưu trữ và quản lý quyền truy cập riêng cho từng dự án."
        actions={(
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Dự án mới
          </Button>
        )}
      />
      {feedback && (
        <Alert
          severity={feedback.startsWith('Đã') ? 'success' : 'error'}
          onClose={() => setFeedback(null)}
          sx={{ mb: 2 }}
        >
          {feedback}
        </Alert>
      )}
      <Paper className="panel" variant="outlined">
        {projects.isLoading ? (
          <SectionLoader />
        ) : projects.isError ? (
          <ErrorState message={errorMessage(projects.error)} onRetry={() => void projects.refetch()} />
        ) : !projects.data?.length ? (
          <EmptyState
            title="Chưa có dự án"
            description="Tạo dự án đầu tiên để nhận một bảng Kanban mặc định."
            action={<Button onClick={openCreate}>Tạo dự án</Button>}
          />
        ) : (
          <TableContainer>
            <Table className="data-table">
              <TableHead>
                <TableRow>
                  <TableCell>Dự án</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Vai trò</TableCell>
                  <TableCell>Thành viên</TableCell>
                  <TableCell>Công việc</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projects.data.map((project) => {
                  const canManage = project.role === 'MANAGER';
                  const active = project.status === 'ACTIVE';
                  return (
                    <TableRow key={project.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" gap={1.25}>
                          <Avatar variant="rounded">{project.name.slice(0, 1).toUpperCase()}</Avatar>
                          <Box>
                            <Typography fontWeight={700}>{project.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {project.description || 'Không có mô tả'}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell><StatusChip status={project.status} /></TableCell>
                      <TableCell>{roleLabels[project.role]}</TableCell>
                      <TableCell>{project.memberCount}</TableCell>
                      <TableCell>{project.completedTaskCount}/{project.taskCount}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" justifyContent="flex-end">
                          {active && project.boardId && (
                            <Tooltip title="Mở bảng">
                              <IconButton component={Link} to={`/kanban/${project.boardId}`} aria-label={`Mở ${project.name}`}>
                                <OpenInNew />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Thành viên dự án">
                            <IconButton onClick={() => setManagedProject(project)} aria-label={`Thành viên ${project.name}`}>
                              <GroupsOutlined />
                            </IconButton>
                          </Tooltip>
                          {canManage && active && (
                            <Tooltip title="Sửa dự án">
                              <IconButton onClick={() => openEdit(project)} aria-label={`Sửa ${project.name}`}>
                                <EditOutlined />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canManage && (
                            <Tooltip title={active ? 'Lưu trữ' : 'Khôi phục'}>
                              <IconButton
                                onClick={() => changeStatus.mutate({
                                  project,
                                  status: active ? 'ARCHIVED' : 'ACTIVE',
                                })}
                                disabled={changeStatus.isPending}
                                aria-label={`${active ? 'Lưu trữ' : 'Khôi phục'} ${project.name}`}
                              >
                                {active ? <ArchiveOutlined /> : <UnarchiveOutlined />}
                              </IconButton>
                            </Tooltip>
                          )}
                          {canManage && (
                            <Tooltip title="Xóa mềm">
                              <IconButton
                                color="error"
                                onClick={() => confirmDelete(project)}
                                disabled={removeProject.isPending}
                                aria-label={`Xóa ${project.name}`}
                              >
                                <DeleteOutline />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={submitProject}>
          <DialogTitle>{editing ? 'Sửa dự án' : 'Tạo dự án mới'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TextField
                label="Tên dự án"
                value={name}
                onChange={(event) => setName(event.target.value)}
                inputProps={{ maxLength: 160 }}
                required
                autoFocus
              />
              <TextField
                label="Mô tả"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                inputProps={{ maxLength: 5_000 }}
                multiline
                minRows={3}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditorOpen(false)}>Hủy</Button>
            <Button type="submit" variant="contained" disabled={!name.trim() || saveProject.isPending}>
              {saveProject.isPending ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(managedProject)} onClose={() => setManagedProject(null)} fullWidth maxWidth="md">
        <DialogTitle>Thành viên · {managedProject?.name}</DialogTitle>
        <DialogContent>
          {managedProject?.status === 'ARCHIVED' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Dự án đã lưu trữ nên danh sách chỉ đọc. Khôi phục dự án để thay đổi thành viên.
            </Alert>
          )}
          {managedProject?.role === 'MANAGER' && managedProject.status === 'ACTIVE' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} mt={0.5}>
              <FormControl fullWidth>
                <InputLabel id="project-user-label">Thành viên tenant</InputLabel>
                <Select
                  labelId="project-user-label"
                  label="Thành viên tenant"
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value as UUID)}
                >
                  {availableMembers.map((member) => (
                    <MenuItem value={member.user.id} key={member.user.id}>
                      {member.user.displayName} · {member.user.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel id="project-role-label">Vai trò</InputLabel>
                <Select
                  labelId="project-role-label"
                  label="Vai trò"
                  value={selectedRole}
                  onChange={(event) => setSelectedRole(event.target.value as ProjectRole)}
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <MenuItem value={value} key={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                disabled={!selectedUserId || setMember.isPending}
                onClick={() => selectedUserId && setMember.mutate({ userId: selectedUserId, role: selectedRole })}
              >
                Thêm
              </Button>
            </Stack>
          )}
          {projectMembers.isLoading || tenantMembers.isLoading ? (
            <SectionLoader />
          ) : projectMembers.isError || tenantMembers.isError ? (
            <ErrorState
              message={errorMessage(projectMembers.error ?? tenantMembers.error)}
              onRetry={() => {
                void projectMembers.refetch();
                void tenantMembers.refetch();
              }}
            />
          ) : (
            <TableContainer>
              <Table className="data-table">
                <TableHead>
                  <TableRow>
                    <TableCell>Thành viên</TableCell>
                    <TableCell>Vai trò project</TableCell>
                    {managedProject?.role === 'MANAGER' && managedProject.status === 'ACTIVE' && (
                      <TableCell align="right">Thao tác</TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(projectMembers.data ?? []).map((projectMember) => {
                    const tenantMember = memberByUserId.get(projectMember.userId);
                    return (
                      <TableRow key={projectMember.userId}>
                        <TableCell>
                          <Typography fontWeight={700}>
                            {tenantMember?.user.displayName ?? projectMember.userId}
                          </Typography>
                          {tenantMember && (
                            <Typography variant="body2" color="text.secondary">
                              {tenantMember.user.email}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {managedProject?.role === 'MANAGER' && managedProject.status === 'ACTIVE' ? (
                            <Select
                              size="small"
                              value={projectMember.role}
                              disabled={setMember.isPending}
                              onChange={(event) => setMember.mutate({
                                userId: projectMember.userId,
                                role: event.target.value as ProjectRole,
                              })}
                            >
                              {Object.entries(roleLabels).map(([value, label]) => (
                                <MenuItem value={value} key={value}>{label}</MenuItem>
                              ))}
                            </Select>
                          ) : roleLabels[projectMember.role]}
                        </TableCell>
                        {managedProject?.role === 'MANAGER' && managedProject.status === 'ACTIVE' && (
                          <TableCell align="right">
                            <Button
                              color="error"
                              disabled={removeMember.isPending}
                              onClick={() => confirmRemoveMember(tenantMember, projectMember.userId)}
                            >
                              Gỡ
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManagedProject(null)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
