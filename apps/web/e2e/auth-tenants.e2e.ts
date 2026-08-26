import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

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
    slug: string;
    placement: Placement;
  };
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
const email = requiredEnvironment('E2E_OWNER_EMAIL', 'DEMO_OWNER_EMAIL');
const password = requiredEnvironment('E2E_OWNER_PASSWORD', 'DEMO_OWNER_PASSWORD');

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

async function loginAndSelectTenant(page: Page, tenant: TenantCase): Promise<string> {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Chào mừng trở lại' })).toBeVisible();

  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);

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

    test(`${tenant.label} login/select flow rejects its token on ${mismatchedTenant.label} host`, async ({
      page,
      request,
    }) => {
      const accessToken = await loginAndSelectTenant(page, tenant);
      const mismatchResponse = await rejectTokenOnForeignHost(
        request,
        mismatchedTenant,
        accessToken,
      );

      expect(
        mismatchResponse.status(),
        `Token for ${tenant.slug} was not rejected by ${mismatchedTenant.slug}: ${await mismatchResponse.text()}`,
      ).toBe(403);
    });
  }
});

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
