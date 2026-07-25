// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8787',
    trace: 'on-first-retry',
    headless: true,
  },
  webServer: {
    command: 'npx serve dist -p 8787 --no-clipboard',
    url: 'http://localhost:8787',
    reuseExistingServer: !process.env.CI,
    cwd: '.',
    timeout: 15000,
  },
});
