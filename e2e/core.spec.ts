import { test, expect } from '@playwright/test'

test.describe('core features', () => {
  test('protects the dashboard from unauthenticated users', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/signin/)

    await context.close()
  })

  test('renders the home page publicly at the index route', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'Analyze your landing page' }).first()).toBeVisible()

    await context.close()
  })

  test('renders the dashboard at /dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Your analyses' })).toBeVisible()
    await expect(page.locator('input[name="url"]')).toBeVisible()
  })

  test('signs out from the account menu', async ({ browser }) => {
    // Isolated context so signing out here does not disturb the shared auth state
    const context = await browser.newContext({ storageState: 'e2e/.auth/admin.json' })
    const page = await context.newPage()

    await page.goto('/dashboard')
    await page.getByTestId('account-menu').locator('summary').click()
    await Promise.all([
      page.waitForURL(/\/auth\/signin/),
      page.getByRole('button', { name: 'Sign out' }).click()
    ])

    // Signed out: the protected route now redirects to sign-in
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/signin/)

    await context.close()
  })

  test('analyzes a URL, shows ranked hypotheses with a recommended challenger, and lists it in history', async ({
    page
  }) => {
    const url = `https://example.com/?t=${Date.now()}`

    // Analyze
    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()

    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)

    // Lists hypotheses grounded in competitors, each with a recommended challenger
    await expect(page.getByTestId('benchmarked-against')).toContainText('Linear')
    await expect(page.getByText('Recommended challenger').first()).toBeVisible()
    await expect(page.getByText('Ship faster: cut your release cycle from').first()).toBeVisible()

    // Appears in dashboard history
    await page.goto('/dashboard')
    await expect(page.getByTestId('analysis-history').getByText(url)).toBeVisible()
  })
})
