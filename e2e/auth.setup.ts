import { test as setup, expect } from '@playwright/test'

const authFile = 'e2e/.auth/admin.json'

setup('authenticate as admin', async ({ page }) => {
  // Covers the warm-up below: the per-test default is sized for a compiled app, and this step exists
  // precisely to absorb the compile.
  setup.setTimeout(180_000)

  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to run e2e tests')
  }

  await page.goto('/auth/signin')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button:has-text("Sign in as admin")')

  await page.waitForURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Your clients' })).toBeVisible()

  await page.context().storageState({ path: authFile })

  // `next dev` compiles a route the first time it is hit, and creating an analysis crosses three of
  // them. That cost landed on whichever test ran first, which then blew the per-test timeout while
  // every later test passed -- a failure that looked like a bug in the feature under test and moved
  // whenever the suite was reordered. Paying it here, once, outside any test's timeout.
  await page.fill('input[name="url"]', `https://example.com/?t=${Date.now()}-warmup`)
  await page.getByRole('button', { name: 'Analyze' }).click()
  await page.waitForURL(/\/analyses\/[0-9a-f-]+$/, { timeout: 120_000 })
})
