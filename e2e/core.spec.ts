import { test, expect } from '@playwright/test'

test.describe('core features', () => {
  test('protects the dashboard from unauthenticated users', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/signin/)

    await context.close()
  })

  test('renders the marketing landing publicly at the index route', async ({ browser }) => {
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

  test('shows the team plan in the account menu', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByTestId('account-menu').locator('summary').click()
    await expect(page.getByText('Team', { exact: true })).toBeVisible()
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

  test('shows pricing tiers and hides the free-tier usage counter for paid plans', async ({
    page
  }) => {
    await page.goto('/billing')
    await expect(page.getByRole('heading', { name: 'Plans & usage' })).toBeVisible()
    await expect(page.getByText('$0/mo', { exact: false })).toBeVisible()
    await expect(page.getByText('$29/mo', { exact: false })).toBeVisible()
    await expect(page.getByText('$79/mo', { exact: false })).toBeVisible()
    await expect(page.getByTestId('usage-counter')).toHaveCount(0)
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

    // Screen 1 lists hypotheses grounded in competitors, each with a recommended challenger
    await expect(page.getByTestId('benchmarked-against')).toContainText('Linear')
    await expect(page.getByText('Ship faster: cut your release cycle from').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Set up test' }).first()).toBeVisible()

    // Appears in dashboard history
    await page.goto('/dashboard')
    await expect(page.getByTestId('analysis-history').getByText(url)).toBeVisible()
  })

  test('sets up a test on a hypothesis, launches it, and records tracked events', async ({
    page
  }) => {
    const url = `https://example.com/?t=${Date.now()}-exp`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)

    // Go to the run-a-test screen for the top hypothesis
    await page.getByRole('link', { name: 'Set up test' }).first().click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+\/tests\/[0-9a-f-]+$/)

    // Launch the test; the response carries the embed key + experiment id
    const [launchResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith('/api/experiments') && r.request().method() === 'POST'
      ),
      page.getByTestId('launch-experiment').click()
    ])
    expect(launchResponse.ok()).toBeTruthy()
    const { embedKey, experiment } = await launchResponse.json()

    await expect(page.getByTestId('experiment-panel')).toBeVisible()

    // Simulate the snippet firing an impression + conversion on the variant arm.
    // Use an absolute URL so the API request resolves against the origin, not the page path.
    const origin = new URL(page.url()).origin
    for (const type of ['impression', 'conversion']) {
      const res = await page.request.post(`${origin}/api/track/event`, {
        headers: { 'Content-Type': 'text/plain' },
        data: JSON.stringify({ key: embedKey, experimentId: experiment.id, arm: 'variant', type })
      })
      expect(res.status()).toBe(204)
    }

    // Reload and confirm the counters landed on the variant arm
    await page.reload()
    await expect(page.getByTestId('experiment-panel')).toContainText('1 / 1')
  })
})
