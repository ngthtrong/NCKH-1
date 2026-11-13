import AccessTimeOutlined from '@mui/icons-material/AccessTimeOutlined';
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
  AvatarGroup,
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

interface MetricThemeConfig {
  strip: string;
  gradient: string;
  iconShadow: string;
  icon: React.ReactNode;
}

const metricConfigs: Record<string, MetricThemeConfig> = {
  primary: {
    strip: '#246bfd',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    iconShadow: '0 4px 12px rgba(36, 107, 253, 0.25)',
    icon: <FolderOpenOutlined sx={{ fontSize: 24, color: '#ffffff' }} />,
  },
  success: {
    strip: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    iconShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
    icon: <CheckCircleOutline sx={{ fontSize: 24, color: '#ffffff' }} />,
  },
  warning: {
    strip: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    iconShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
    icon: <AccessTimeOutlined sx={{ fontSize: 24, color: '#ffffff' }} />,
  },
};

const defaultTones = ['primary', 'success', 'warning'];

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
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 650,
              boxShadow: '0 2px 8px rgba(36, 107, 253, 0.25)',
            }}
          >
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
          {/* Metric Cards Grid */}
          <Box className="metric-grid" sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2.5, mb: 3 }}>
            {dashboard.data.metrics.map((metric, index) => {
              const toneKey = metric.tone ?? defaultTones[index % defaultTones.length] ?? 'primary';
              const config = metricConfigs[toneKey] ?? metricConfigs.primary;
              return (
                <Paper
                  className="metric-card"
                  variant="outlined"
                  key={metric.label}
                  sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2.25,
                    minHeight: 110,
                    p: 2.5,
                    borderRadius: '14px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03)',
                    transition: 'all 200ms ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)',
                      borderColor: '#cbd5e1',
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      backgroundColor: config.strip,
                    },
                  }}
                >
                  <Box
                    className={`metric-card__icon metric-card__icon--${toneKey}`}
                    sx={{
                      display: 'grid',
                      width: 48,
                      height: 48,
                      flex: '0 0 auto',
                      placeItems: 'center',
                      borderRadius: '12px',
                      background: config.gradient,
                      boxShadow: config.iconShadow,
                    }}
                  >
                    {config.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="h4"
                      sx={{
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        lineHeight: 1.2,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {metric.value.toLocaleString('vi-VN')}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: 13.5, fontWeight: 500, color: '#64748b', mt: 0.3 }}
                    >
                      {metric.label}
                    </Typography>
                  </Box>
                  {metric.delta !== undefined && (
                    <Box
                      className={metric.delta >= 0 ? 'delta delta--up' : 'delta delta--down'}
                      sx={{
                        position: 'absolute',
                        top: 14,
                        right: 14,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1,
                        py: 0.3,
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        backgroundColor: metric.delta >= 0 ? '#dcfce7' : '#fee2e2',
                        color: metric.delta >= 0 ? '#15803d' : '#b91c1c',
                      }}
                    >
                      {metric.delta >= 0 ? (
                        <TrendingUp sx={{ fontSize: 14 }} />
                      ) : (
                        <TrendingDown sx={{ fontSize: 14 }} />
                      )}
                      {Math.abs(metric.delta)}%
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Box>

          {/* Main Dashboard Grid */}
          <Box className="dashboard-grid" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' }, gap: 2.5 }}>
            {/* Recent Projects Panel */}
            <Paper
              variant="outlined"
              className="panel"
              sx={{
                p: 3,
                borderRadius: '14px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
                <Box>
                  <Typography variant="h6" fontWeight={700} color="#0f172a" sx={{ fontSize: '1.1rem' }}>
                    Dự án gần đây
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ fontSize: 13, mt: 0.2 }}>
                    Tiến độ cập nhật từ bảng công việc
                  </Typography>
                </Box>
                <Button
                  component={Link}
                  to="/projects"
                  size="small"
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#246bfd',
                    textTransform: 'none',
                    '&:hover': { backgroundColor: '#eff6ff' },
                  }}
                >
                  Tất cả dự án →
                </Button>
              </Stack>
              {dashboard.data.recentProjects.length === 0 ? (
                <EmptyState
                  title="Chưa có dự án"
                  description="Tạo dự án đầu tiên để tổ chức công việc của đội ngũ."
                  action={<Button onClick={() => setDialogOpen(true)}>Tạo dự án</Button>}
                />
              ) : (
                <Stack spacing={1.5}>
                  {dashboard.data.recentProjects.map((project) => {
                    const progress = project.taskCount
                      ? Math.round((project.completedTaskCount / project.taskCount) * 100)
                      : 0;
                    return (
                      <Box
                        className="project-row"
                        key={project.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          p: 2,
                          borderRadius: '10px',
                          border: '1px solid #f1f5f9',
                          backgroundColor: '#fafbfc',
                          transition: 'all 150ms ease',
                          '&:hover': {
                            backgroundColor: '#ffffff',
                            borderColor: '#cbd5e1',
                            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                          },
                        }}
                      >
                        <Avatar
                          variant="rounded"
                          className="project-row__avatar"
                          sx={{
                            width: 42,
                            height: 42,
                            borderRadius: '10px',
                            bgcolor: '#eef2ff',
                            color: '#246bfd',
                            fontWeight: 700,
                            fontSize: 16,
                            border: '1px solid #dbeafe',
                          }}
                        >
                          {project.name.slice(0, 1).toUpperCase()}
                        </Avatar>
                        <Box minWidth={0} flex={1}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                            <Typography
                              fontWeight={650}
                              noWrap
                              sx={{ fontSize: 14, color: '#0f172a' }}
                            >
                              {project.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              sx={{
                                color: progress === 100 ? '#10b981' : '#246bfd',
                                fontSize: 12,
                              }}
                            >
                              {progress}%
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{
                              my: 1,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: '#e2e8f0',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                backgroundColor: progress === 100 ? '#10b981' : '#246bfd',
                              },
                            }}
                          />
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                              {project.completedTaskCount}/{project.taskCount} công việc ·{' '}
                              {project.memberCount} thành viên
                            </Typography>
                            {/* Avatar group for members */}
                            <AvatarGroup
                              max={3}
                              total={project.memberCount}
                              sx={{
                                '& .MuiAvatar-root': {
                                  width: 22,
                                  height: 22,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  border: '2px solid #ffffff',
                                  bgcolor: '#94a3b8',
                                  color: '#ffffff',
                                },
                              }}
                            >
                              <Avatar sx={{ bgcolor: '#3b82f6' }}>{project.name.slice(0, 1).toUpperCase()}</Avatar>
                              {project.memberCount > 1 && <Avatar sx={{ bgcolor: '#10b981' }}>M</Avatar>}
                              {project.memberCount > 2 && <Avatar sx={{ bgcolor: '#8b5cf6' }}>T</Avatar>}
                            </AvatarGroup>
                          </Stack>
                        </Box>
                        <Button
                          component={Link}
                          to={`/projects/${project.id}`}
                          size="small"
                          variant="outlined"
                          endIcon={<ArrowForward fontSize="small" />}
                          sx={{
                            borderRadius: '8px',
                            borderColor: '#e2e8f0',
                            color: '#475569',
                            fontSize: 12.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 1.5,
                            py: 0.6,
                            flexShrink: 0,
                            '&:hover': {
                              borderColor: '#246bfd',
                              color: '#246bfd',
                              backgroundColor: '#eff6ff',
                            },
                          }}
                        >
                          Xem dự án
                        </Button>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Paper>

            {/* Activity Feed Panel */}
            <Paper
              variant="outlined"
              className="panel"
              sx={{
                p: 3,
                borderRadius: '14px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              }}
            >
              <Typography variant="h6" fontWeight={700} color="#0f172a" sx={{ fontSize: '1.1rem' }}>
                Hoạt động mới nhất
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ fontSize: 13, mt: 0.2, mb: 2.5 }}>
                Nhật ký thay đổi trong workspace
              </Typography>
              {dashboard.data.activity.length === 0 ? (
                <EmptyState title="Chưa có hoạt động" description="Các thay đổi mới sẽ xuất hiện tại đây." />
              ) : (
                <Box
                  className="activity-list"
                  sx={{
                    position: 'relative',
                    pl: 2.5,
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 10,
                      bottom: 10,
                      left: 6,
                      width: '2px',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '1px',
                    },
                  }}
                >
                  <Stack spacing={2}>
                    {dashboard.data.activity.map((entry) => {
                      const isCreate =
                        entry.action.toLowerCase().includes('tạo') ||
                        entry.action.toLowerCase().includes('create') ||
                        entry.action.toLowerCase().includes('thêm');
                      const isComplete =
                        entry.action.toLowerCase().includes('hoàn thành') ||
                        entry.action.toLowerCase().includes('complete');
                      const dotColor = isComplete ? '#10b981' : isCreate ? '#246bfd' : '#64748b';
                      const ringColor = isComplete ? '#d1fae5' : isCreate ? '#dbeafe' : '#f1f5f9';

                      return (
                        <Box
                          className="activity-item"
                          key={entry.id}
                          sx={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1.5,
                          }}
                        >
                          <Box
                            className="activity-item__dot"
                            sx={{
                              position: 'absolute',
                              left: -20,
                              top: 4,
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              backgroundColor: dotColor,
                              border: '2px solid #ffffff',
                              boxShadow: `0 0 0 2px ${ringColor}`,
                              zIndex: 2,
                            }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: 13,
                                color: '#334155',
                                lineHeight: 1.45,
                              }}
                            >
                              <strong style={{ color: '#0f172a', fontWeight: 650 }}>
                                {entry.actorName}
                              </strong>{' '}
                              {entry.action}{' '}
                              {entry.targetLabel && (
                                <strong style={{ color: '#246bfd', fontWeight: 600 }}>
                                  {entry.targetLabel}
                                </strong>
                              )}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: 'block',
                                fontSize: 11.5,
                                color: '#94a3b8',
                                mt: 0.3,
                              }}
                            >
                              {relativeTime(entry.occurredAt)}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </Paper>
          </Box>
        </>
      ) : null}

      {/* New Project Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={submit}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: '1.2rem' }}>Tạo dự án mới</DialogTitle>
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
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setDialogOpen(false)} sx={{ fontWeight: 600 }}>Hủy</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!name.trim() || createProject.isPending}
              sx={{ fontWeight: 600 }}
            >
              {createProject.isPending ? 'Đang tạo…' : 'Tạo dự án'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
