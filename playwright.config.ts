import { defineConfig, devices } from '@playwright/test'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const PORT = Number(process.env.E2E_PORT) || 3100
const baseURL = `http://localhost:${PORT}`

export const E2E_CRON_SECRET = 'e2e-cron-secret'

// The suite signs in as the admin and then runs analyses, and **an analysis spends a credit for
// everyone, admin included** — there is no exemption by role and there must not be one, or the suite
// would stop covering the path that charges. So the setup buys the run a balance. Comfortably above
// the handful the specs create, because running out shows up as a navigation that never happens
// rather than as anything naming credits.
export const E2E_CREDITS = 50

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  // Playwright's 30s default assumes a built app. These run against `next dev`, where the first hit
  // on a route still pays for its compile even with the warm-up in auth.setup.ts.
  timeout: 60_000,
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
