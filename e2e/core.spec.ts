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

  test('shows the plan badge in the account menu', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByTestId('account-menu').locator('summary').click()
    await expect(page.getByText('Solo', { exact: true })).toBeVisible()
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

  test('shows purchasable tiers and hides the free-tier usage counter for paid plans', async ({
    page
  }) => {
    await page.goto('/billing')
    await expect(page.getByRole('heading', { name: 'Plans & usage' })).toBeVisible()
    await expect(page.getByText('$0/mo', { exact: false })).toBeVisible()
    await expect(page.getByText('$29/mo', { exact: false })).toBeVisible()
    await expect(page.getByTestId('usage-counter')).toHaveCount(0)
    // Paid plans have no monthly allowance, so the gate banner never appears for them
    await page.goto('/dashboard')
    await expect(page.getByTestId('usage-banner')).toHaveCount(0)
  })

  test('sells exactly the free and solo tiers publicly', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/')
    await expect(page.getByText('$0', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('$29', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Team', { exact: true })).toHaveCount(0)
    await expect(page.getByText('$79', { exact: false })).toHaveCount(0)

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
    await expect(
      page.getByRole('link', { name: 'Analisar minha landing page' }).first()
    ).toBeVisible()
    await expect(page.getByText('Analyze your landing page')).toHaveCount(0)

    await context.close()
  })

  test('refuses checkout for a plan that does not exist', async ({ page }) => {
    await page.goto('/billing')
    const origin = new URL(page.url()).origin

    const res = await page.request.post(`${origin}/api/billing/checkout`, {
      data: { plan: 'team' }
    })
    expect(res.status()).toBe(422)
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

  test('ranks the top ideas as full cards, collapses the backlog, and re-sorts on demand', async ({
    page
  }) => {
    const url = `https://example.com/?t=${Date.now()}-ranking`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)

    // Six fixture hypotheses: three expanded, the rest collapsed into scannable rows
    await expect(page.getByTestId('hypothesis-card')).toHaveCount(3)
    await expect(page.getByTestId('hypothesis-row')).toHaveCount(3)

    const top = page.getByTestId('hypothesis-card').first()
    await expect(top).toContainText('The headline describes the product category')
    await expect(top).toContainText('Test this first')

    // Sorting by effort reorders the list, and retires the recommendation with it
    await page.getByRole('button', { name: 'Effort', exact: true }).click()
    await expect(page.getByTestId('hypothesis-card').first()).toContainText(
      'The primary CTA is generic'
    )
    await expect(page.getByText('Test this first')).toHaveCount(0)
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

    // Structural fixes sit above the copy tests and carry steps, not a challenger
    const playbook = page.getByTestId('flow-playbook')
    await expect(playbook).toBeVisible()
    await expect(playbook.getByTestId('flow-fix')).toHaveCount(4)
    await expect(playbook.getByRole('heading', { name: 'Offer login with Google' })).toBeVisible()
    await expect(
      playbook.getByText('Add a "Continue with Google" button above the email field on the signup form')
    ).toBeVisible()
    // Nothing here is A/B testable, so no fix may offer a test button
    await expect(playbook.getByRole('link', { name: 'Set up test' })).toHaveCount(0)

    const origin = new URL(page.url()).origin
    const analysisId = page.url().split('/').pop()
    const detail = await page.request.get(`${origin}/api/analyses/${analysisId}`)
    const { analysis } = await detail.json()

    // The playbook is the outreach hook: fully visible on the public report, never behind the wall
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const anon = await context.newPage()
    await anon.goto(`/r/${analysis.embedKey}`)
    await expect(anon.getByTestId('flow-playbook').getByTestId('flow-fix')).toHaveCount(4)

    await context.close()
  })

  test('opens a past analysis by clicking its dashboard history entry', async ({ page }) => {
    const url = `https://example.com/?t=${Date.now()}-open`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)
    const analysisUrl = page.url()

    // Back to history, then open it from the list. The whole card is one overlay link, so the
    // click target is the link itself, not the URL text it sits on top of.
    await page.goto('/dashboard')
    await page.getByRole('link', { name: `Open analysis for ${url}` }).click()
    await expect(page).toHaveURL(analysisUrl)
    await expect(page.getByRole('heading', { name: 'Your test ideas' })).toBeVisible()
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

  test('launches with a conversion goal preselected and snapshots it on the experiment', async ({
    page
  }) => {
    const url = `https://example.com/?t=${Date.now()}-goal`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)

    await page.getByRole('link', { name: 'Set up test' }).first().click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+\/tests\/[0-9a-f-]+$/)

    // A scraped CTA is offered and preselected, so a test can never launch goal-less by default
    const goalInput = page.getByTestId('goal-selector')
    await expect(goalInput).toHaveValue('[data-hunch-cta]')
    await expect(page.getByTestId('goal-warning')).toHaveCount(0)

    // Clearing it surfaces the warning that the test could never produce a result
    await goalInput.fill('')
    await expect(page.getByTestId('goal-warning')).toBeVisible()

    await goalInput.fill('[data-hunch-cta]')
    const [launchResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith('/api/experiments') && r.request().method() === 'POST'
      ),
      page.getByTestId('launch-experiment').click()
    ])
    const { experiment } = await launchResponse.json()
    expect(experiment.goalSelector).toBe('[data-hunch-cta]')

    // A goal is set, so the panel does not warn about missing conversions
    await expect(page.getByTestId('experiment-panel')).toBeVisible()
    await expect(page.getByTestId('experiment-no-goal')).toHaveCount(0)
  })

  test('fills in the two alternate challengers on demand', async ({ page }) => {
    const url = `https://example.com/?t=${Date.now()}-alt`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)

    await page.getByRole('link', { name: 'Set up test' }).first().click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+\/tests\/[0-9a-f-]+$/)

    // The analysis only writes the recommendation, so the screen fetches the rest on open
    await expect(page.getByRole('button', { name: /Variant A \(recommended\)/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Variant B' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Variant C' })).toBeVisible()
    await expect(page.getByTestId('alternates-loading')).toHaveCount(0)

    // Selecting an alternate swaps the editable copy
    await page.getByRole('button', { name: 'Variant B' }).click()
    await expect(page.getByTestId('challenger-copy')).not.toHaveValue('')

    // Idempotent: a reload must not append a second set of alternates
    await page.reload()
    await expect(page.getByRole('button', { name: /^Variant [A-C]/ })).toHaveCount(3)
  })

  test('serves the public report and captures a waitlist lead behind the wall', async ({
    page,
    browser
  }) => {
    const url = `https://example.com/?t=${Date.now()}-report`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)

    const origin = new URL(page.url()).origin
    const analysisId = page.url().split('/').pop()
    const detail = await page.request.get(`${origin}/api/analyses/${analysisId}`)
    const { analysis } = await detail.json()

    // The report is public: read it with no session at all
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const anon = await context.newPage()
    await anon.goto(`/r/${analysis.embedKey}`)

    await expect(anon.getByRole('heading', { name: /tests to lift your conversion/ })).toBeVisible()
    await expect(anon.getByText(url)).toBeVisible()

    // The fixture has more hypotheses than the preview limit, so the rest sit behind the wall
    const wall = anon.getByRole('heading', { name: /more high-impact tests? (is|are) ready/ })
    await expect(wall).toBeVisible()

    const email = `lead-${Date.now()}@example.com`
    await anon.fill('input[type="email"]', email)
    const [waitlistResponse] = await Promise.all([
      anon.waitForResponse((r) => r.url().endsWith('/api/waitlist')),
      anon.getByRole('button', { name: 'Join the waitlist' }).click()
    ])
    expect(waitlistResponse.status()).toBe(201)
    await expect(anon.getByText('You are on the list. We will be in touch.')).toBeVisible()

    await context.close()

    // The lead is readable by the operator instead of vanishing into the table
    await page.goto('/admin/leads')
    await expect(page.getByRole('heading', { name: /Waitlist leads/ })).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()
  })

  test('hides the leads view from non-admins', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/admin/leads')
    await expect(page).toHaveURL(/\/auth\/signin/)

    await context.close()
  })
})
