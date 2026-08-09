import { test, expect, type Page } from '@playwright/test'
import { E2E_CRON_SECRET } from '../playwright.config'

function track(page: Page, origin: string, body: Record<string, string>) {
  return page.request.post(`${origin}/api/track/event`, {
    headers: { 'Content-Type': 'text/plain' },
    data: JSON.stringify(body)
  })
}

function hostPage(headline: string, embedKey: string) {
  return `<!doctype html><html><body>
    <h1>${headline}</h1>
    <button data-hunch-cta>Start free</button>
    <script src="/embed.js" data-key="${embedKey}"></script>
  </body></html>`
}

async function openCopyTab(page: Page) {
  await page.getByRole('tab', { name: 'Copy' }).click()
}

async function startFirstTest(page: Page) {
  await page.getByRole('tab', { name: 'Tests' }).click()
  await page.getByRole('link', { name: 'Set up test' }).first().click()
  await page.waitForURL(/\/analyses\/[0-9a-f-]+\/tests\/[0-9a-f-]+$/)
}

async function launchTest(page: Page, tag: string) {
  await page.goto('/dashboard')
  await page.fill('input[name="url"]', `https://example.com/?t=${Date.now()}-${tag}`)
  await page.getByRole('button', { name: 'Analyze' }).click()
  await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)

  await startFirstTest(page)

  const [launchResponse] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().endsWith('/api/experiments') && r.request().method() === 'POST'
    ),
    page.getByTestId('launch-experiment').click()
  ])

  const { embedKey, experiment } = await launchResponse.json()
  return { embedKey, experiment, origin: new URL(page.url()).origin }
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
    await expect(page.getByText('Pro', { exact: true })).toBeVisible()
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
    await expect(page.getByTestId('analysis-history')).toBeVisible()
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

    await expect(page.getByRole('button', { name: 'Copy report link' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Print report' })).toHaveAttribute(
      'href',
      /\/analyses\/[0-9a-f-]+\/report$/
    )

    await openCopyTab(page)
    await expect(page.getByText('Ship faster: releases in').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Set up test' })).toHaveCount(0)

    await page.getByRole('tab', { name: 'Tests' }).click()
    const tests = page.getByTestId('test-list')
    await expect(tests.getByText('Install the tracking snippet')).toBeVisible()
    await expect(tests.getByTestId('test-row').first()).toBeVisible()
    await expect(tests.getByRole('link', { name: 'Set up test' }).first()).toBeVisible()

    await page.goto('/dashboard')
    await expect(page.getByTestId('analysis-history').getByText(url)).toBeVisible()
  })

  test('ranks the top ideas open, collapses the backlog, and re-sorts on demand', async ({
    page
  }) => {
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
    await expect(top).toContainText('Test this first')

    await top.locator('summary').click()
    await expect(page.locator('[data-testid="hypothesis-card"] details[open]')).toHaveCount(2)

    await top.locator('summary').click()
    await expect(top).toContainText(
      'A specific, quantified outcome in the headline raises perceived value'
    )

    await page.getByRole('button', { name: 'Effort', exact: true }).click()
    await expect(rows.first()).toContainText('The primary CTA is generic')
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

    const playbook = page.getByTestId('flow-playbook')
    await expect(playbook).toBeVisible()
    await expect(playbook.getByTestId('flow-fix')).toHaveCount(4)
    await expect(playbook.getByRole('heading', { name: 'Offer login with Google' })).toBeVisible()
    await expect(
      playbook.getByText('Add a "Continue with Google" button above the email field on the signup form')
    ).toBeVisible()
    await expect(playbook.getByRole('link', { name: 'Set up test' })).toHaveCount(0)

    await playbook.getByRole('button', { name: 'Why these have no test button' }).click()
    await expect(playbook.getByRole('tooltip')).toContainText('nothing for the snippet to swap')

    await page.getByRole('tab', { name: 'SEO' }).click()
    const seo = page.getByTestId('seo-playbook')
    await expect(seo).toBeVisible()
    await expect(seo.getByTestId('seo-fix')).toHaveCount(2)
    await expect(seo.getByTestId('flow-fix')).toHaveCount(0)
    await expect(seo.getByRole('heading', { name: 'Write a meta description' })).toBeVisible()

    await page.getByRole('tab', { name: 'Found by AI' }).click()
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

    await anon.getByRole('tab', { name: 'Found by AI' }).click()
    await expect(anon.getByTestId('ai-playbook').getByTestId('ai-fix')).toHaveCount(1)

    await expect(anon.getByRole('tab', { name: 'Tests' })).toHaveCount(0)
    await expect(anon.getByTestId('test-list')).toHaveCount(0)

    await anon.getByRole('tab', { name: 'Copy' }).click()
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

    await startFirstTest(page)

    const [launchResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith('/api/experiments') && r.request().method() === 'POST'
      ),
      page.getByTestId('launch-experiment').click()
    ])
    expect(launchResponse.ok()).toBeTruthy()
    const { embedKey, experiment } = await launchResponse.json()

    await expect(page.getByTestId('experiment-panel')).toBeVisible()

    const origin = new URL(page.url()).origin
    const visitorId = crypto.randomUUID()
    for (const type of ['impression', 'conversion']) {
      const res = await track(page, origin, {
        key: embedKey,
        experimentId: experiment.id,
        arm: 'variant',
        type,
        visitorId
      })
      expect(res.status()).toBe(204)
    }

    await page.reload()
    await expect(page.getByTestId('experiment-panel')).toContainText('1 / 1')

    for (const type of ['impression', 'conversion']) {
      const replay = await track(page, origin, {
        key: embedKey,
        experimentId: experiment.id,
        arm: 'variant',
        type,
        visitorId
      })
      expect(replay.status()).toBe(204)
    }

    const anonymous = await track(page, origin, {
      key: embedKey,
      experimentId: experiment.id,
      arm: 'variant',
      type: 'conversion'
    })
    expect(anonymous.status()).toBe(204)

    await page.reload()
    await expect(page.getByTestId('experiment-panel')).toContainText('1 / 1')
  })

  test('launches with the chosen 7 or 30 day window and dates the end from it', async ({ page }) => {
    for (const days of [7, 30]) {
      const url = `https://example.com/?t=${Date.now()}-dur${days}`

      await page.goto('/dashboard')
      await page.fill('input[name="url"]', url)
      await page.getByRole('button', { name: 'Analyze' }).click()
      await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)

      await startFirstTest(page)

      await page.getByTestId(`duration-${days}`).click()
      const [launchResponse] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().endsWith('/api/experiments') && r.request().method() === 'POST'
        ),
        page.getByTestId('launch-experiment').click()
      ])

      const { experiment } = await launchResponse.json()
      expect(experiment.durationDays).toBe(days)

      const window = new Date(experiment.endsAt).getTime() - new Date(experiment.startedAt).getTime()
      expect(Math.round(window / 86_400_000)).toBe(days)
    }
  })

  test('serves the running experiment to the snippet and nothing to an unknown key', async ({
    page
  }) => {
    const url = `https://example.com/?t=${Date.now()}-config`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)

    await startFirstTest(page)

    const [launchResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith('/api/experiments') && r.request().method() === 'POST'
      ),
      page.getByTestId('launch-experiment').click()
    ])
    const { embedKey, experiment } = await launchResponse.json()

    const origin = new URL(page.url()).origin
    const config = await page.request.get(`${origin}/api/track/config?key=${embedKey}`)
    expect(config.ok()).toBeTruthy()
    const { experiments } = await config.json()

    const served = experiments.find((e: { experimentId: string }) => e.experimentId === experiment.id)
    expect(served).toBeTruthy()
    expect(served.controlCopy).toBe(experiment.controlCopy)
    expect(served.variantCopy).toBe(experiment.variantCopy)
    expect(served.goalSelector).toBe(experiment.goalSelector)

    const unknown = await page.request.get(`${origin}/api/track/config?key=${crypto.randomUUID()}`)
    expect(unknown.ok()).toBeTruthy()
    expect((await unknown.json()).experiments).toEqual([])
  })

  test('leaves the launch form reachable after a test is stopped', async ({ page }) => {
    const url = `https://example.com/?t=${Date.now()}-relaunch`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)

    await startFirstTest(page)
    await page.getByTestId('launch-experiment').click()
    await expect(page.getByTestId('experiment-panel')).toBeVisible()

    await expect(page.getByTestId('relaunch-experiment')).toHaveCount(0)
    await page.getByRole('button', { name: 'Stop' }).click()
    await page.getByTestId('relaunch-experiment').click()

    const [second] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith('/api/experiments') && r.request().method() === 'POST'
      ),
      page.getByTestId('launch-experiment').click()
    ])
    expect(second.status()).toBe(201)
    await expect(page.getByTestId('experiment-panel')).toBeVisible()
  })

  test('swaps the copy and counts a conversion when the snippet runs on a real page', async ({
    page
  }) => {
    const { embedKey, experiment, origin } = await launchTest(page, 'embed')

    const host = `${origin}/__e2e/host`
    await page.route(host, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: hostPage(experiment.controlCopy, embedKey)
      })
    )

    await page.addInitScript(
      ([id]) => window.localStorage.setItem(`hunch_exp_${id}`, 'variant'),
      [experiment.id]
    )

    await page.goto(host)
    await expect(page.locator('h1')).toHaveText(experiment.variantCopy)

    await Promise.all([
      page.waitForRequest(
        (r) => r.url().endsWith('/api/track/event') && r.postData()!.includes('conversion')
      ),
      page.click('[data-hunch-cta]')
    ])

    await page.goto(`${origin}/analyses/${experiment.analysisId}/tests/${experiment.hypothesisId}`)
    await expect(page.getByTestId('experiment-panel')).toContainText('1 / 1')
  })

  test('records nothing when the control copy is not on the page', async ({ page }) => {
    const { embedKey, experiment, origin } = await launchTest(page, 'embed-drift')

    const host = `${origin}/__e2e/drifted`
    await page.route(host, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: hostPage('A completely different headline than the one under test', embedKey)
      })
    )

    const events: string[] = []
    page.on('request', (r) => {
      if (r.url().endsWith('/api/track/event')) events.push(r.url())
    })

    await page.addInitScript(
      ([id]) => window.localStorage.setItem(`hunch_exp_${id}`, 'variant'),
      [experiment.id]
    )

    await page.goto(host)
    await page.click('[data-hunch-cta]')
    await page.waitForTimeout(4000)

    expect(events).toEqual([])

    await page.goto(`${origin}/analyses/${experiment.analysisId}/tests/${experiment.hypothesisId}`)
    await expect(page.getByTestId('experiment-panel')).toContainText('0 / 0')
  })

  test('guards the finalize cron behind its secret', async ({ request }) => {
    const anonymous = await request.get('/api/cron/finalize-experiments')
    expect(anonymous.status()).toBe(401)

    const wrong = await request.get('/api/cron/finalize-experiments', {
      headers: { Authorization: 'Bearer not-the-secret' }
    })
    expect(wrong.status()).toBe(401)

    const authorized = await request.get('/api/cron/finalize-experiments', {
      headers: { Authorization: `Bearer ${E2E_CRON_SECRET}` }
    })
    expect(authorized.ok()).toBeTruthy()
    expect(typeof (await authorized.json()).finalized).toBe('number')
  })

  test('launches with a conversion goal preselected and snapshots it on the experiment', async ({
    page
  }) => {
    const url = `https://example.com/?t=${Date.now()}-goal`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)

    await startFirstTest(page)

    const goalInput = page.getByTestId('goal-selector')
    await expect(goalInput).toHaveValue('[data-hunch-cta]')
    await expect(page.getByTestId('goal-warning')).toHaveCount(0)

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

    await expect(page.getByTestId('experiment-panel')).toBeVisible()
    await expect(page.getByTestId('experiment-no-goal')).toHaveCount(0)
  })

  test('fills in the two alternate challengers on demand', async ({ page }) => {
    const url = `https://example.com/?t=${Date.now()}-alt`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/analyses\/[0-9a-f-]+$/)

    await startFirstTest(page)

    await expect(page.getByRole('button', { name: /Variant A \(recommended\)/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Variant B' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Variant C' })).toBeVisible()
    await expect(page.getByTestId('alternates-loading')).toHaveCount(0)

    await page.getByRole('button', { name: 'Variant B' }).click()
    await expect(page.getByTestId('challenger-copy')).not.toHaveValue('')

    await page.reload()
    await expect(page.getByRole('button', { name: /^Variant [A-C]/ })).toHaveCount(3)
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

    await expect(anon.getByRole('heading', { name: /tests to lift your conversion/ })).toBeVisible()
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
    await expect(page.getByRole('heading', { name: /tests to lift your conversion/ })).toBeVisible()
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
