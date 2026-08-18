import { test, expect, type Page } from '@playwright/test'

async function openCopyTab(page: Page) {
  await page.getByRole('tab', { name: 'Wording' }).click()
}

test.describe('core features', () => {
  test('protects the dashboard from unauthenticated users', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/signin/)

    await context.close()
  })

  test('returns to the requested page after signing in, not to the dashboard', async ({
    browser
  }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/admin/leads')
    await expect(page).toHaveURL(/callbackUrl=%2Fadmin%2Fleads/)

    await page.fill('input[name="email"]', process.env.ADMIN_EMAIL!)
    await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD!)
    await page.click('button:has-text("Sign in as admin")')

    await expect(page).toHaveURL(/\/admin\/leads$/)

    await context.close()
  })

  test('refuses an off-site callbackUrl and falls back to the dashboard', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/auth/signin?callbackUrl=%2F%2Fexample.com')

    await page.fill('input[name="email"]', process.env.ADMIN_EMAIL!)
    await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD!)
    await page.click('button:has-text("Sign in as admin")')

    await expect(page).toHaveURL(/\/dashboard$/)

    await context.close()
  })

  test('renders the marketing landing publicly at the index route', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'Run a report' }).first()).toBeVisible()

    await context.close()
  })

  test('renders the dashboard at /dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Your clients' })).toBeVisible()
    await expect(page.locator('input[name="url"]')).toBeVisible()
  })

  test('shows the plan badge in the account menu', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByTestId('account-menu').locator('summary').click()
    await expect(
      page.getByTestId('account-menu').getByText('Pro', { exact: true })
    ).toBeVisible()
  })

  test('signs out from the account menu', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/admin.json' })
    const page = await context.newPage()

    await page.goto('/dashboard')
    await page.getByTestId('account-menu').locator('summary').click()
    await Promise.all([
      page.waitForURL(/\/auth\/signin/),
      page.getByRole('button', { name: 'Sign out' }).click()
    ])

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/signin/)

    await context.close()
  })

  test('hides the free-tier allowance from paid plans', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Your clients' })).toBeVisible()
    await expect(page.getByTestId('usage-banner')).toHaveCount(0)
  })

  test('publishes no price publicly and offers a way to talk instead', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/')
    await expect(page.getByText(/\$\d/)).toHaveCount(0)

    const contact = page.locator('#contact')
    await expect(contact.getByRole('button', { name: 'Ask for a report' })).toBeVisible()

    await context.close()
  })

  test('renders the landing in pt-BR when the locale cookie is set', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/')
    await context.addCookies([
      { name: 'locale', value: 'pt-BR', url: new URL(page.url()).origin }
    ])
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
    await expect(page.getByRole('link', { name: 'Rodar um relatório' }).first()).toBeVisible()
    await expect(page.getByText('Run a report')).toHaveCount(0)

    await context.close()
  })

  test('analyzes a URL, shows ranked hypotheses with a recommended challenger, and lists it in history', async ({
    page
  }) => {
    const url = `https://example.com/?t=${Date.now()}`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()

    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)

    await expect(page.getByTestId('benchmarked-against')).toContainText('Linear')

    const deliverables = page.getByTestId('deliverables')
    await expect(deliverables.getByText('Interactive report')).toBeVisible()
    await expect(deliverables.getByText('PDF report')).toBeVisible()
    await expect(deliverables.getByRole('button', { name: 'Copy link' })).toBeVisible()
    await expect(deliverables.getByRole('link', { name: 'Open' }).first()).toHaveAttribute(
      'href',
      /\/r\/[0-9a-f-]+$/
    )
    await expect(deliverables.getByRole('link', { name: 'Open' }).last()).toHaveAttribute(
      'href',
      /\/analyses\/[0-9a-f-]+\/report$/
    )

    await openCopyTab(page)
    await expect(page.getByText('Ship faster: releases in').first()).toBeVisible()

    await page.goto('/dashboard')
    const history = page.getByTestId('analysis-history')
    await expect(history.getByText(url)).toBeVisible()
    // Two documents on the client card, and nothing else. Stage 2 is gone.
    await expect(history.getByRole('link', { name: 'Tests' })).toHaveCount(0)
    await expect(page.getByTestId('deliverables-compact').first()).toBeVisible()
  })

  test('writes the two alternate options on demand, from the analysis', async ({ page }) => {
    const url = `https://example.com/?t=${Date.now()}-alt`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)
    await openCopyTab(page)

    const card = page.getByTestId('hypothesis-card').first()
    await expect(card.getByTestId('alternate-variants')).toHaveCount(0)

    // Synchronized on the response rather than the default expect timeout: this is the only test
    // that hits the route, so it always pays `next dev`'s cold compile for it.
    const [written] = await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/hypotheses\/[0-9a-f-]+\/variants$/.test(r.url()) && r.request().method() === 'POST'
      ),
      card.getByTestId('load-alternates').click()
    ])
    expect(written.ok()).toBeTruthy()

    await expect(card.getByTestId('alternate-variants')).toBeVisible()
    await expect(card.getByTestId('load-alternates')).toHaveCount(0)

    // Persisted, not just held in local state.
    await page.reload()
    await openCopyTab(page)
    await expect(
      page.getByTestId('hypothesis-card').first().getByTestId('alternate-variants')
    ).toBeVisible()
  })

  test('ranks the top ideas open and collapses the backlog', async ({ page }) => {
    const url = `https://example.com/?t=${Date.now()}-ranking`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)
    await openCopyTab(page)

    const rows = page.getByTestId('hypothesis-card')
    await expect(rows).toHaveCount(6)
    await expect(page.locator('[data-testid="hypothesis-card"] details[open]')).toHaveCount(3)

    const top = rows.first()
    await expect(top).toContainText('The headline describes the product category')
    await expect(top).toContainText('Start here')

    await top.locator('summary').click()
    await expect(page.locator('[data-testid="hypothesis-card"] details[open]')).toHaveCount(2)

    await top.locator('summary').click()
    await expect(top).toContainText(
      'A specific, quantified outcome in the headline raises perceived value'
    )

    await expect(page.getByTestId('hypothesis-filters')).toHaveCount(0)
  })

  test('shows the flow playbook with implementation steps, and on the public report', async ({
    page,
    browser
  }) => {
    const url = `https://example.com/?t=${Date.now()}-playbook`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)

    const playbook = page.getByTestId('flow-playbook')
    await expect(playbook).toBeVisible()
    await expect(playbook.getByTestId('flow-fix')).toHaveCount(4)
    await expect(playbook.getByRole('heading', { name: 'Offer login with Google' })).toBeVisible()
    await expect(
      playbook.getByText('Add a "Continue with Google" button above the email field on the signup form')
    ).toBeVisible()
    await playbook.getByRole('button', { name: 'Why these are shipped by hand' }).click()
    await expect(playbook.getByRole('tooltip')).toContainText('shipped by hand')

    await page.getByRole('tab', { name: 'Search visibility' }).click()
    const seo = page.getByTestId('seo-playbook')
    await expect(seo).toBeVisible()
    await expect(seo.getByTestId('seo-fix')).toHaveCount(2)
    await expect(seo.getByTestId('flow-fix')).toHaveCount(0)
    await expect(seo.getByRole('heading', { name: 'Write a meta description' })).toBeVisible()

    await page.getByRole('tab', { name: 'AI visibility' }).click()
    const ai = page.getByTestId('ai-playbook')
    await expect(ai).toBeVisible()
    await expect(ai.getByTestId('ai-fix')).toHaveCount(1)
    await expect(ai.getByTestId('seo-fix')).toHaveCount(0)
    await expect(ai.getByRole('heading', { name: 'Add alt text to the product images' })).toBeVisible()

    const origin = new URL(page.url()).origin
    const analysisId = page.url().split('/').pop()
    const detail = await page.request.get(`${origin}/api/analyses/${analysisId}`)
    const { analysis } = await detail.json()

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const anon = await context.newPage()
    await anon.goto(`/r/${analysis.embedKey}`)
    await expect(anon.getByTestId('flow-playbook').getByTestId('flow-fix')).toHaveCount(4)
    await expect(anon.getByRole('button', { name: 'Join the waitlist' })).toHaveCount(0)

    await anon.getByRole('tab', { name: 'AI visibility' }).click()
    await expect(anon.getByTestId('ai-playbook').getByTestId('ai-fix')).toHaveCount(1)

    // Four tabs, all about what to change.
    await expect(anon.getByRole('tab')).toHaveCount(4)

    await anon.getByRole('tab', { name: 'Wording' }).click()
    const preview = anon.getByTestId('variant-preview').first()
    await expect(preview.getByRole('button', { name: 'See how this looks on your page' })).toBeVisible()
    await expect(preview.getByRole('img')).toHaveCount(0)

    await context.close()
  })

  test('opens a past analysis by clicking its dashboard history entry', async ({ page }) => {
    const url = `https://example.com/?t=${Date.now()}-open`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)
    const analysisUrl = page.url()

    await page.goto('/dashboard')
    await page.getByRole('link', { name: `Open analysis for ${url}` }).click()
    await expect(page).toHaveURL(analysisUrl)
    await expect(page.getByRole('heading', { name: 'What to change on this page' })).toBeVisible()
  })

  test('serves a paid report as an unbranded deliverable', async ({ page, browser }) => {
    const url = `https://example.com/?t=${Date.now()}-report`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)

    const origin = new URL(page.url()).origin
    const analysisId = page.url().split('/').pop()
    const detail = await page.request.get(`${origin}/api/analyses/${analysisId}`)
    const { analysis } = await detail.json()

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const anon = await context.newPage()
    await anon.goto(`/r/${analysis.embedKey}`)

    await expect(anon.getByRole('heading', { name: 'example.com', exact: true })).toBeVisible()
    await expect(anon.getByText(url)).toBeVisible()

    await expect(anon.getByRole('button', { name: 'Join the waitlist' })).toHaveCount(0)
    await expect(
      anon.getByRole('heading', { name: /more high-impact tests? (is|are) ready/ })
    ).toHaveCount(0)

    await expect(anon.getByText('Generated by Hunch')).toHaveCount(0)
    await expect(anon.getByTestId('report-brand')).toHaveCount(0)
    await expect(anon).toHaveTitle(/^(?!.*Hunch).*$/)

    await context.close()

    await page.goto(`/analyses/${analysisId}/report`)
    await expect(page.getByRole('heading', { name: 'example.com', exact: true })).toBeVisible()
    await expect(page.getByTestId('report-brand')).toHaveCount(0)
    await expect(page.getByText('Generated by Hunch')).toHaveCount(0)
    await expect(page).toHaveTitle(/^(?!.*Hunch).*$/)
  })

  test('captures a contact lead and shows the operator where it came from', async ({
    page,
    browser
  }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const anon = await context.newPage()
    await anon.goto('/')

    const email = `lead-${Date.now()}@example.com`
    const contact = anon.locator('#contact')
    await contact.locator('input[type="email"]').fill(email)
    const [waitlistResponse] = await Promise.all([
      anon.waitForResponse((r) => r.url().endsWith('/api/waitlist')),
      contact.getByRole('button', { name: 'Ask for a report' }).click()
    ])
    expect(waitlistResponse.status()).toBe(201)
    await expect(contact.getByText('Got it. We will reply to that address today.')).toBeVisible()

    await context.close()

    await page.goto('/admin/leads')
    await expect(page.getByRole('heading', { name: /Waitlist leads/ })).toBeVisible()
    const row = page.locator('tr', { hasText: email })
    await expect(row).toBeVisible()
    await expect(row.getByText('Asked to talk')).toBeVisible()
  })

  test('grants a plan to an account that does not exist yet', async ({ page }) => {
    const email = `buyer-${Date.now()}@example.com`

    await page.goto('/admin/accounts')
    await page.fill('input[name="email"]', email)
    await page.getByRole('button', { name: 'Grant pro' }).first().click()

    const row = page.locator('tr', { hasText: email })
    await expect(row).toBeVisible()
    await expect(row.getByText('Pro')).toBeVisible()
    await expect(row.getByText('Never signed in')).toBeVisible()

    await row.getByRole('button', { name: 'Revoke' }).click()
    await expect(page.locator('tr', { hasText: email }).getByText('Free')).toBeVisible()
  })

  test('hides the accounts view from non-admins', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/admin/accounts')
    await expect(page).toHaveURL(/\/auth\/signin/)

    await context.close()
  })

  test('hides the leads view from non-admins', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/admin/leads')
    await expect(page).toHaveURL(/\/auth\/signin/)

    await context.close()
  })

  test('never shows the upgrade prompt to a paid plan', async ({ page }) => {
    const url = `https://example.com/?t=${Date.now()}-upgrade`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)

    await openCopyTab(page)
    await expect(page.getByTestId('hypothesis-card').first()).toBeVisible()
    await expect(page.getByTestId('upgrade-prompt')).toHaveCount(0)
  })
})

