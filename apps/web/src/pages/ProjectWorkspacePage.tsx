import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowForward from '@mui/icons-material/ArrowForward';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import ViewKanbanOutlined from '@mui/icons-material/ViewKanbanOutlined';
import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  Chip,
  Grid,
  LinearProgress,
  Link,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { ApiError, errorMessage } from '../api/client';
import { boardsApi, projectsApi } from '../api/endpoints';
import type { ProjectRole, UUID } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorState, SectionLoader } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';
import { StatusChip } from '../components/StatusChip';
import { WorkspaceBoundaryNotice } from '../components/WorkspaceBoundaryNotice';

const roleLabels: Record<ProjectRole, string> = {
  MANAGER: 'Quản lý',
  MEMBER: 'Thành viên',
  VIEWER: 'Chỉ xem',
};

export function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: UUID }>();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const projects = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });
  const boards = useQuery({
    queryKey: ['project-boards', projectId],
    queryFn: () => boardsApi.list(projectId as UUID),
    enabled: Boolean(projectId),
  });
  const members = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectsApi.members(projectId as UUID),
    enabled: Boolean(projectId),
  });
  const project = projects.data?.find((item) => item.id === projectId);

  if (projects.isLoading) return <Box className="page-container"><SectionLoader /></Box>;
  if (projects.isError) {
    const err = projects.error as ApiError;
    if (err?.status === 403 || err?.status === 404) {
      return (
        <Box className="page-container">
          <WorkspaceBoundaryNotice resourceType="dự án" />
        </Box>
      );
    }
    return (
      <Box className="page-container">
        <ErrorState message={errorMessage(projects.error)} onRetry={() => void projects.refetch()} />
      </Box>
    );
  }
  if (!project) {
    return (
      <Box className="page-container">
        <WorkspaceBoundaryNotice resourceType="dự án" />
      </Box>
    );
  }

  const progress = project.taskCount
    ? Math.round((project.completedTaskCount / project.taskCount) * 100)
    : 0;
  const firstBoardId = boards.data?.[0]?.id ?? project.boardId;
  const canManageWorkspace = Boolean(
    session?.activeTenant?.role && ['OWNER', 'ADMIN'].includes(session.activeTenant.role),
  );
  const roleCounts = (members.data ?? []).reduce<Record<ProjectRole, number>>(
    (counts, member) => ({ ...counts, [member.role]: counts[member.role] + 1 }),
    { MANAGER: 0, MEMBER: 0, VIEWER: 0 },
  );

  return (
    <Box className="page-container">
      <PageHeader
        breadcrumbs={(
          <Breadcrumbs aria-label="Điều hướng dự án">
            <Link component={RouterLink} to="/dashboard" underline="hover" color="inherit">
              {session?.activeTenant?.name ?? 'Workspace'}
            </Link>
            <Link component={RouterLink} to="/projects" underline="hover" color="inherit">
              Dự án
            </Link>
            <Typography color="text.primary">{project.name}</Typography>
          </Breadcrumbs>
        )}
        title={project.name}
        description={project.description || 'Chưa có mô tả cho dự án này.'}
        actions={(
          <Stack direction="row" spacing={1}>
            <Button component={RouterLink} to="/projects" startIcon={<ArrowBack />}>
              Danh sách
            </Button>
            {firstBoardId && (
              <Button
                component={RouterLink}
                to={`/kanban/${firstBoardId}`}
                variant="contained"
                startIcon={<ViewKanbanOutlined />}
              >
                Mở Kanban
              </Button>
            )}
          </Stack>
        )}
      />

      <Paper variant="outlined" className="project-hero" sx={{ mb: 3 }}>
        <Box flex={1} minWidth={0}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h6">Tổng quan tiến độ</Typography>
            <StatusChip status={project.status} />
            <Chip size="small" label={roleLabels[project.role]} variant="outlined" />
          </Stack>
          <Stack direction="row" justifyContent="space-between" mt={1.5} mb={0.75}>
            <Typography variant="body2" color="text.secondary">
              {project.completedTaskCount}/{project.taskCount} công việc hoàn thành
            </Typography>
            <Typography variant="body2" fontWeight={750}>{progress}%</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      </Paper>

      {/* Internal Project Tabs */}
      <Box sx={{ borderBottom: '1px solid #e2e8f0', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 650,
              fontSize: '0.9rem',
              minHeight: 46,
            },
          }}
        >
          <Tab
            icon={<ViewKanbanOutlined />}
            iconPosition="start"
            label={`Bảng Kanban (${boards.data?.length ?? 0})`}
          />
          <Tab
            icon={<GroupsOutlined />}
            iconPosition="start"
            label={`Thành viên dự án (${members.data?.length ?? 0})`}
          />
          <Tab
            icon={<FolderOutlined />}
            iconPosition="start"
            label="Tài nguyên & Công cụ"
          />
        </Tabs>
      </Box>

      {/* Tab 0: Bảng Kanban */}
      {activeTab === 0 && (
        <Paper variant="outlined" className="panel" sx={{ p: 3, borderRadius: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
            <Box>
              <Typography variant="h6" fontWeight={750}>Bảng công việc trong dự án</Typography>
              <Typography variant="body2" color="text.secondary">
                {boards.data?.length ?? 0} bảng · {project.taskCount} công việc · {project.memberCount} thành viên
              </Typography>
            </Box>
            {firstBoardId && (
              <Button
                component={RouterLink}
                to={`/kanban/${firstBoardId}`}
                variant="contained"
                size="small"
                startIcon={<ViewKanbanOutlined />}
                sx={{ fontWeight: 600, borderRadius: '8px' }}
              >
                Mở bảng chính
              </Button>
            )}
          </Stack>
          {boards.isLoading ? (
            <SectionLoader />
          ) : boards.isError ? (
            <ErrorState message={errorMessage(boards.error)} onRetry={() => void boards.refetch()} />
          ) : !boards.data?.length ? (
            <EmptyState title="Chưa có bảng" description="Tạo bảng từ màn Kanban để bắt đầu tổ chức công việc." />
          ) : (
            <Stack spacing={1.5}>
              {boards.data.map((board, index) => (
                <Button
                  key={board.id}
                  component={RouterLink}
                  to={`/kanban/${board.id}`}
                  className="project-board-link"
                  endIcon={<ArrowForward />}
                  sx={{
                    p: 2,
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    justifyContent: 'space-between',
                    '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
                  }}
                >
                  <Box className="project-board-link__index">{index + 1}</Box>
                  <Box flex={1} textAlign="left" ml={1}>
                    <Typography fontWeight={750} color="#0f172a">{board.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Nhấp để mở bảng Kanban và quản lý các cột công việc
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Stack>
          )}
        </Paper>
      )}

      {/* Tab 1: Thành viên dự án */}
      {activeTab === 1 && (
        <Paper variant="outlined" className="panel" sx={{ p: 3, borderRadius: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
            <Box>
              <Typography variant="h6" fontWeight={750}>Thành viên dự án</Typography>
              <Typography variant="body2" color="text.secondary">
                Tổng cộng {members.data?.length ?? 0} thành viên tham gia dự án {project.name}.
              </Typography>
            </Box>
            <Button
              component={RouterLink}
              to={`/projects?manage=${project.id}`}
              variant="outlined"
              size="small"
              startIcon={<GroupsOutlined />}
              sx={{ fontWeight: 600, borderRadius: '8px' }}
            >
              Quản lý phân quyền thành viên
            </Button>
          </Stack>
          {members.isLoading ? (
            <SectionLoader />
          ) : members.isError ? (
            <ErrorState message={errorMessage(members.error)} onRetry={() => void members.refetch()} />
          ) : (
            <Grid container spacing={2}>
              {(Object.keys(roleLabels) as ProjectRole[]).map((role) => (
                <Grid size={{ xs: 12, sm: 4 }} key={role}>
                  <Card variant="outlined" sx={{ borderRadius: 2.5, p: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                      {roleLabels[role]}
                    </Typography>
                    <Typography variant="h4" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                      {roleCounts[role]}
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}

      {/* Tab 2: Tài nguyên & Công cụ */}
      {activeTab === 2 && (
        <Paper variant="outlined" className="panel" sx={{ p: 3, borderRadius: 3 }}>
          <Box mb={2.5}>
            <Typography variant="h6" fontWeight={750}>Tài nguyên & Công cụ dự án</Typography>
            <Typography variant="body2" color="text.secondary">
              Quản lý tệp đính kèm và các quy tắc làm việc áp dụng cho dự án.
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Card variant="outlined" sx={{ borderRadius: 2.5, p: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                  <FolderOutlined color="primary" sx={{ fontSize: 28 }} />
                  <Typography variant="subtitle1" fontWeight={700}>Kho tài nguyên tổ chức</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Lưu trữ, tải lên và quản lý tệp đính kèm, tài liệu phục vụ cho công việc dự án.
                </Typography>
                <Button component={RouterLink} to="/resources" variant="outlined" size="small" endIcon={<ArrowForward />}>
                  Mở kho tài nguyên
                </Button>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Card variant="outlined" sx={{ borderRadius: 2.5, p: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                  <ViewKanbanOutlined color="primary" sx={{ fontSize: 28 }} />
                  <Typography variant="subtitle1" fontWeight={700}>Quy tắc & Dữ liệu Kanban</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Dự án áp dụng đồng bộ quy tắc giới hạn WIP và hệ thống trường dữ liệu mở rộng được cấu hình từ không gian làm việc.
                </Typography>
                {canManageWorkspace ? (
                  <Button
                    component={RouterLink}
                    to="/settings"
                    variant="outlined"
                    size="small"
                    startIcon={<TuneOutlined />}
                    endIcon={<ArrowForward />}
                  >
                    Cài đặt workspace
                  </Button>
                ) : firstBoardId ? (
                  <Button
                    component={RouterLink}
                    to={`/kanban/${firstBoardId}`}
                    variant="outlined"
                    size="small"
                    startIcon={<ViewKanbanOutlined />}
                    endIcon={<ArrowForward />}
                  >
                    Xem bảng công việc
                  </Button>
                ) : (
                  <Button
                    component={RouterLink}
                    to="/kanban"
                    variant="outlined"
                    size="small"
                    startIcon={<ViewKanbanOutlined />}
                    endIcon={<ArrowForward />}
                  >
                    Bảng công việc
                  </Button>
                )}
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
}
