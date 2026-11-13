import Add from '@mui/icons-material/Add';
import ArrowForward from '@mui/icons-material/ArrowForward';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import FolderOpenOutlined from '@mui/icons-material/FolderOpenOutlined';
import PeopleOutline from '@mui/icons-material/PeopleOutline';
import TrendingDown from '@mui/icons-material/TrendingDown';
import TrendingUp from '@mui/icons-material/TrendingUp';
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
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, projectsApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { EmptyState, ErrorState, SectionLoader } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';
import { applyProjectTemplate, projectTemplates, type ProjectTemplateId } from '../components/ProjectTemplates';

const metricIcons = [<FolderOpenOutlined />, <CheckCircleOutline />, <PeopleOutline />];

function relativeTime(value: string): string {
  const date = new Date(value);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
  if (Math.abs(seconds) < 3600) return formatter.format(Math.round(seconds / 60), 'minute');
  if (Math.abs(seconds) < 86_400) return formatter.format(Math.round(seconds / 3600), 'hour');
  return formatter.format(Math.round(seconds / 86_400), 'day');
}

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState<ProjectTemplateId>('STANDARD');
  const [formError, setFormError] = useState<string | null>(null);
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get });
  const createProject = useMutation({
    mutationFn: async (payload: { name: string; description?: string }) => {
      const created = await projectsApi.create(payload);
      if (created.boardId && template !== 'STANDARD') {
        await applyProjectTemplate(created.boardId, template);
      }
      return created;
    },
    onSuccess: async () => {
      setDialogOpen(false);
      setName('');
      setDescription('');
      setTemplate('STANDARD');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
      ]);
    },
    onError: (cause) => setFormError(errorMessage(cause)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setFormError(null);
    createProject.mutate({ name: name.trim(), description: description.trim() || undefined });
  };

  return (
    <Box className="page-container">
      <PageHeader
        eyebrow="Tổng quan"
        title="Nhịp làm việc hôm nay"
        description="Theo dõi tiến độ, dự án gần đây và hoạt động của đội ngũ."
        actions={
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
            Dự án mới
          </Button>
        }
      />
      {dashboard.isLoading ? (
        <SectionLoader />
      ) : dashboard.isError ? (
        <ErrorState message={errorMessage(dashboard.error)} onRetry={() => void dashboard.refetch()} />
      ) : dashboard.data ? (
        <>
          <Box className="metric-grid">
            {dashboard.data.metrics.map((metric, index) => (
              <Paper className="metric-card" variant="outlined" key={metric.label}>
                <Box className={`metric-card__icon metric-card__icon--${metric.tone ?? 'primary'}`}>
                  {metricIcons[index % metricIcons.length]}
                </Box>
                <Box>
                  <Typography variant="h4">{metric.value.toLocaleString('vi-VN')}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {metric.label}
                  </Typography>
                </Box>
                {metric.delta !== undefined && (
                  <Box className={metric.delta >= 0 ? 'delta delta--up' : 'delta delta--down'}>
                    {metric.delta >= 0 ? <TrendingUp /> : <TrendingDown />}
                    {Math.abs(metric.delta)}%
                  </Box>
                )}
              </Paper>
            ))}
          </Box>
          <Box className="dashboard-grid">
            <Paper variant="outlined" className="panel">
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h6">Dự án gần đây</Typography>
                  <Typography color="text.secondary" variant="body2">
                    Tiến độ cập nhật từ bảng công việc
                  </Typography>
                </Box>
              </Stack>
              {dashboard.data.recentProjects.length === 0 ? (
                <EmptyState
                  title="Chưa có dự án"
                  description="Tạo dự án đầu tiên để tổ chức công việc của đội ngũ."
                  action={<Button onClick={() => setDialogOpen(true)}>Tạo dự án</Button>}
                />
              ) : (
                <Stack spacing={1}>
                  {dashboard.data.recentProjects.map((project) => {
                    const progress = project.taskCount
                      ? Math.round((project.completedTaskCount / project.taskCount) * 100)
                      : 0;
                    return (
                      <Box className="project-row" key={project.id}>
                        <Avatar variant="rounded" className="project-row__avatar">
                          {project.name.slice(0, 1).toUpperCase()}
                        </Avatar>
                        <Box minWidth={0} flex={1}>
                          <Stack direction="row" justifyContent="space-between" gap={1}>
                            <Typography fontWeight={700} noWrap>
                              {project.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {progress}%
                            </Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={progress} sx={{ my: 0.8 }} />
                          <Typography variant="caption" color="text.secondary">
                            {project.completedTaskCount}/{project.taskCount} công việc ·{' '}
                            {project.memberCount} thành viên
                          </Typography>
                        </Box>
                        <Button
                          component={Link}
                          to={`/projects/${project.id}`}
                          size="small"
                          endIcon={<ArrowForward />}
                        >
                          Xem dự án
                        </Button>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Paper>
            <Paper variant="outlined" className="panel">
              <Typography variant="h6">Hoạt động mới nhất</Typography>
              <Typography color="text.secondary" variant="body2" mb={2}>
                Nhật ký thay đổi trong tenant
              </Typography>
              {dashboard.data.activity.length === 0 ? (
                <EmptyState title="Chưa có hoạt động" description="Các thay đổi mới sẽ xuất hiện tại đây." />
              ) : (
                <Stack className="activity-list">
                  {dashboard.data.activity.map((entry) => (
                    <Box className="activity-item" key={entry.id}>
                      <span className="activity-item__dot" />
                      <Box>
                        <Typography variant="body2">
                          <strong>{entry.actorName}</strong> {entry.action}{' '}
                          {entry.targetLabel && <strong>{entry.targetLabel}</strong>}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {relativeTime(entry.occurredAt)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          </Box>
        </>
      ) : null}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={submit}>
          <DialogTitle>Tạo dự án mới</DialogTitle>
          <DialogContent>
            {formError && <ErrorState message={formError} />}
            <Stack spacing={2} mt={1}>
              <TextField
                label="Tên dự án"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoFocus
                inputProps={{ maxLength: 120 }}
              />
              <FormControl fullWidth size="small">
                <InputLabel id="dashboard-project-template-label">Mẫu dự án (Template)</InputLabel>
                <Select
                  labelId="dashboard-project-template-label"
                  label="Mẫu dự án (Template)"
                  value={template}
                  onChange={(event) => setTemplate(event.target.value as ProjectTemplateId)}
                >
                  {projectTemplates.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      <Box sx={{ py: 0.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography fontWeight={600} variant="body2">{t.name}</Typography>
                          {t.badge && (
                            <Typography variant="caption" sx={{ px: 0.8, py: 0.2, bgcolor: 'action.hover', borderRadius: 1, fontSize: 11 }}>
                              {t.badge}
                            </Typography>
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {template !== 'STANDARD' && (
                <Alert severity="info" sx={{ py: 0.5, fontSize: 13 }}>
                  <Typography variant="caption" fontWeight={600} display="block">
                    Cột Kanban theo mô hình:
                  </Typography>
                  <Typography variant="caption">
                    {projectTemplates.find((t) => t.id === template)?.stages.join(' → ')}
                  </Typography>
                </Alert>
              )}
              <TextField
                label="Mô tả"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                multiline
                minRows={3}
                inputProps={{ maxLength: 1_000 }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button type="submit" variant="contained" disabled={!name.trim() || createProject.isPending}>
              {createProject.isPending ? 'Đang tạo…' : 'Tạo dự án'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
