import { defineConfig, devices } from '@playwright/test'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const PORT = Number(process.env.E2E_PORT) || 3100
const baseURL = `http://localhost:${PORT}`

export const E2E_CRON_SECRET = 'e2e-cron-secret'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'dom',
      testMatch: /dom[\\/].*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'chromium',
      testIgnore: /dom[\\/]/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
      dependencies: ['setup']
    }
  ],
  webServer: {
    command: `next dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      E2E_FIXTURES: '1',
      AUTH_URL: baseURL,
      ALLOW_CREDENTIALS_LOGIN: '1',
      CRON_SECRET: E2E_CRON_SECRET
    }
  }
})
