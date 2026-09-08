import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '../theme';
import { CustomizationPage } from './CustomizationPage';

const api = vi.hoisted(() => ({
  projects: {
    list: vi.fn(),
    members: vi.fn(),
  },
  boards: {
    list: vi.fn(),
    get: vi.fn(),
  },
  settings: {
    get: vi.fn(),
  },
  customData: {
    definitions: vi.fn(),
    records: vi.fn(),
    jobs: vi.fn(),
    createDefinition: vi.fn(),
    deleteDefinition: vi.fn(),
    restoreDefinition: vi.fn(),
    addField: vi.fn(),
    updateField: vi.fn(),
    deleteField: vi.fn(),
    restoreField: vi.fn(),
    createRecord: vi.fn(),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
  },
  approvals: {
    workflow: vi.fn(),
    saveWorkflow: vi.fn(),
  },
  automation: {
    rules: vi.fn(),
    executions: vi.fn(),
    create: vi.fn(),
    disable: vi.fn(),
  },
}));

vi.mock('../api/endpoints', () => ({
  projectsApi: api.projects,
  boardsApi: api.boards,
  tenantSettingsApi: api.settings,
  customDataApi: api.customData,
  approvalsApi: api.approvals,
  automationApi: api.automation,
}));

const projectId = '10000000-0000-0000-0000-000000000001';
const boardId = '20000000-0000-0000-0000-000000000001';
const completionColumnId = '30000000-0000-0000-0000-000000000001';
const approverId = '40000000-0000-0000-0000-000000000001';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CustomizationPage />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe('CustomizationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.projects.list.mockResolvedValue([{
      id: projectId,
      name: 'Research project',
      status: 'ACTIVE',
      role: 'MANAGER',
    }]);
    api.projects.members.mockResolvedValue([{ userId: approverId, role: 'MEMBER' }]);
    api.boards.list.mockResolvedValue([{ id: boardId, name: 'Delivery board' }]);
    api.boards.get.mockResolvedValue({
      id: boardId,
      projectId,
      name: 'Delivery board',
      version: 0,
      columns: [{ id: completionColumnId, name: 'Done', position: 1, tasks: [] }],
    });
    api.settings.get.mockResolvedValue({
      capabilities: [
        { capability: 'BRANDING', supported: true, granted: true, enabled: true, version: 0 },
        { capability: 'CUSTOM_DATA', supported: true, granted: true, enabled: true, version: 0 },
        { capability: 'APPROVALS', supported: true, granted: true, enabled: true, version: 0 },
        { capability: 'AUTOMATION', supported: true, granted: true, enabled: true, version: 0 },
      ],
      branding: { primaryColor: '#246BFD', accentColor: '#0F9F8F', version: 0 },
    });
    api.customData.records.mockResolvedValue([]);
    api.customData.jobs.mockResolvedValue([]);
    api.automation.rules.mockResolvedValue([]);
    api.automation.executions.mockResolvedValue([]);
  });

  it('lets a Manager disable an existing approval workflow before capability revocation', async () => {
    api.customData.definitions.mockResolvedValue([]);
    api.approvals.workflow.mockResolvedValue({
      id: '50000000-0000-0000-0000-000000000001',
      projectId,
      boardId,
      completionColumnId,
      name: 'Completion review',
      enabled: true,
      version: 3,
      steps: [{
        id: '60000000-0000-0000-0000-000000000001',
        name: 'Peer review',
        position: 1,
        mode: 'ANY',
        approverIds: [approverId],
      }],
    });
    api.approvals.saveWorkflow.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Phê duyệt' }));
    const enabledSwitch = await screen.findByRole('switch', { name: 'Quy trình đang bật' });
    await user.click(enabledSwitch);
    await user.click(screen.getByRole('button', { name: 'Lưu và tắt quy trình' }));

    await waitFor(() => expect(api.approvals.saveWorkflow).toHaveBeenCalledWith(boardId, {
      completionColumnId,
      name: 'Completion review',
      enabled: false,
      version: 3,
      steps: [{ name: 'Peer review', mode: 'ANY', approverIds: [approverId] }],
    }));
  });

  it('allows selecting the Task definition to configure its fields', async () => {
    api.approvals.workflow.mockResolvedValue(null);
    api.customData.definitions.mockResolvedValue([
      {
        id: '70000000-0000-0000-0000-000000000001',
        projectId,
        kind: 'ENTITY',
        displayName: 'Customer data',
        status: 'ACTIVE',
        version: 0,
        fields: [],
      },
      {
        id: '80000000-0000-0000-0000-000000000001',
        projectId,
        kind: 'TASK',
        displayName: 'Task metadata',
        status: 'ACTIVE',
        version: 0,
        fields: [],
      },
    ]);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Field của Customer data')).toBeVisible();
    await user.click(screen.getByText('Task metadata · TASK · ACTIVE'));

    expect(screen.getByText('Field của Task metadata')).toBeVisible();
    expect(screen.getByText('Hiển thị trong chi tiết Task')).toBeVisible();
  });

  it('explains a supported capability that System Admin has not granted', async () => {
    api.approvals.workflow.mockResolvedValue(null);
    api.customData.definitions.mockResolvedValue([]);
    api.settings.get.mockResolvedValue({
      capabilities: [
        { capability: 'BRANDING', supported: true, granted: true, enabled: true, version: 0 },
        { capability: 'CUSTOM_DATA', supported: true, granted: false, enabled: false, version: 0 },
        { capability: 'APPROVALS', supported: false, granted: false, enabled: false, version: 0 },
        { capability: 'AUTOMATION', supported: false, granted: false, enabled: false, version: 0 },
      ],
      branding: { primaryColor: '#246BFD', accentColor: '#0F9F8F', version: 0 },
    });
    renderPage();

    expect(await screen.findByText('System Admin chưa cấp capability này cho tenant.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tạo định nghĩa' })).toBeDisabled();
  });
});
