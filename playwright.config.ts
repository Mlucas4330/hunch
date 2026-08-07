import { defineConfig, devices } from '@playwright/test'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

// Dedicated port so the suite never collides with (or reuses) a running `npm run dev`,
// which would not have E2E_FIXTURES set. Overridable because 3100 is only dedicated by convention:
// a second suite, or another checkout of this repo, wants its own port rather than a port fight
// whose failure mode is a torn-down server midway through someone else's run.
const PORT = Number(process.env.E2E_PORT) || 3100
const baseURL = `http://localhost:${PORT}`

// Exported so the spec asserting the cron route presents the same secret the server was booted with.
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
    // Not 'on-first-retry': retries stay 0 so a flaky test is never silently absorbed, which means
    // there is no first retry and that setting recorded nothing.
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    // e2e/dom holds specs that drive a browser function against synthetic markup: no session, no
    // request to the app, no database row. They deliberately do NOT depend on `setup` -- a broken
    // database or an expired credentials hatch must not be able to hide a regression in the DOM
    // routines, which are the least forgiving code in the repo and the cheapest to check.
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
    // The suite signs in through the credentials escape hatch, so it turns that on for itself
    // rather than depending on the developer's .env having it set. CRON_SECRET is set here for the
    // same reason: without it the finalize route answers 401 to every caller and its authorized
    // path could never be asserted.
    env: {
      E2E_FIXTURES: '1',
      AUTH_URL: baseURL,
      ALLOW_CREDENTIALS_LOGIN: '1',
      CRON_SECRET: E2E_CRON_SECRET
    }
  }
})
