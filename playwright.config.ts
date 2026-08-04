import { defineConfig, devices } from '@playwright/test'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

// Dedicated port so the suite never collides with (or reuses) a running `npm run dev`,
// which would not have E2E_FIXTURES set.
const PORT = 3100
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
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
    // rather than depending on the developer's .env having it set.
    env: { E2E_FIXTURES: '1', AUTH_URL: baseURL, ALLOW_CREDENTIALS_LOGIN: '1' }
  }
})
