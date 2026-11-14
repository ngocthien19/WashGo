import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  timeout: 60000,
  workers: process.env.CI ? 2 : 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }], ['junit', { outputFile: 'tests/ci/results/e2e.xml' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5180',
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),
    trace: 'retain-on-failure',
    screenshot: 'off'
  },
  webServer: {
    command: 'npm run dev -- --mode e2e --port 5180 --strictPort',
    url: 'http://localhost:5180',
    reuseExistingServer: !process.env.CI
  }
})
