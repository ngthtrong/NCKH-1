import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowForward from '@mui/icons-material/ArrowForward';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import SpaceDashboardOutlined from '@mui/icons-material/SpaceDashboardOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import ViewKanbanOutlined from '@mui/icons-material/ViewKanbanOutlined';
import {
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  LinearProgress,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { boardsApi, projectsApi } from '../api/endpoints';
import type { ProjectRole, UUID } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorState, SectionLoader } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';
import { StatusChip } from '../components/StatusChip';

const roleLabels: Record<ProjectRole, string> = {
  MANAGER: 'Quản lý',
  MEMBER: 'Thành viên',
  VIEWER: 'Chỉ xem',
};

export function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: UUID }>();
  const { session } = useAuth();
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
    return (
      <Box className="page-container">
        <ErrorState message={errorMessage(projects.error)} onRetry={() => void projects.refetch()} />
      </Box>
    );
  }
  if (!project) {
    return (
      <Box className="page-container">
        <EmptyState
          title="Không tìm thấy dự án"
          description="Dự án không tồn tại hoặc bạn không còn quyền truy cập."
          action={<Button component={RouterLink} to="/projects">Quay lại danh sách</Button>}
        />
      </Box>
    );
  }

  const progress = project.taskCount
    ? Math.round((project.completedTaskCount / project.taskCount) * 100)
    : 0;
  const firstBoardId = boards.data?.[0]?.id ?? project.boardId;
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
        eyebrow="Không gian dự án"
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

      <Paper variant="outlined" className="project-hero">
        <Avatar variant="rounded" className="project-hero__avatar">
          {project.name.slice(0, 1).toUpperCase()}
        </Avatar>
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

      <Box className="project-metric-grid">
        <Paper variant="outlined"><SpaceDashboardOutlined /><Box><Typography variant="h5">{boards.data?.length ?? '—'}</Typography><Typography color="text.secondary">Bảng Kanban</Typography></Box></Paper>
        <Paper variant="outlined"><GroupsOutlined /><Box><Typography variant="h5">{project.memberCount}</Typography><Typography color="text.secondary">Thành viên</Typography></Box></Paper>
        <Paper variant="outlined"><CheckCircleOutline /><Box><Typography variant="h5">{project.taskCount}</Typography><Typography color="text.secondary">Công việc</Typography></Box></Paper>
      </Box>

      <Box className="project-workspace-grid">
        <Paper variant="outlined" className="panel">
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h6">Bảng trong dự án</Typography>
              <Typography variant="body2" color="text.secondary">
                Dự án → bảng → cột → công việc → công việc con
              </Typography>
            </Box>
          </Stack>
          {boards.isLoading ? (
            <SectionLoader />
          ) : boards.isError ? (
            <ErrorState message={errorMessage(boards.error)} onRetry={() => void boards.refetch()} />
          ) : !boards.data?.length ? (
            <EmptyState title="Chưa có bảng" description="Tạo bảng từ màn Kanban để bắt đầu tổ chức công việc." />
          ) : (
            <Stack spacing={1}>
              {boards.data.map((board, index) => (
                <Button
                  key={board.id}
                  component={RouterLink}
                  to={`/kanban/${board.id}`}
                  className="project-board-link"
                  endIcon={<ArrowForward />}
                >
                  <Box className="project-board-link__index">{index + 1}</Box>
                  <Box flex={1} textAlign="left">
                    <Typography fontWeight={750}>{board.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Mở các cột và công việc của bảng
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Stack>
          )}
        </Paper>

        <Stack spacing={2}>
          <Paper variant="outlined" className="panel">
            <Typography variant="h6" mb={1.5}>Thành viên dự án</Typography>
            {members.isLoading ? <SectionLoader /> : members.isError ? (
              <ErrorState message={errorMessage(members.error)} onRetry={() => void members.refetch()} />
            ) : (
              <Stack spacing={1}>
                {(Object.keys(roleLabels) as ProjectRole[]).map((role) => (
                  <Stack key={role} direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">{roleLabels[role]}</Typography>
                    <Typography fontWeight={750}>{roleCounts[role]}</Typography>
                  </Stack>
                ))}
                <Button component={RouterLink} to={`/projects?manage=${project.id}`} startIcon={<GroupsOutlined />} sx={{ mt: 1 }}>
                  Quản lý thành viên
                </Button>
              </Stack>
            )}
          </Paper>
          <Paper variant="outlined" className="panel">
            <Typography variant="h6" mb={1}>Công cụ dự án</Typography>
            <Stack>
              <Button component={RouterLink} to="/resources" startIcon={<FolderOutlined />} sx={{ justifyContent: 'flex-start' }}>
                Kho tài nguyên workspace
              </Button>
              <Button component={RouterLink} to={`/customization?project=${project.id}`} startIcon={<TuneOutlined />} sx={{ justifyContent: 'flex-start' }}>
                Dữ liệu, phê duyệt và tự động hóa
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}
