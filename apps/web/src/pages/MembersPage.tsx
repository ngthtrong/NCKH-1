import {
  Add,
  ContentCopy,
  DeleteOutline,
  MailOutline,
  Search,
  SwapHoriz,
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
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { errorMessage } from '../api/client';
import { membersApi } from '../api/endpoints';
import type { InvitationCreatedView, Member, TenantRole } from '../api/types';
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
  const isOwner = session?.activeTenant?.role === 'OWNER';
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'members' | 'invitations'>('members');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<TenantRole, 'OWNER'>>('MEMBER');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [createdInvitation, setCreatedInvitation] = useState<InvitationCreatedView | null>(null);
  const members = useQuery({ queryKey: ['members'], queryFn: membersApi.list });
  const invitations = useQuery({
    queryKey: ['member-invitations'],
    queryFn: membersApi.invitations,
    enabled: canManage,
  });
  const invite = useMutation({
    mutationFn: membersApi.invite,
    onSuccess: async (created) => {
      setInviteOpen(false);
      setEmail('');
      setRole('MEMBER');
      setCreatedInvitation(created);
      setFeedback('Đã tạo lời mời. Hãy gửi liên kết local bên dưới cho đúng người nhận.');
      setTab('invitations');
      await queryClient.invalidateQueries({ queryKey: ['member-invitations'] });
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
  const revokeInvitation = useMutation({
    mutationFn: membersApi.revokeInvitation,
    onSuccess: async () => {
      setFeedback('Đã thu hồi lời mời.');
      await queryClient.invalidateQueries({ queryKey: ['member-invitations'] });
    },
    onError: (cause) => setFeedback(errorMessage(cause)),
  });
  const transferOwnership = useMutation({
    mutationFn: membersApi.transferOwnership,
    onSuccess: () => {
      setFeedback('Đã chuyển ownership. Phiên tenant hiện tại đã hết hiệu lực; hãy đăng nhập lại.');
    },
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

  const transferTo = (member: Member) => {
    if (window.confirm(
      `Chuyển quyền chủ sở hữu cho ${member.user.displayName}? Bạn sẽ trở thành Quản trị viên và phải đăng nhập lại.`,
    )) {
      transferOwnership.mutate(member.id);
    }
  };

  const invitationUrl = createdInvitation
    ? new URL(createdInvitation.acceptancePath, window.location.origin).toString()
    : null;

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
      {createdInvitation && invitationUrl && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={(
            <Button
              color="inherit"
              size="small"
              startIcon={<ContentCopy />}
              onClick={() => void navigator.clipboard.writeText(invitationUrl)}
            >
              Sao chép
            </Button>
          )}
          onClose={() => setCreatedInvitation(null)}
        >
          Liên kết chỉ hiện ở lần tạo này: {invitationUrl}
        </Alert>
      )}
      {canManage && (
        <Tabs value={tab} onChange={(_, value: 'members' | 'invitations') => setTab(value)} sx={{ mb: 2 }}>
          <Tab value="members" label="Thành viên" />
          <Tab value="invitations" label={`Lời mời (${invitations.data?.length ?? 0})`} />
        </Tabs>
      )}
      {tab === 'invitations' && canManage ? (
        <Paper className="panel" variant="outlined">
          {invitations.isLoading ? (
            <SectionLoader />
          ) : invitations.isError ? (
            <ErrorState message={errorMessage(invitations.error)} onRetry={() => void invitations.refetch()} />
          ) : !invitations.data?.length ? (
            <EmptyState title="Chưa có lời mời" description="Tạo lời mời mới để cộng tác trong tenant." />
          ) : (
            <TableContainer>
              <Table className="data-table">
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Vai trò</TableCell>
                    <TableCell>Hết hạn</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell align="right">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invitations.data.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>{tenantRoleLabel[invitation.role]}</TableCell>
                      <TableCell>{new Date(invitation.expiresAt).toLocaleString('vi-VN')}</TableCell>
                      <TableCell><StatusChip status={invitation.status} /></TableCell>
                      <TableCell align="right">
                        <Button
                          color="error"
                          size="small"
                          disabled={invitation.status !== 'PENDING' || revokeInvitation.isPending}
                          onClick={() => revokeInvitation.mutate(invitation.id)}
                        >
                          Thu hồi
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      ) : (
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
                        {isOwner && member.role !== 'OWNER' && (
                          <Button
                            size="small"
                            startIcon={<SwapHoriz />}
                            disabled={transferOwnership.isPending}
                            onClick={() => transferTo(member)}
                          >
                            Chuyển owner
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      )}
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
