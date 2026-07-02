import { test as setup, expect } from '@playwright/test'

const authFile = 'e2e/.auth/admin.json'

setup('authenticate as admin', async ({ page }) => {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to run e2e tests')
  }

  await page.goto('/auth/signin')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button:has-text("Sign in as admin")')

  await page.waitForURL((url) => url.pathname === '/')
  await expect(page.getByRole('heading', { name: 'Your analyses' })).toBeVisible()

  await page.context().storageState({ path: authFile })
})
