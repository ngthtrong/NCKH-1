import {
  Add,
  DeleteOutline,
  PlayArrowOutlined,
  RestoreOutlined,
  SettingsSuggestOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import {
  approvalsApi,
  automationApi,
  boardsApi,
  customDataApi,
  projectsApi,
  tenantSettingsApi,
} from '../api/endpoints';
import type {
  AutomationExecution,
  ApprovalWorkflow,
  CustomDefinition,
  CustomField,
  CustomRecord,
  UUID,
} from '../api/types';
import { PageHeader } from '../components/PageHeader';

type StepDraft = { name: string; mode: 'ANY' | 'ALL'; approverIds: UUID[] };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Không thể xử lý yêu cầu tùy chỉnh.';
}

function emptyValue(field: CustomField): unknown {
  return field.dataType === 'BOOLEAN' ? false : '';
}

function FieldInput({ field, value, onChange }: {
  field: CustomField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.dataType === 'BOOLEAN') {
    return <FormControlLabel control={<Checkbox checked={Boolean(value)} onChange={(_, checked) => onChange(checked)} />} label={field.displayName} />;
  }
  if (field.dataType === 'SINGLE_SELECT') {
    return (
      <FormControl size="small" fullWidth required={field.required}>
        <InputLabel>{field.displayName}</InputLabel>
        <Select value={String(value ?? '')} label={field.displayName} onChange={(event) => onChange(event.target.value)}>
          {!field.required && <MenuItem value="">Không chọn</MenuItem>}
          {field.options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
        </Select>
      </FormControl>
    );
  }
  return (
    <TextField
      fullWidth
      required={field.required}
      label={field.displayName}
      type={field.dataType === 'NUMBER' ? 'number' : field.dataType === 'DATE' ? 'date' : 'text'}
      slotProps={field.dataType === 'DATE' ? { inputLabel: { shrink: true } } : undefined}
      value={String(value ?? '')}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function CustomizationPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [projectId, setProjectId] = useState<UUID | ''>('');
  const [boardId, setBoardId] = useState<UUID | ''>('');
  const [definitionId, setDefinitionId] = useState<UUID | ''>('');
  const [error, setError] = useState('');
  const projects = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });
  const settings = useQuery({ queryKey: ['tenant-settings'], queryFn: tenantSettingsApi.get });
  const boards = useQuery({
    queryKey: ['project-boards', projectId],
    queryFn: () => boardsApi.list(projectId as UUID),
    enabled: Boolean(projectId),
  });
  const projectMembers = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectsApi.members(projectId as UUID),
    enabled: Boolean(projectId),
  });
  const definitions = useQuery({
    queryKey: ['custom-definitions', projectId],
    queryFn: () => customDataApi.definitions(projectId as UUID),
    enabled: Boolean(projectId) && Boolean(settings.data?.capabilities.find((item) => item.capability === 'CUSTOM_DATA')?.supported),
  });
  const workflow = useQuery({
    queryKey: ['approval-workflow', boardId],
    queryFn: () => approvalsApi.workflow(boardId as UUID),
    enabled: Boolean(boardId) && Boolean(settings.data?.capabilities.find((item) => item.capability === 'APPROVALS')?.supported),
  });
  const rules = useQuery({
    queryKey: ['automation-rules', projectId],
    queryFn: () => automationApi.rules(projectId as UUID),
    enabled: Boolean(projectId) && Boolean(settings.data?.capabilities.find((item) => item.capability === 'AUTOMATION')?.supported),
  });

  useEffect(() => {
    if (!projectId && projects.data?.[0]) setProjectId(projects.data[0].id);
  }, [projectId, projects.data]);
  useEffect(() => {
    setBoardId(boards.data?.[0]?.id ?? '');
  }, [projectId, boards.data]);
  useEffect(() => {
    const available = definitions.data ?? [];
    setDefinitionId((current) => (
      current && available.some((item) => item.id === current)
        ? current
        : available.find((item) => item.status === 'ACTIVE')?.id ?? available[0]?.id ?? ''
    ));
  }, [projectId, definitions.data]);

  const selectedProject = projects.data?.find((item) => item.id === projectId);
  const canManage = selectedProject?.role === 'MANAGER';
  const canEditData = selectedProject?.role === 'MANAGER' || selectedProject?.role === 'MEMBER';
  const capability = (name: 'CUSTOM_DATA' | 'APPROVALS' | 'AUTOMATION') =>
    settings.data?.capabilities.find((item) => item.capability === name);

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Bridge customization"
        title="Mở rộng nghiệp vụ"
        description="Cấu hình dữ liệu, phê duyệt và tự động hóa trong giới hạn placement và capability đã cấp."
      />
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {projects.isError && <Alert severity="error">{errorMessage(projects.error)}</Alert>}
      {settings.isError && <Alert severity="error">{errorMessage(settings.error)}</Alert>}
      <FormControl size="small" sx={{ maxWidth: 420 }}>
        <InputLabel>Dự án</InputLabel>
        <Select value={projectId} label="Dự án" onChange={(event) => setProjectId(event.target.value as UUID)}>
          {(projects.data ?? []).map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}
        </Select>
      </FormControl>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable">
        <Tab label="Bảng và field" />
        <Tab label="Phê duyệt" />
        <Tab label="Tự động hóa" />
      </Tabs>
      {tab === 0 && <CustomDataPanel
        projectId={projectId}
        enabled={Boolean(capability('CUSTOM_DATA')?.enabled)}
        granted={Boolean(capability('CUSTOM_DATA')?.granted)}
        supported={Boolean(capability('CUSTOM_DATA')?.supported)}
        canManage={Boolean(canManage)}
        canEditData={Boolean(canEditData)}
        definitions={definitions.data ?? []}
        selectedDefinitionId={definitionId}
        setSelectedDefinitionId={setDefinitionId}
        onError={(cause) => setError(errorMessage(cause))}
      />}
      {tab === 1 && <ApprovalPanel
        boardId={boardId}
        setBoardId={setBoardId}
        boards={boards.data ?? []}
        enabled={Boolean(capability('APPROVALS')?.enabled)}
        granted={Boolean(capability('APPROVALS')?.granted)}
        supported={Boolean(capability('APPROVALS')?.supported)}
        canManage={Boolean(canManage)}
        members={projectMembers.data ?? []}
        workflow={workflow.data ?? null}
        onError={(cause) => setError(errorMessage(cause))}
      />}
      {tab === 2 && <AutomationPanel
        projectId={projectId}
        boardId={boardId}
        setBoardId={setBoardId}
        boards={boards.data ?? []}
        enabled={Boolean(capability('AUTOMATION')?.enabled)}
        granted={Boolean(capability('AUTOMATION')?.granted)}
        supported={Boolean(capability('AUTOMATION')?.supported)}
        canManage={Boolean(canManage)}
        members={projectMembers.data ?? []}
        rules={rules.data ?? []}
        onError={(cause) => setError(errorMessage(cause))}
      />}
    </Stack>
  );
}

function CapabilityAlert({ enabled, granted, supported }: {
  enabled: boolean;
  granted: boolean;
  supported: boolean;
}) {
  if (!supported) return <Alert severity="info">Placement hiện tại không hỗ trợ capability này.</Alert>;
  if (!granted) return <Alert severity="info">System Admin chưa cấp capability này cho tenant.</Alert>;
  if (!enabled) return <Alert severity="warning">Capability đang tắt. Dữ liệu lịch sử vẫn đọc được; thao tác ghi bị chặn phía server.</Alert>;
  return null;
}

function CustomDataPanel({ projectId, enabled, granted, supported, canManage, canEditData, definitions, selectedDefinitionId, setSelectedDefinitionId, onError }: {
  projectId: UUID | '';
  enabled: boolean;
  granted: boolean;
  supported: boolean;
  canManage: boolean;
  canEditData: boolean;
  definitions: CustomDefinition[];
  selectedDefinitionId: UUID | '';
  setSelectedDefinitionId: (value: UUID | '') => void;
  onError: (error: unknown) => void;
}) {
  const queryClient = useQueryClient();
  const [definitionName, setDefinitionName] = useState('');
  const [definitionKind, setDefinitionKind] = useState<'TASK' | 'ENTITY'>('ENTITY');
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'SINGLE_SELECT'>('TEXT');
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldPosition, setFieldPosition] = useState(1);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [deletedDefinition, setDeletedDefinition] = useState<{ id: UUID; version: number; name: string } | null>(null);
  const [deletedField, setDeletedField] = useState<{ definitionId: UUID; id: UUID; version: number; name: string } | null>(null);
  const selected = definitions.find((item) => item.id === selectedDefinitionId);
  const records = useQuery({
    queryKey: ['custom-records', selectedDefinitionId],
    queryFn: () => customDataApi.records(selectedDefinitionId as UUID),
    enabled: selected?.kind === 'ENTITY' && selected.status === 'ACTIVE',
  });
  const jobs = useQuery({
    queryKey: ['custom-schema-jobs', projectId],
    queryFn: () => customDataApi.jobs(projectId as UUID),
    enabled: Boolean(projectId && supported && canManage),
    refetchInterval: (query) => (
      query.state.data?.some((job) => job.status === 'QUEUED' || job.status === 'RUNNING') ? 2_000 : false
    ),
  });
  const [recordValues, setRecordValues] = useState<Record<string, unknown>>({});
  const [editing, setEditing] = useState<CustomRecord | null>(null);
  useEffect(() => {
    setEditingField(null);
    setFieldName('');
    setFieldType('TEXT');
    setFieldOptions('');
    setFieldRequired(false);
    setFieldPosition((selected?.fields.length ?? 0) + 1);
    setEditing(null);
    setRecordValues({});
  }, [selectedDefinitionId]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['custom-definitions', projectId] });
  const resetFieldForm = () => {
    setEditingField(null);
    setFieldName('');
    setFieldType('TEXT');
    setFieldOptions('');
    setFieldRequired(false);
    setFieldPosition((selected?.fields.length ?? 0) + 1);
  };
  const createDefinition = useMutation({
    mutationFn: () => customDataApi.createDefinition(projectId as UUID, definitionKind, definitionName),
    onSuccess: async () => { setDefinitionName(''); await refresh(); }, onError,
  });
  const addField = useMutation({
    mutationFn: () => {
      const options = fieldType === 'SINGLE_SELECT'
        ? fieldOptions.split(',').map((item) => item.trim()).filter(Boolean)
        : [];
      return editingField
        ? customDataApi.updateField(selected!.id, editingField.id, {
            displayName: fieldName,
            required: fieldRequired,
            position: fieldPosition,
            options,
            version: editingField.version,
          })
        : customDataApi.addField(selected!.id, {
            displayName: fieldName,
            dataType: fieldType,
            required: fieldRequired,
            position: fieldPosition,
            options,
          });
    },
    onSuccess: async () => { resetFieldForm(); await refresh(); }, onError,
  });
  const deleteDefinition = useMutation({
    mutationFn: (definition: CustomDefinition) => customDataApi.deleteDefinition(definition.id, definition.version),
    onSuccess: async (_, definition) => {
      setDeletedDefinition({ id: definition.id, version: definition.version + 1, name: definition.displayName });
      setSelectedDefinitionId('');
      await refresh();
    },
    onError,
  });
  const restoreDefinition = useMutation({
    mutationFn: () => customDataApi.restoreDefinition(deletedDefinition!.id, deletedDefinition!.version),
    onSuccess: async (definition) => {
      setDeletedDefinition(null);
      await refresh();
      setSelectedDefinitionId(definition.id);
    },
    onError,
  });
  const deleteField = useMutation({
    mutationFn: (field: CustomField) => customDataApi.deleteField(selected!.id, field.id, field.version),
    onSuccess: async (_, field) => {
      setDeletedField({
        definitionId: selected!.id,
        id: field.id,
        version: field.version + 1,
        name: field.displayName,
      });
      resetFieldForm();
      await refresh();
    },
    onError,
  });
  const restoreField = useMutation({
    mutationFn: () => customDataApi.restoreField(
      deletedField!.definitionId, deletedField!.id, deletedField!.version,
    ),
    onSuccess: async () => { setDeletedField(null); await refresh(); },
    onError,
  });
  const saveRecord = useMutation({
    mutationFn: () => editing
      ? customDataApi.updateRecord(selected!.id, editing.id, recordValues, editing.version)
      : customDataApi.createRecord(selected!.id, recordValues),
    onSuccess: async () => {
      setEditing(null); setRecordValues({});
      await queryClient.invalidateQueries({ queryKey: ['custom-records', selectedDefinitionId] });
    }, onError,
  });
  const deleteRecord = useMutation({
    mutationFn: (record: CustomRecord) => customDataApi.deleteRecord(selected!.id, record.id, record.version),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-records', selectedDefinitionId] }), onError,
  });
  const activeFields = selected?.fields.filter((field) => field.status === 'ACTIVE') ?? [];
  const startRecord = (record?: CustomRecord) => {
    setEditing(record ?? null);
    setRecordValues(Object.fromEntries(activeFields.map((field) => [
      field.id, record?.values[field.id] ?? emptyValue(field),
    ])));
  };
  const startFieldEdit = (field: CustomField) => {
    setEditingField(field);
    setFieldName(field.displayName);
    setFieldType(field.dataType);
    setFieldOptions(field.options.join(', '));
    setFieldRequired(field.required);
    setFieldPosition(field.position);
  };
  return (
    <Stack spacing={2}>
      <CapabilityAlert enabled={enabled} granted={granted} supported={supported} />
      {supported && <>
        {deletedDefinition && (
          <Alert
            severity="success"
            action={(
              <Button
                color="inherit"
                size="small"
                startIcon={<RestoreOutlined />}
                disabled={!enabled || restoreDefinition.isPending}
                onClick={() => restoreDefinition.mutate()}
              >
                Phục hồi
              </Button>
            )}
          >
            Đã xóa mềm định nghĩa {deletedDefinition.name}. Dữ liệu vật lý vẫn được giữ lại.
          </Alert>
        )}
        {deletedField && (
          <Alert
            severity="success"
            action={(
              <Button
                color="inherit"
                size="small"
                startIcon={<RestoreOutlined />}
                disabled={!enabled || restoreField.isPending}
                onClick={() => restoreField.mutate()}
              >
                Phục hồi
              </Button>
            )}
          >
            Đã xóa mềm field {deletedField.name}. Cột và dữ liệu hiện hữu chưa bị drop.
          </Alert>
        )}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">Định nghĩa nghiệp vụ</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} mt={2}>
              <TextField
                label="Tên hiển thị"
                value={definitionName}
                onChange={(event) => setDefinitionName(event.target.value)}
              />
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Loại</InputLabel>
                <Select
                  value={definitionKind}
                  label="Loại"
                  onChange={(event) => setDefinitionKind(event.target.value as 'TASK' | 'ENTITY')}
                >
                  <MenuItem value="TASK">Field Task</MenuItem>
                  <MenuItem value="ENTITY">Bảng nghiệp vụ</MenuItem>
                </Select>
              </FormControl>
              <Button
                startIcon={<Add />}
                variant="contained"
                disabled={!enabled || !canManage || !projectId || !definitionName.trim() || createDefinition.isPending}
                onClick={() => createDefinition.mutate()}
              >
                Tạo định nghĩa
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} mt={2} useFlexGap flexWrap="wrap">
              {definitions.map((definition) => (
                <Chip
                  key={definition.id}
                  clickable
                  color={definition.id === selectedDefinitionId ? 'primary' : 'default'}
                  label={`${definition.displayName} · ${definition.kind} · ${definition.status}`}
                  onClick={() => setSelectedDefinitionId(definition.id)}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
        {selected && (
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                <Box>
                  <Typography variant="h6">Field của {selected.displayName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selected.kind === 'TASK' ? 'Hiển thị trong chi tiết Task' : 'Hiển thị trong màn CRUD riêng'}
                  </Typography>
                </Box>
                {canManage && (
                  <Button
                    color="error"
                    startIcon={<DeleteOutline />}
                    disabled={!enabled || deleteDefinition.isPending}
                    onClick={() => deleteDefinition.mutate(selected)}
                  >
                    Xóa mềm định nghĩa
                  </Button>
                )}
              </Stack>
              {selected.lastError && <Alert severity="error" sx={{ mt: 2 }}>{selected.lastError}</Alert>}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} mt={2} alignItems={{ md: 'center' }}>
                <TextField
                  label="Tên field"
                  value={fieldName}
                  onChange={(event) => setFieldName(event.target.value)}
                />
                <FormControl size="small" sx={{ minWidth: 180 }} disabled={Boolean(editingField)}>
                  <InputLabel>Kiểu</InputLabel>
                  <Select
                    value={fieldType}
                    label="Kiểu"
                    onChange={(event) => setFieldType(event.target.value as typeof fieldType)}
                  >
                    {['TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SINGLE_SELECT'].map((type) => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {fieldType === 'SINGLE_SELECT' && (
                  <TextField
                    label="Lựa chọn, cách nhau bằng dấu phẩy"
                    value={fieldOptions}
                    onChange={(event) => setFieldOptions(event.target.value)}
                  />
                )}
                <TextField
                  label="Thứ tự"
                  type="number"
                  value={fieldPosition}
                  onChange={(event) => setFieldPosition(Number(event.target.value))}
                  slotProps={{ htmlInput: { min: 0 } }}
                  sx={{ width: 110 }}
                />
                <FormControlLabel
                  control={<Checkbox checked={fieldRequired} onChange={(_, checked) => setFieldRequired(checked)} />}
                  label="Bắt buộc"
                />
                <Button
                  variant="outlined"
                  disabled={
                    !enabled || !canManage || selected.status !== 'ACTIVE' || !fieldName.trim()
                    || fieldPosition < 0 || addField.isPending
                  }
                  onClick={() => addField.mutate()}
                >
                  {editingField ? 'Lưu field' : 'Thêm field'}
                </Button>
                {editingField && <Button onClick={resetFieldForm}>Hủy sửa</Button>}
              </Stack>
              <Stack spacing={1} mt={2}>
                {selected.fields.map((field) => (
                  <Box
                    key={field.id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    gap={2}
                    p={1.25}
                    border="1px solid"
                    borderColor="divider"
                    borderRadius={2}
                  >
                    <Box>
                      <Typography fontWeight={700}>{field.displayName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {field.dataType} · vị trí {field.position} · {field.required ? 'bắt buộc' : 'tùy chọn'} · {field.status}
                      </Typography>
                    </Box>
                    {canManage && (
                      <Stack direction="row">
                        <Button disabled={!enabled || field.status !== 'ACTIVE'} onClick={() => startFieldEdit(field)}>
                          Sửa
                        </Button>
                        <Button
                          color="error"
                          disabled={!enabled || deleteField.isPending}
                          onClick={() => deleteField.mutate(field)}
                        >
                          Xóa mềm
                        </Button>
                      </Stack>
                    )}
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}
        {selected?.kind === 'ENTITY' && selected.status === 'ACTIVE' && <Card variant="outlined"><CardContent>
          <Box display="flex" justifyContent="space-between"><Typography variant="h6">Dữ liệu {selected.displayName}</Typography><Button startIcon={<Add />} disabled={!enabled || !canEditData || activeFields.length === 0} onClick={() => startRecord()}>Thêm bản ghi</Button></Box>
          {(editing || Object.keys(recordValues).length > 0) && <Stack component="form" spacing={1.5} mt={2} onSubmit={(event: FormEvent) => { event.preventDefault(); saveRecord.mutate(); }}>{activeFields.map((field) => <FieldInput key={field.id} field={field} value={recordValues[field.id]} onChange={(value) => setRecordValues((current) => ({ ...current, [field.id]: value }))} />)}<Stack direction="row" spacing={1}><Button type="submit" variant="contained" disabled={!enabled || !canEditData || saveRecord.isPending}>Lưu bản ghi</Button><Button onClick={() => { setEditing(null); setRecordValues({}); }}>Hủy</Button></Stack></Stack>}
          <Stack spacing={1} mt={2}>{(records.data ?? []).map((record) => <Box key={record.id} display="flex" alignItems="center" justifyContent="space-between" gap={2} p={1.5} border="1px solid" borderColor="divider" borderRadius={2}><Typography variant="body2">{activeFields.map((field) => `${field.displayName}: ${String(record.values[field.id] ?? '—')}`).join(' · ') || record.id}</Typography><Stack direction="row">{canEditData && <Button onClick={() => startRecord(record)} disabled={!enabled}>Sửa</Button>}{canManage && <Button color="error" startIcon={<DeleteOutline />} onClick={() => deleteRecord.mutate(record)} disabled={!enabled}>Xóa</Button>}</Stack></Box>)}</Stack>
        </CardContent></Card>}
        {canManage && (jobs.data?.length ?? 0) > 0 && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6">Tác vụ thay đổi cấu trúc</Typography>
              <Stack spacing={1} mt={2} divider={<Divider flexItem />}>
                {jobs.data?.slice(0, 20).map((job) => (
                  <Box key={job.id} display="flex" justifyContent="space-between" gap={2}>
                    <Typography variant="body2">{job.operation} · phiên bản {job.targetVersion}</Typography>
                    <Chip
                      size="small"
                      color={job.status === 'SUCCEEDED' ? 'success' : job.status === 'FAILED' ? 'error' : 'default'}
                      label={`${job.status} · ${job.attempts} lần`}
                    />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}
      </>}
    </Stack>
  );
}

function ApprovalPanel({ boardId, setBoardId, boards, enabled, granted, supported, canManage, members, workflow, onError }: {
  boardId: UUID | '';
  setBoardId: (value: UUID | '') => void;
  boards: Array<{ id: UUID; name: string }>;
  enabled: boolean;
  granted: boolean;
  supported: boolean;
  canManage: boolean;
  members: Array<{ userId: UUID; role: 'MANAGER' | 'MEMBER' | 'VIEWER' }>;
  workflow: ApprovalWorkflow | null;
  onError: (error: unknown) => void;
}) {
  const queryClient = useQueryClient();
  const board = useQuery({ queryKey: ['board', boardId], queryFn: () => boardsApi.get(boardId as UUID), enabled: Boolean(boardId) });
  const [name, setName] = useState('Task completion approval');
  const [completionColumnId, setCompletionColumnId] = useState<UUID | ''>('');
  const [workflowEnabled, setWorkflowEnabled] = useState(true);
  const [steps, setSteps] = useState<StepDraft[]>([{ name: 'Duyệt', mode: 'ANY', approverIds: [] }]);
  useEffect(() => {
    if (workflow) {
      setName(workflow.name); setCompletionColumnId(workflow.completionColumnId);
      setWorkflowEnabled(workflow.enabled);
      setSteps(workflow.steps.map((step) => ({ name: step.name, mode: step.mode, approverIds: step.approverIds })));
    } else if (board.data?.columns[0]) {
      setName('Task completion approval');
      setCompletionColumnId(board.data.columns.at(-1)?.id ?? '');
      setWorkflowEnabled(true);
      setSteps([{ name: 'Duyệt', mode: 'ANY', approverIds: [] }]);
    }
  }, [workflow, board.data]);
  const save = useMutation({
    mutationFn: () => approvalsApi.saveWorkflow(boardId as UUID, {
      completionColumnId: completionColumnId as UUID,
      name,
      enabled: workflowEnabled,
      version: workflow?.version ?? 0,
      steps,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approval-workflow', boardId] }), onError,
  });
  const approvers = members.filter((member) => member.role !== 'VIEWER');
  return <Stack spacing={2}>
    <CapabilityAlert enabled={enabled} granted={granted} supported={supported} />
    {supported && <Card variant="outlined"><CardContent>
      <Typography variant="h6">Quy trình theo board</Typography>
      <Stack spacing={2} mt={2}>
        <FormControl size="small"><InputLabel>Board</InputLabel><Select value={boardId} label="Board" onChange={(event) => setBoardId(event.target.value as UUID)}>{boards.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</Select></FormControl>
        <TextField label="Tên quy trình" value={name} onChange={(event) => setName(event.target.value)} />
        <FormControlLabel
          control={<Switch checked={workflowEnabled} onChange={(_, checked) => setWorkflowEnabled(checked)} />}
          label={workflowEnabled ? 'Quy trình đang bật' : 'Quy trình sẽ được tắt'}
          disabled={!enabled || !canManage}
        />
        <FormControl size="small"><InputLabel>Cột hoàn thành</InputLabel><Select value={completionColumnId} label="Cột hoàn thành" onChange={(event) => setCompletionColumnId(event.target.value as UUID)}>{(board.data?.columns ?? []).map((column) => <MenuItem key={column.id} value={column.id}>{column.name}</MenuItem>)}</Select></FormControl>
        {steps.map((step, index) => <Stack key={index} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center"><TextField label={`Bước ${index + 1}`} value={step.name} onChange={(event) => setSteps((current) => current.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /><FormControl size="small" sx={{ minWidth: 120 }}><InputLabel>Chế độ</InputLabel><Select value={step.mode} label="Chế độ" onChange={(event) => setSteps((current) => current.map((item, i) => i === index ? { ...item, mode: event.target.value as 'ANY' | 'ALL' } : item))}><MenuItem value="ANY">ANY</MenuItem><MenuItem value="ALL">ALL</MenuItem></Select></FormControl><FormControl size="small" sx={{ minWidth: 280 }}><InputLabel>Người duyệt</InputLabel><Select multiple value={step.approverIds} label="Người duyệt" renderValue={(values) => `${values.length} người`} onChange={(event) => setSteps((current) => current.map((item, i) => i === index ? { ...item, approverIds: event.target.value as UUID[] } : item))}>{approvers.map((member) => <MenuItem key={member.userId} value={member.userId}><Checkbox checked={step.approverIds.includes(member.userId)} /><ListItemText primary={`${member.userId} · ${member.role}`} /></MenuItem>)}</Select></FormControl>{steps.length > 1 && <Button color="error" onClick={() => setSteps((current) => current.filter((_, i) => i !== index))}>Bỏ</Button>}</Stack>)}
        <Stack direction="row" spacing={1}>
          <Button startIcon={<Add />} disabled={!enabled || !canManage} onClick={() => setSteps((current) => [...current, { name: `Bước ${current.length + 1}`, mode: 'ANY', approverIds: [] }])}>Thêm bước</Button>
          <Button
            variant="contained"
            startIcon={<SettingsSuggestOutlined />}
            disabled={!enabled || !canManage || !boardId || !completionColumnId || save.isPending || steps.some((step) => !step.name.trim() || step.approverIds.length === 0)}
            onClick={() => save.mutate()}
          >
            {workflowEnabled ? 'Lưu và bật quy trình' : 'Lưu và tắt quy trình'}
          </Button>
          {workflow && <Chip color={workflow.enabled ? 'success' : 'default'} label={workflow.enabled ? 'Đang bật' : 'Đã tắt'} />}
        </Stack>
      </Stack>
    </CardContent></Card>}
  </Stack>;
}

function AutomationPanel({ projectId, boardId, setBoardId, boards, enabled, granted, supported, canManage, members, rules, onError }: {
  projectId: UUID | '';
  boardId: UUID | '';
  setBoardId: (value: UUID | '') => void;
  boards: Array<{ id: UUID; name: string }>;
  enabled: boolean;
  granted: boolean;
  supported: boolean;
  canManage: boolean;
  members: Array<{ userId: UUID }>;
  rules: Array<{ id: UUID; name: string; triggerType: string; actionType: string; enabled: boolean; version: number }>;
  onError: (error: unknown) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<'TASK_CREATED' | 'TASK_MOVED' | 'APPROVAL_APPROVED' | 'APPROVAL_REJECTED'>('TASK_CREATED');
  const [triggerColumnId, setTriggerColumnId] = useState<UUID | ''>('');
  const [action, setAction] = useState<'ASSIGN_USER' | 'NOTIFY_USERS'>('NOTIFY_USERS');
  const [users, setUsers] = useState<UUID[]>([]);
  const board = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardsApi.get(boardId as UUID),
    enabled: trigger === 'TASK_MOVED' && Boolean(boardId),
  });
  const executions = useQuery({
    queryKey: ['automation-executions', projectId],
    queryFn: () => automationApi.executions(projectId as UUID),
    enabled: Boolean(projectId && supported),
  });
  const create = useMutation({
    mutationFn: () => automationApi.create(projectId as UUID, {
      name,
      triggerType: trigger,
      triggerBoardId: trigger === 'TASK_MOVED' ? boardId || null : null,
      triggerColumnId: trigger === 'TASK_MOVED' ? triggerColumnId || null : null,
      actionType: action,
      actionUserIds: action === 'ASSIGN_USER' ? users.slice(0, 1) : users,
    }),
    onSuccess: async () => {
      setName('');
      setTriggerColumnId('');
      setUsers([]);
      await queryClient.invalidateQueries({ queryKey: ['automation-rules', projectId] });
    }, onError,
  });
  const disable = useMutation({
    mutationFn: (rule: { id: UUID; version: number }) => automationApi.disable(rule.id, rule.version),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation-rules', projectId] }), onError,
  });
  return <Stack spacing={2}>
    <CapabilityAlert enabled={enabled} granted={granted} supported={supported} />
    {supported && <Card variant="outlined"><CardContent>
      <Typography variant="h6">Một trigger, một action</Typography>
      <Stack spacing={2} mt={2}>
        <TextField label="Tên quy tắc" value={name} onChange={(event) => setName(event.target.value)} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
          <FormControl size="small" sx={{ minWidth: 220 }}><InputLabel>Trigger</InputLabel><Select value={trigger} label="Trigger" onChange={(event) => setTrigger(event.target.value as typeof trigger)}>{['TASK_CREATED','TASK_MOVED','APPROVAL_APPROVED','APPROVAL_REJECTED'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></FormControl>
          <FormControl size="small" sx={{ minWidth: 220 }}><InputLabel>Action</InputLabel><Select value={action} label="Action" onChange={(event) => setAction(event.target.value as typeof action)}><MenuItem value="ASSIGN_USER">Gán thành viên</MenuItem><MenuItem value="NOTIFY_USERS">Thông báo trong ứng dụng</MenuItem></Select></FormControl>
          {action === 'ASSIGN_USER' ? (
            <FormControl size="small" sx={{ minWidth: 300 }}>
              <InputLabel>Người được gán</InputLabel>
              <Select
                value={users[0] ?? ''}
                label="Người được gán"
                onChange={(event) => setUsers([event.target.value as UUID])}
              >
                {members.map((member) => <MenuItem key={member.userId} value={member.userId}>{member.userId}</MenuItem>)}
              </Select>
            </FormControl>
          ) : (
            <FormControl size="small" sx={{ minWidth: 300 }}>
              <InputLabel>Người nhận</InputLabel>
              <Select
                multiple
                value={users}
                label="Người nhận"
                renderValue={(values) => `${values.length} người`}
                onChange={(event) => setUsers(event.target.value as UUID[])}
              >
                {members.map((member) => <MenuItem key={member.userId} value={member.userId}><Checkbox checked={users.includes(member.userId)} /><ListItemText primary={member.userId} /></MenuItem>)}
              </Select>
            </FormControl>
          )}
        </Stack>
        {trigger === 'TASK_MOVED' && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>Board giới hạn</InputLabel>
              <Select
                value={boardId}
                label="Board giới hạn"
                onChange={(event) => {
                  setBoardId(event.target.value as UUID);
                  setTriggerColumnId('');
                }}
              >
                {boards.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>Cột đích (tùy chọn)</InputLabel>
              <Select
                value={triggerColumnId}
                label="Cột đích (tùy chọn)"
                onChange={(event) => setTriggerColumnId(event.target.value as UUID | '')}
              >
                <MenuItem value="">Mọi cột</MenuItem>
                {(board.data?.columns ?? []).map((column) => (
                  <MenuItem key={column.id} value={column.id}>{column.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        )}
        <Button variant="contained" startIcon={<PlayArrowOutlined />} disabled={!enabled || !canManage || !name.trim() || users.length === 0} onClick={() => create.mutate()}>Tạo quy tắc</Button>
        <Stack spacing={1}>{rules.map((rule) => <Box key={rule.id} display="flex" justifyContent="space-between" alignItems="center" p={1.5} border="1px solid" borderColor="divider" borderRadius={2}><Box><Typography fontWeight={700}>{rule.name}</Typography><Typography variant="caption">{rule.triggerType} → {rule.actionType}</Typography></Box><Stack direction="row" alignItems="center"><Chip size="small" label={rule.enabled ? 'Bật' : 'Đã tắt'} color={rule.enabled ? 'success' : 'default'} />{rule.enabled && <Button color="error" disabled={!enabled || !canManage} onClick={() => disable.mutate(rule)}>Tắt</Button>}</Stack></Box>)}</Stack>
      </Stack>
    </CardContent></Card>}
    {supported && (executions.data?.length ?? 0) > 0 && (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Lịch sử tự động hóa</Typography>
          <Stack spacing={1} mt={2} divider={<Divider flexItem />}>
            {executions.data?.slice(0, 20).map((execution: AutomationExecution) => (
              <Box key={execution.id} display="flex" justifyContent="space-between" gap={2}>
                <Typography variant="body2">Rule {execution.ruleId} · lần thử {execution.attempts}</Typography>
                <Chip
                  size="small"
                  label={execution.status}
                  color={execution.status === 'SUCCEEDED' ? 'success' : execution.status === 'FAILED' ? 'error' : 'default'}
                />
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    )}
  </Stack>;
}
