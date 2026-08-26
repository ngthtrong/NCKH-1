import { defineConfig, devices } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const environmentFile = process.env.E2E_ENV_FILE;

if (environmentFile) {
  process.loadEnvFile(resolve(projectRoot, environmentFile));
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  outputDir: 'test-results',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL:
      process.env.E2E_ACCOUNTS_URL ??
      process.env.PUBLIC_ACCOUNTS_URL ??
      'http://accounts.localhost:8080',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    locale: 'vi-VN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
