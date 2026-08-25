import { Add, DeleteOutline, MailOutline, Search } from '@mui/icons-material';
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
  InputAdornment,
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
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { errorMessage } from '../api/client';
import { membersApi } from '../api/endpoints';
import type { Member, TenantRole } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorState, SectionLoader } from '../components/AsyncState';
import { PageHeader } from '../components/PageHeader';
import { StatusChip } from '../components/StatusChip';

const tenantRoleLabel: Record<TenantRole, string> = {
  OWNER: 'Chủ sở hữu',
  ADMIN: 'Quản trị viên',
  MEMBER: 'Thành viên',
};

export function MembersPage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const canManage = ['OWNER', 'ADMIN'].includes(session?.activeTenant?.role ?? 'MEMBER');
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<TenantRole, 'OWNER'>>('MEMBER');
  const [feedback, setFeedback] = useState<string | null>(null);
  const members = useQuery({ queryKey: ['members'], queryFn: membersApi.list });
  const invite = useMutation({
    mutationFn: membersApi.invite,
    onSuccess: async () => {
      setInviteOpen(false);
      setEmail('');
      setRole('MEMBER');
      setFeedback('Đã gửi lời mời thành viên.');
      await queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (cause) => setFeedback(errorMessage(cause)),
  });
  const changeRole = useMutation({
    mutationFn: ({ memberId, nextRole }: { memberId: string; nextRole: Exclude<TenantRole, 'OWNER'> }) =>
      membersApi.changeRole(memberId, nextRole),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['members'] }),
    onError: (cause) => setFeedback(errorMessage(cause)),
  });
  const revoke = useMutation({
    mutationFn: membersApi.revoke,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['members'] }),
    onError: (cause) => setFeedback(errorMessage(cause)),
  });

  const visibleMembers = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('vi');
    if (!normalized) return members.data ?? [];
    return (members.data ?? []).filter(
      (member) =>
        member.user.displayName.toLocaleLowerCase('vi').includes(normalized) ||
        member.user.email.toLocaleLowerCase('vi').includes(normalized),
    );
  }, [members.data, search]);

  const submitInvite = (event: FormEvent) => {
    event.preventDefault();
    if (email.trim()) invite.mutate({ email: email.trim(), role });
  };

  const removeMember = (member: Member) => {
    if (window.confirm(`Thu hồi quyền truy cập của ${member.user.displayName}?`)) {
      revoke.mutate(member.id);
    }
  };

  return (
    <Box className="page-container">
      <PageHeader
        eyebrow="Đội ngũ"
        title="Thành viên"
        description="Quản lý quyền trong tenant và vai trò trên từng dự án."
        actions={
          canManage ? (
            <Button variant="contained" startIcon={<Add />} onClick={() => setInviteOpen(true)}>
              Mời thành viên
            </Button>
          ) : undefined
        }
      />
      {feedback && (
        <Alert severity={feedback.startsWith('Đã') ? 'success' : 'error'} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>
          {feedback}
        </Alert>
      )}
      <Paper className="panel" variant="outlined">
        <TextField
          placeholder="Tìm theo tên hoặc email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ width: { xs: '100%', sm: 340 }, mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        {members.isLoading ? (
          <SectionLoader />
        ) : members.isError ? (
          <ErrorState message={errorMessage(members.error)} onRetry={() => void members.refetch()} />
        ) : visibleMembers.length === 0 ? (
          <EmptyState
            title={search ? 'Không tìm thấy thành viên' : 'Chưa có thành viên'}
            description={search ? 'Thử từ khóa khác.' : 'Mời đồng đội để bắt đầu cộng tác.'}
          />
        ) : (
          <TableContainer>
            <Table className="data-table">
              <TableHead>
                <TableRow>
                  <TableCell>Thành viên</TableCell>
                  <TableCell>Vai trò tenant</TableCell>
                  <TableCell>Dự án</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  {canManage && <TableCell align="right">Thao tác</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleMembers.map((member) => (
                  <TableRow key={member.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1.25}>
                        <Avatar src={member.user.avatarUrl}>
                          {member.user.displayName.slice(0, 1)}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={700}>{member.user.displayName}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {member.user.email}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {canManage && member.role !== 'OWNER' ? (
                        <Select
                          size="small"
                          value={member.role}
                          onChange={(event) =>
                            changeRole.mutate({
                              memberId: member.id,
                              nextRole: event.target.value as Exclude<TenantRole, 'OWNER'>,
                            })
                          }
                          disabled={changeRole.isPending}
                        >
                          <MenuItem value="ADMIN">Quản trị viên</MenuItem>
                          <MenuItem value="MEMBER">Thành viên</MenuItem>
                        </Select>
                      ) : (
                        tenantRoleLabel[member.role]
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack gap={0.25}>
                        {member.projectRoles.slice(0, 2).map((project) => (
                          <Typography variant="body2" key={project.projectId}>
                            {project.projectName} · {project.role}
                          </Typography>
                        ))}
                        {member.projectRoles.length > 2 && (
                          <Typography variant="caption" color="text.secondary">
                            +{member.projectRoles.length - 2} dự án
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {member.status === 'ACTIVE' ? (
                        <StatusChip status="ACTIVE" />
                      ) : member.status === 'INVITED' ? (
                        <StatusChip status="INVITED" />
                      ) : (
                        <StatusChip status="SUSPENDED" />
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell align="right">
                        <Button
                          color="error"
                          size="small"
                          startIcon={<DeleteOutline />}
                          disabled={member.role === 'OWNER' || revoke.isPending}
                          onClick={() => removeMember(member)}
                        >
                          Thu hồi
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={submitInvite}>
          <DialogTitle>Mời thành viên</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutline fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small">
                <InputLabel id="invite-role-label">Vai trò tenant</InputLabel>
                <Select
                  labelId="invite-role-label"
                  label="Vai trò tenant"
                  value={role}
                  onChange={(event) => setRole(event.target.value as Exclude<TenantRole, 'OWNER'>)}
                >
                  <MenuItem value="MEMBER">Thành viên</MenuItem>
                  <MenuItem value="ADMIN">Quản trị viên</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInviteOpen(false)}>Hủy</Button>
            <Button type="submit" variant="contained" disabled={!email.trim() || invite.isPending}>
              {invite.isPending ? 'Đang gửi…' : 'Gửi lời mời'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
