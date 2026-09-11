import { test as setup, expect } from '@playwright/test'
import { setQuota } from '@/lib/quota'
import { pinEnglish } from './locale'
import { E2E_QUOTA } from '../playwright.config'

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

  // Before the first navigation, so the state this saves carries it. See e2e/locale.ts.
  await pinEnglish(page.context())

  await page.goto('/auth/signin')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button:has-text("Sign in as admin")')

  await page.waitForURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Your pages' })).toBeVisible()

  await page.context().storageState({ path: authFile })

  // Through the same function the operator screen uses, never by updating the column directly.
  await setQuota(email, E2E_QUOTA)

  // `next dev` compiles a route the first time it is hit, and creating an analysis crosses three of
  // them. Paying it here, once, outside any test's timeout.
  await page.reload()
  await page.fill('input[name="url"]', `https://example.com/?t=${Date.now()}-warmup`)
  await page.getByRole('button', { name: 'Analyze' }).click()
  await page.waitForURL(/\/r\/[0-9a-f-]+$/, { timeout: 120_000 })
})
