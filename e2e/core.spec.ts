import { test, expect } from '@playwright/test'

test.describe('core features', () => {
  test('protects the dashboard from unauthenticated users', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/signin/)

    await context.close()
  })

  test('renders the dashboard at the index route', async ({ page }) => {
    await page.goto('/')
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

    await page.goto('/')
    await page.getByTestId('account-menu').locator('summary').click()
    await Promise.all([
      page.waitForURL(/\/auth\/signin/),
      page.getByRole('button', { name: 'Sign out' }).click()
    ])

    // Signed out: the protected route now redirects to sign-in
    await page.goto('/')
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

  test('analyzes a URL, picks a winner through the circuit, and lists it in history', async ({
    page
  }) => {
    const url = `https://example.com/?t=${Date.now()}`

    // Analyze
    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()

    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)

    // First circuit step shows the section options from the deterministic fixture
    const step = page.getByTestId('circuit-step')
    await expect(step).toBeVisible()

    // Variants are grounded in competitors: benchmark line + per-variant evidence
    await expect(page.getByTestId('benchmarked-against')).toContainText('Linear')
    const winningOption = page
      .getByTestId('option-card')
      .filter({ hasText: 'Ship faster: cut your release cycle from' })
    await expect(winningOption).toBeVisible()
    await expect(winningOption.getByTestId('option-evidence')).toContainText('Linear')

    // Selecting an option persists it as the variant winner and advances
    const [variantResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/variants/') && r.request().method() === 'PATCH'
      ),
      winningOption.click()
    ])
    expect(variantResponse.ok()).toBeTruthy()

    // Jump to the summary via the last circuit node; it lists the chosen copy + export
    await page.getByTestId('circuit-node').last().click()
    const summary = page.getByTestId('summary')
    await expect(summary).toBeVisible()
    await expect(summary.getByText('Ship faster: cut your release cycle from')).toBeVisible()
    await expect(page.getByTestId('summary-copy')).toBeVisible()
    await expect(page.getByTestId('summary-download')).toBeVisible()

    // Choice persisted: reload, reopen the first step, the option stays selected
    await page.reload()
    await expect(
      page
        .getByTestId('option-card')
        .filter({ hasText: 'Ship faster: cut your release cycle from' })
    ).toHaveAttribute('aria-pressed', 'true')

    // Appears in dashboard history
    await page.goto('/dashboard')
    await expect(page.getByTestId('analysis-history').getByText(url)).toBeVisible()
  })
})
