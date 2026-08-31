import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test';

type Placement = 'POOL' | 'SILO_DATABASE';

interface TenantCase {
  label: string;
  slug: string;
  placement: Placement;
  origin: string;
}

interface ExchangeResponse {
  accessToken: string;
  activeTenant: {
    id: string;
    slug: string;
    placement: Placement;
  };
}

interface Credentials {
  email: string;
  password: string;
}

interface ProjectView {
  id: string;
  name: string;
  role: 'MANAGER' | 'MEMBER' | 'VIEWER';
  boardId: string | null;
}

interface TenantMemberView {
  userId: string;
  email: string;
}

interface BoardColumnView {
  id: string;
  name: string;
  position: number;
}

interface TaskView {
  id: string;
}

interface ResourceView {
  id: string;
  originalName: string;
}

interface DownloadUrl {
  url: string;
  expiresAt: string;
}

interface NotificationView {
  id: string;
  eventType: string;
  body: string;
  readAt: string | null;
}

interface BoardView {
  id: string;
  projectId: string;
  name: string;
  version: number;
  columns: BoardColumnView[];
  tasks: TaskView[];
}

interface HttpResponse {
  status(): number;
  text(): Promise<string>;
}

function requiredEnvironment(name: string, seedName: string): string {
  const value = process.env[name]?.trim() || process.env[seedName]?.trim();
  if (!value) {
    throw new Error(
      `${name} (or ${seedName}) is required. Set E2E_ENV_FILE to infra/.env or an ignored E2E env file.`,
    );
  }
  return value;
}

const accountsUrl = new URL(
  process.env.E2E_ACCOUNTS_URL ??
    process.env.PUBLIC_ACCOUNTS_URL ??
    'http://accounts.localhost:8080',
);
const gatewayUrl = new URL(process.env.E2E_GATEWAY_URL ?? 'http://127.0.0.1:8080');
const ownerCredentials: Credentials = {
  email: requiredEnvironment('E2E_OWNER_EMAIL', 'DEMO_OWNER_EMAIL'),
  password: requiredEnvironment('E2E_OWNER_PASSWORD', 'DEMO_OWNER_PASSWORD'),
};
const memberCredentials: Credentials = {
  email: process.env.E2E_MEMBER_EMAIL?.trim() || 'member@example.test',
  password:
    process.env.E2E_MEMBER_PASSWORD?.trim() ||
    process.env.DEMO_MEMBER_PASSWORD?.trim() ||
    ownerCredentials.password,
};

function defaultTenantOrigin(slug: string): string {
  const tenantUrl = new URL(accountsUrl);
  tenantUrl.hostname = tenantUrl.hostname.startsWith('accounts.')
    ? `${slug}.${tenantUrl.hostname.slice('accounts.'.length)}`
    : `${slug}.${tenantUrl.hostname}`;
  tenantUrl.pathname = '/';
  tenantUrl.search = '';
  tenantUrl.hash = '';
  return tenantUrl.origin;
}

function configuredTenant(
  label: string,
  slugVariable: string,
  originVariable: string,
  fallbackSlug: string,
  placement: Placement,
): TenantCase {
  const slug = process.env[slugVariable]?.trim() || fallbackSlug;
  const origin = new URL(process.env[originVariable]?.trim() || defaultTenantOrigin(slug)).origin;
  return { label, slug, placement, origin };
}

const tenants = [
  configuredTenant(
    'Pool',
    'E2E_POOL_TENANT_SLUG',
    'E2E_POOL_TENANT_URL',
    'pool-demo',
    'POOL',
  ),
  configuredTenant(
    'Silo',
    'E2E_SILO_TENANT_SLUG',
    'E2E_SILO_TENANT_URL',
    'silo-demo',
    'SILO_DATABASE',
  ),
];

async function loginAndSelectTenant(
  page: Page,
  tenant: TenantCase,
  credentials: Credentials,
): Promise<string> {
  await page.goto(new URL('/login', accountsUrl).toString());
  await expect(page.getByRole('heading', { name: 'Chào mừng trở lại' })).toBeVisible();

  await page.getByLabel('Email', { exact: true }).fill(credentials.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(credentials.password);

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/v1/auth/login',
  );
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.status(), await loginResponse.text()).toBe(200);

  await expect(page).toHaveURL(new URL('/select-tenant', accountsUrl).toString());
  await expect(page.getByRole('heading', { name: 'Chọn tổ chức để tiếp tục' })).toBeVisible();

  const tenantCard = page.locator('.tenant-card').filter({ hasText: tenant.slug });
  await expect(tenantCard, `Tenant ${tenant.slug} must be present in the account selector`).toHaveCount(1);
  await expect(tenantCard).toContainText(tenant.placement);

  const exchangeResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/v1/auth/exchange',
  );
  await tenantCard.getByRole('button', { name: 'Mở không gian' }).click();
  const exchangeResponse = await exchangeResponsePromise;
  expect(exchangeResponse.status(), await exchangeResponse.text()).toBe(200);

  const session = (await exchangeResponse.json()) as ExchangeResponse;
  expect(session.accessToken).toBeTruthy();
  expect(session.activeTenant.slug).toBe(tenant.slug);
  expect(session.activeTenant.placement).toBe(tenant.placement);

  await expect(page).toHaveURL(new URL('/dashboard', tenant.origin).toString());
  await expect(page.getByRole('heading', { name: 'Nhịp làm việc hôm nay' })).toBeVisible();
  await expect(page.locator('.tenant-switcher')).toContainText(tenant.placement);

  return session.accessToken;
}

test.describe('tenant authentication and host binding', () => {
  for (const [index, tenant] of tenants.entries()) {
    const mismatchedTenant = tenants[(index + 1) % tenants.length];

    test(`${tenant.label} enforces host, role, resource and worker tenant matrix`, async ({
      browser,
      page,
      request,
    }) => {
      const artifactPrefix = `E2E role matrix ${tenant.slug}`;
      const managerColumnName = `${artifactPrefix} manager`;
      const renamedColumnName = `${artifactPrefix} renamed`;
      const staleColumnName = `${artifactPrefix} stale`;
      const resourceName = `e2e-resource-${tenant.slug}-${Date.now()}.txt`;
      const resourceContent = `tenant-scoped download evidence for ${tenant.slug}`;
      const foreignResourceName = `e2e-resource-${mismatchedTenant.slug}-${Date.now()}.txt`;
      const foreignResourceContent =
        `foreign tenant download evidence for ${mismatchedTenant.slug}`;
      let managerToken: string | undefined;
      let foreignManagerToken: string | undefined;
      let memberToken: string | undefined;
      let project: ProjectView | undefined;
      let member: TenantMemberView | undefined;
      let createdTaskId: string | undefined;
      let createdResourceId: string | undefined;
      let foreignResourceId: string | undefined;
      let memberContext: BrowserContext | undefined;
      let foreignManagerContext: BrowserContext | undefined;

      try {
        managerToken = await loginAndSelectTenant(page, tenant, ownerCredentials);
        foreignManagerContext = await browser.newContext({
          baseURL: accountsUrl.origin,
          locale: 'vi-VN',
        });
        foreignManagerToken = await loginAndSelectTenant(
          await foreignManagerContext.newPage(),
          mismatchedTenant,
          ownerCredentials,
        );
        const mismatchResponse = await rejectTokenOnForeignHost(
          request,
          mismatchedTenant,
          managerToken,
        );
        await expectStatus(
          mismatchResponse,
          403,
          `Token for ${tenant.slug} must be rejected by ${mismatchedTenant.slug}`,
        );

        const projects = await expectJson<ProjectView[]>(
          await tenantApi(request, tenant, managerToken, '/projects'),
          200,
          'Manager project list',
        );
        project = projects.find((candidate) => candidate.boardId !== null);
        expect(project, 'The seeded project with a board must exist').toBeTruthy();
        expect(project!.role).toBe('MANAGER');

        const uploadedResource = await expectJson<ResourceView>(
          await uploadTenantResource(
            request,
            tenant,
            managerToken,
            resourceName,
            resourceContent,
          ),
          200,
          'Manager uploads a tenant resource',
        );
        createdResourceId = uploadedResource.id;
        expect(uploadedResource.originalName).toBe(resourceName);

        const uploadedForeignResource = await expectJson<ResourceView>(
          await uploadTenantResource(
            request,
            mismatchedTenant,
            foreignManagerToken,
            foreignResourceName,
            foreignResourceContent,
          ),
          200,
          'Foreign Manager uploads its own tenant resource',
        );
        foreignResourceId = uploadedForeignResource.id;
        expect(uploadedForeignResource.originalName).toBe(foreignResourceName);

        const currentResources = await expectJson<ResourceView[]>(
          await tenantApi(request, tenant, managerToken, '/resources'),
          200,
          'Manager resource list',
        );
        expect(currentResources.map((resource) => resource.id)).toContain(createdResourceId);
        const foreignResources = await expectJson<ResourceView[]>(
          await tenantApi(request, mismatchedTenant, foreignManagerToken, '/resources'),
          200,
          'Foreign tenant resource list',
        );
        expect(foreignResources.map((resource) => resource.id)).not.toContain(createdResourceId);
        expect(foreignResources.map((resource) => resource.id)).toContain(foreignResourceId);
        await expectStatus(
          await tenantApi(
            request,
            mismatchedTenant,
            foreignManagerToken,
            `/resources/${createdResourceId}/download-url`,
          ),
          404,
          'Foreign tenant cannot authorize a known resource ID',
        );
        await expectStatus(
          await tenantApi(
            request,
            tenant,
            managerToken,
            `/resources/${foreignResourceId}/download-url`,
          ),
          404,
          'Source tenant cannot authorize a known foreign resource ID',
        );

        const authorizedDownload = await expectJson<DownloadUrl>(
          await tenantApi(
            request,
            tenant,
            managerToken,
            `/resources/${createdResourceId}/download-url`,
          ),
          200,
          'Uploader obtains a short-lived resource URL',
        );
        expect(new Date(authorizedDownload.expiresAt).getTime()).toBeGreaterThan(Date.now());
        const downloaded = await request.get(authorizedDownload.url);
        await expectStatus(downloaded, 200, 'Authorized resource download');
        expect(await downloaded.text()).toBe(resourceContent);

        const foreignAuthorizedDownload = await expectJson<DownloadUrl>(
          await tenantApi(
            request,
            mismatchedTenant,
            foreignManagerToken,
            `/resources/${foreignResourceId}/download-url`,
          ),
          200,
          'Foreign uploader obtains its own short-lived resource URL',
        );
        const foreignDownloaded = await request.get(foreignAuthorizedDownload.url);
        await expectStatus(foreignDownloaded, 200, 'Foreign authorized resource download');
        expect(await foreignDownloaded.text()).toBe(foreignResourceContent);

        const tamperedDownload = new URL(authorizedDownload.url);
        const foreignDownloadUrl = new URL(foreignAuthorizedDownload.url);
        if (foreignDownloadUrl.searchParams.has('key')) {
          tamperedDownload.searchParams.set(
            'key',
            foreignDownloadUrl.searchParams.get('key')!,
          );
        } else {
          tamperedDownload.pathname = foreignDownloadUrl.pathname;
        }
        expect(tamperedDownload.toString()).not.toBe(authorizedDownload.url);
        await expectStatus(
          await request.get(tamperedDownload.toString()),
          403,
          'Tampering with the signed object key is rejected',
        );

        const members = await expectJson<TenantMemberView[]>(
          await tenantApi(request, tenant, managerToken, '/members'),
          200,
          'Tenant member list',
        );
        member = members.find(
          (candidate) => candidate.email.toLowerCase() === memberCredentials.email.toLowerCase(),
        );
        expect(member, `Tenant member ${memberCredentials.email} must exist`).toBeTruthy();

        await setProjectRole(request, tenant, managerToken, project!.id, member!.userId, 'MEMBER');
        await deleteColumnsByPrefix(
          request,
          tenant,
          managerToken,
          project!.boardId!,
          artifactPrefix,
        );

        const initialBoard = await getBoard(request, tenant, managerToken, project!.boardId!);
        await page.goto(new URL(`/kanban/${initialBoard.id}`, tenant.origin).toString());
        await expect(page.getByRole('heading', { name: initialBoard.name })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Thêm cột' })).toBeVisible();
        await expect(page.getByLabel(/^Đổi tên cột /)).toHaveCount(initialBoard.columns.length);

        const createdBoard = await expectJson<BoardView>(
          await tenantApi(request, tenant, managerToken, `/boards/${initialBoard.id}/columns`, {
            method: 'POST',
            data: { name: managerColumnName, version: initialBoard.version },
          }),
          201,
          'Manager creates a board column',
        );
        expect(createdBoard.version).toBe(initialBoard.version + 1);
        const managerColumn = createdBoard.columns.find(
          (column) => column.name === managerColumnName,
        );
        expect(managerColumn, 'The Manager-created column must be returned').toBeTruthy();

        const staleResponsePromise = page.waitForResponse(
          (response) =>
            response.request().method() === 'POST' &&
            new URL(response.url()).pathname === `/api/v1/boards/${initialBoard.id}/columns`,
        );
        await page.getByRole('button', { name: 'Thêm cột' }).click();
        await page.getByRole('textbox', { name: 'Tên cột' }).fill(staleColumnName);
        await page.getByRole('button', { name: 'Lưu' }).click();
        const staleResponse = await staleResponsePromise;
        await expectStatus(staleResponse, 409, 'Stale Manager UI column create');
        await expect(
          page.getByText('Bố cục cột đã thay đổi hoặc thao tác không hợp lệ. Bảng đang được tải lại.'),
        ).toBeVisible();
        await expect(page.getByText(managerColumnName, { exact: true })).toBeVisible();
        await expect(page.getByText(staleColumnName, { exact: true })).toHaveCount(0);

        const boardAfterConflict = await getBoard(
          request,
          tenant,
          managerToken,
          initialBoard.id,
        );
        expect(boardAfterConflict.version).toBe(createdBoard.version);
        const renamedBoard = await expectJson<BoardView>(
          await tenantApi(
            request,
            tenant,
            managerToken,
            `/boards/${initialBoard.id}/columns/${managerColumn!.id}`,
            {
              method: 'PATCH',
              data: { name: renamedColumnName, version: boardAfterConflict.version },
            },
          ),
          200,
          'Manager renames a board column',
        );
        expect(renamedBoard.version).toBe(boardAfterConflict.version + 1);

        const reorderedIds = [
          managerColumn!.id,
          ...renamedBoard.columns
            .filter((column) => column.id !== managerColumn!.id)
            .map((column) => column.id),
        ];
        const reorderedBoard = await expectJson<BoardView>(
          await tenantApi(request, tenant, managerToken, `/boards/${initialBoard.id}/columns/order`, {
            method: 'PUT',
            data: { columnIds: reorderedIds, version: renamedBoard.version },
          }),
          200,
          'Manager reorders board columns',
        );
        expect(reorderedBoard.version).toBe(renamedBoard.version + 1);
        expect(reorderedBoard.columns.map((column) => column.id)).toEqual(reorderedIds);

        memberContext = await browser.newContext({
          baseURL: accountsUrl.origin,
          locale: 'vi-VN',
        });
        const memberPage = await memberContext.newPage();
        memberToken = await loginAndSelectTenant(
          memberPage,
          tenant,
          memberCredentials,
        );

        await assertColumnMutationsForbidden(
          request,
          tenant,
          memberToken,
          reorderedBoard,
          managerColumn!.id,
          `${artifactPrefix} member denied`,
        );
        const memberTask = await expectJson<TaskView>(
          await tenantApi(request, tenant, memberToken, `/boards/${initialBoard.id}/tasks`, {
            method: 'POST',
            data: {
              columnId: reorderedBoard.columns.find((column) => column.id !== managerColumn!.id)!.id,
              title: `${artifactPrefix} member task`,
            },
          }),
          201,
          'Member creates a task',
        );
        createdTaskId = memberTask.id;
        await expectStatus(
          await tenantApi(
            request,
            tenant,
            managerToken,
            `/resources/${createdResourceId}/tasks/${createdTaskId}`,
            { method: 'POST' },
          ),
          200,
          'Manager attaches the resource to the Member-created task',
        );

        let deliveredNotification: NotificationView | undefined;
        await expect.poll(async () => {
          const notifications = await expectJson<NotificationView[]>(
            await tenantApi(request, tenant, managerToken!, '/notifications'),
            200,
            'Current tenant notification list',
          );
          deliveredNotification = notifications.find(
            (notification) =>
              notification.eventType === 'TASK_CREATED' &&
              notification.body.includes(createdTaskId!),
          );
          return deliveredNotification !== undefined;
        }, {
          message: 'The worker must deliver the task event inside its source tenant',
          timeout: 15_000,
        }).toBe(true);
        const foreignNotifications = await expectJson<NotificationView[]>(
          await tenantApi(request, mismatchedTenant, foreignManagerToken, '/notifications'),
          200,
          'Foreign tenant notification list',
        );
        expect(
          foreignNotifications.some((notification) => notification.body.includes(createdTaskId!)),
          'The task event must not be delivered to the same user in another tenant',
        ).toBe(false);
        expect(deliveredNotification).toBeDefined();
        await expectStatus(
          await tenantApi(
            request,
            mismatchedTenant,
            foreignManagerToken,
            `/notifications/${deliveredNotification!.id}/read`,
            { method: 'PATCH' },
          ),
          404,
          'Foreign tenant cannot mutate a known source notification ID',
        );
        const sourceNotificationsAfterForeignMutation = await expectJson<NotificationView[]>(
          await tenantApi(request, tenant, managerToken, '/notifications'),
          200,
          'Source notification remains tenant scoped after foreign mutation',
        );
        expect(
          sourceNotificationsAfterForeignMutation.find(
            (notification) => notification.id === deliveredNotification!.id,
          )?.readAt,
        ).toBeNull();

        await memberPage.goto(new URL(`/kanban/${initialBoard.id}`, tenant.origin).toString());
        await expect(memberPage.getByRole('heading', { name: initialBoard.name })).toBeVisible();
        await expect(memberPage.getByRole('button', { name: 'Thêm cột' })).toHaveCount(0);
        await expect(memberPage.getByLabel(/^Đổi tên cột /)).toHaveCount(0);
        const memberTaskButtons = memberPage.getByRole('button', { name: 'Thêm công việc' });
        await expect(memberTaskButtons).toHaveCount(reorderedBoard.columns.length);
        for (let columnIndex = 0; columnIndex < reorderedBoard.columns.length; columnIndex += 1) {
          await expect(memberTaskButtons.nth(columnIndex)).toBeEnabled();
        }

        await setProjectRole(request, tenant, managerToken, project!.id, member!.userId, 'VIEWER');
        const viewerBoard = await expectJson<BoardView>(
          await tenantApi(request, tenant, memberToken, `/boards/${initialBoard.id}`),
          200,
          'Viewer reads the board',
        );
        await assertColumnMutationsForbidden(
          request,
          tenant,
          memberToken,
          viewerBoard,
          managerColumn!.id,
          `${artifactPrefix} viewer denied`,
        );
        await expectStatus(
          await tenantApi(request, tenant, memberToken, `/boards/${initialBoard.id}/tasks`, {
            method: 'POST',
            data: {
              columnId: viewerBoard.columns[0].id,
              title: `${artifactPrefix} viewer task`,
            },
          }),
          403,
          'Viewer task create',
        );
        const viewerResources = await expectJson<ResourceView[]>(
          await tenantApi(request, tenant, memberToken, '/resources'),
          200,
          'Viewer resource list after task attachment',
        );
        expect(viewerResources.map((resource) => resource.id)).toContain(createdResourceId);
        await expectStatus(
          await tenantApi(
            request,
            tenant,
            memberToken,
            `/resources/${createdResourceId}/download-url`,
          ),
          200,
          'Viewer downloads a resource attached to an authorized project',
        );
        await expectStatus(
          await uploadTenantResource(
            request,
            tenant,
            memberToken,
            `viewer-denied-${resourceName}`,
            'must not be stored',
          ),
          403,
          'Viewer resource upload',
        );
        await expectStatus(
          await tenantApi(request, tenant, memberToken, `/resources/${createdResourceId}`, {
            method: 'DELETE',
          }),
          403,
          'Viewer resource delete',
        );

        await memberPage.reload();
        await expect(memberPage.getByRole('heading', { name: initialBoard.name })).toBeVisible();
        await expect(memberPage.getByRole('button', { name: 'Thêm cột' })).toHaveCount(0);
        await expect(memberPage.getByLabel(/^Đổi tên cột /)).toHaveCount(0);
        const viewerTaskButtons = memberPage.getByRole('button', { name: 'Thêm công việc' });
        await expect(viewerTaskButtons).toHaveCount(viewerBoard.columns.length);
        for (let columnIndex = 0; columnIndex < viewerBoard.columns.length; columnIndex += 1) {
          await expect(viewerTaskButtons.nth(columnIndex)).toBeDisabled();
        }

        await expectStatus(
          await tenantApi(request, tenant, managerToken, `/tasks/${createdTaskId}`, {
            method: 'DELETE',
          }),
          204,
          'Manager removes the Member-created task',
        );
        createdTaskId = undefined;

        await expectStatus(
          await tenantApi(request, tenant, managerToken, `/resources/${createdResourceId}`, {
            method: 'DELETE',
          }),
          200,
          'Manager requests source resource deletion',
        );
        createdResourceId = undefined;
        await expect.poll(
          async () => (await request.get(authorizedDownload.url)).status(),
          {
            message: 'The worker must remove the source object after metadata deletion',
            timeout: 20_000,
          },
        ).toBe(404);
        const foreignObjectAfterSourceDeletion = await request.get(foreignAuthorizedDownload.url);
        await expectStatus(
          foreignObjectAfterSourceDeletion,
          200,
          'Deleting the source object must not remove the foreign tenant object',
        );
        expect(await foreignObjectAfterSourceDeletion.text()).toBe(foreignResourceContent);

        await expectStatus(
          await tenantApi(
            request,
            mismatchedTenant,
            foreignManagerToken,
            `/resources/${foreignResourceId}`,
            { method: 'DELETE' },
          ),
          200,
          'Foreign Manager removes its own resource',
        );
        foreignResourceId = undefined;
        await expect.poll(
          async () => (await request.get(foreignAuthorizedDownload.url)).status(),
          {
            message: 'The worker must remove the foreign object only after its own delete request',
            timeout: 20_000,
          },
        ).toBe(404);

        const boardBeforeDelete = await getBoard(
          request,
          tenant,
          managerToken,
          initialBoard.id,
        );
        const deletedBoard = await expectJson<BoardView>(
          await tenantApi(
            request,
            tenant,
            managerToken,
            `/boards/${initialBoard.id}/columns/${managerColumn!.id}?version=${boardBeforeDelete.version}`,
            { method: 'DELETE' },
          ),
          200,
          'Manager deletes the empty test column',
        );
        expect(deletedBoard.version).toBe(boardBeforeDelete.version + 1);
        expect(deletedBoard.columns).not.toContainEqual(
          expect.objectContaining({ id: managerColumn!.id }),
        );
      } finally {
        if (managerToken) {
          if (project && member) {
            await setProjectRole(
              request,
              tenant,
              managerToken,
              project.id,
              member.userId,
              'MEMBER',
            );
          }
          if (createdTaskId) {
            const cleanupTask = await tenantApi(
              request,
              tenant,
              managerToken,
              `/tasks/${createdTaskId}`,
              { method: 'DELETE' },
            );
            expect([204, 404]).toContain(cleanupTask.status());
          }
          if (createdResourceId) {
            const cleanupResource = await tenantApi(
              request,
              tenant,
              managerToken,
              `/resources/${createdResourceId}`,
              { method: 'DELETE' },
            );
            expect([200, 404]).toContain(cleanupResource.status());
          }
          if (project?.boardId) {
            await deleteColumnsByPrefix(
              request,
              tenant,
              managerToken,
              project.boardId,
              artifactPrefix,
            );
          }
        }
        if (foreignManagerToken && foreignResourceId) {
          const cleanupForeignResource = await tenantApi(
            request,
            mismatchedTenant,
            foreignManagerToken,
            `/resources/${foreignResourceId}`,
            { method: 'DELETE' },
          );
          expect([200, 404]).toContain(cleanupForeignResource.status());
        }
        await memberContext?.close();
        await foreignManagerContext?.close();
      }
    });
  }
});

async function tenantApi(
  request: APIRequestContext,
  tenant: TenantCase,
  accessToken: string,
  path: string,
  options: { method?: string; data?: object } = {},
) {
  return request.fetch(new URL(`/api/v1${path}`, gatewayUrl).toString(), {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Host: new URL(tenant.origin).host,
    },
  });
}

function uploadTenantResource(
  request: APIRequestContext,
  tenant: TenantCase,
  accessToken: string,
  name: string,
  content: string,
) {
  return request.post(new URL('/api/v1/resources', gatewayUrl).toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Host: new URL(tenant.origin).host,
    },
    multipart: {
      file: {
        name,
        mimeType: 'text/plain',
        buffer: Buffer.from(content, 'utf8'),
      },
    },
  });
}

async function expectStatus(
  response: HttpResponse,
  expectedStatus: number,
  operation: string,
): Promise<void> {
  expect(response.status(), `${operation}: ${await response.text()}`).toBe(expectedStatus);
}

async function expectJson<T>(
  response: HttpResponse,
  expectedStatus: number,
  operation: string,
): Promise<T> {
  const body = await response.text();
  expect(response.status(), `${operation}: ${body}`).toBe(expectedStatus);
  return JSON.parse(body) as T;
}

async function getBoard(
  request: APIRequestContext,
  tenant: TenantCase,
  accessToken: string,
  boardId: string,
): Promise<BoardView> {
  return expectJson<BoardView>(
    await tenantApi(request, tenant, accessToken, `/boards/${boardId}`),
    200,
    'Get board',
  );
}

async function setProjectRole(
  request: APIRequestContext,
  tenant: TenantCase,
  managerToken: string,
  projectId: string,
  userId: string,
  role: 'MEMBER' | 'VIEWER',
): Promise<void> {
  await expectStatus(
    await tenantApi(
      request,
      tenant,
      managerToken,
      `/projects/${projectId}/members/${userId}`,
      { method: 'PUT', data: { role } },
    ),
    200,
    `Set project role to ${role}`,
  );
}

async function assertColumnMutationsForbidden(
  request: APIRequestContext,
  tenant: TenantCase,
  accessToken: string,
  board: BoardView,
  targetColumnId: string,
  deniedColumnName: string,
): Promise<void> {
  const operations = [
    tenantApi(request, tenant, accessToken, `/boards/${board.id}/columns`, {
      method: 'POST',
      data: { name: deniedColumnName, version: board.version },
    }),
    tenantApi(request, tenant, accessToken, `/boards/${board.id}/columns/${targetColumnId}`, {
      method: 'PATCH',
      data: { name: deniedColumnName, version: board.version },
    }),
    tenantApi(request, tenant, accessToken, `/boards/${board.id}/columns/order`, {
      method: 'PUT',
      data: { columnIds: board.columns.map((column) => column.id), version: board.version },
    }),
    tenantApi(
      request,
      tenant,
      accessToken,
      `/boards/${board.id}/columns/${targetColumnId}?version=${board.version}`,
      { method: 'DELETE' },
    ),
  ];
  const responses = await Promise.all(operations);
  for (const response of responses) {
    await expectStatus(response, 403, 'Non-Manager column mutation');
  }
}

async function deleteColumnsByPrefix(
  request: APIRequestContext,
  tenant: TenantCase,
  managerToken: string,
  boardId: string,
  prefix: string,
): Promise<void> {
  let board = await getBoard(request, tenant, managerToken, boardId);
  const testColumns = board.columns.filter((column) => column.name.startsWith(prefix));
  for (const column of testColumns) {
    board = await expectJson<BoardView>(
      await tenantApi(
        request,
        tenant,
        managerToken,
        `/boards/${boardId}/columns/${column.id}?version=${board.version}`,
        { method: 'DELETE' },
      ),
      200,
      `Delete leftover test column ${column.name}`,
    );
  }
}

function rejectTokenOnForeignHost(
  request: APIRequestContext,
  tenant: TenantCase,
  accessToken: string,
) {
  // APIRequestContext is intentionally used instead of browser fetch: a
  // cross-origin preflight must not hide the backend's host/token decision.
  // Node does not resolve arbitrary *.localhost names consistently, so the
  // request reaches the loopback gateway while preserving the tenant Host.
  return request.get(new URL('/api/v1/projects', gatewayUrl).toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Host: new URL(tenant.origin).host,
    },
  });
}
