import { defineConfig, devices } from '@playwright/test'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const PORT = Number(process.env.E2E_PORT) || 3100
export const E2E_BASE_URL = `http://localhost:${PORT}`
const baseURL = E2E_BASE_URL

// The suite signs in as the admin and then runs analyses, and an analysis counts against the monthly
// quota for everyone, admin included. High, because every run in the same month adds to the count.
export const E2E_QUOTA = 1000

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
  // The same cost lands on individual assertions, and 5s is under it: the first client navigation
  // into /r/ compiles before it answers.
  expect: { timeout: 20_000 },
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
      BRAND_DIR: '.brand-e2e',
      SCREENSHOT_DIR: '.screenshots-e2e',
      // Pinned, so the landing's sample button is exercised rather than depending on whichever
      // analysis the developer's own .env happens to point at.
      SAMPLE_REPORT_EMBED_KEY: '00000000-0000-4000-8000-000000000001'
    }
  }
})
