import { test, expect, type Page } from '@playwright/test'
import { pinEnglish } from './locale'

// The four error lists are stacked `<details>` sections, so opening one is a click on its own bar and
// never closes another. Idempotent on purpose: `ai` starts open and the rest start closed.
async function openSection(page: Page, section: 'flow' | 'copy' | 'seo' | 'ai') {
  const panel = page.getByTestId(`analysis-section-${section}`)
  // `.first()` is load bearing: the cards inside a section are `<details>` of their own.
  const panelDetails = panel.locator('details').first()
  const open = await panelDetails.evaluate((el) => (el as HTMLDetailsElement).open)
  if (!open) await panel.locator('summary').first().click()
}

async function analyze(page: Page, suffix: string): Promise<string> {
  const url = `https://example.com/?t=${Date.now()}-${suffix}`
  await page.goto('/dashboard')
  await page.fill('input[name="url"]', url)
  await page.getByRole('button', { name: 'Analyze' }).click()
  await page.waitForURL(/\/r\/[0-9a-f-]+$/)
  return url
}

test.describe('core features', () => {
  test('protects the dashboard from unauthenticated users', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    await pinEnglish(context)
    const page = await context.newPage()

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/signin/)

    await context.close()
  })

  test('returns to the requested page after signing in, not to the dashboard', async ({
    browser
  }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    await pinEnglish(context)
    const page = await context.newPage()

    // `/analyses` is a protected prefix with no page of its own; the URL is the whole assertion.
    await page.goto('/analyses')
    await expect(page).toHaveURL(/callbackUrl=%2Fanalyses/)

    await page.fill('input[name="email"]', process.env.ADMIN_EMAIL!)
    await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD!)
    await page.click('button:has-text("Sign in as admin")')

    await page.waitForURL(/\/analyses$/)

    await context.close()
  })

  test('refuses an off-site callbackUrl and falls back to the dashboard', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    await pinEnglish(context)
    const page = await context.newPage()

    await page.goto('/auth/signin?callbackUrl=%2F%2Fexample.com')

    await page.fill('input[name="email"]', process.env.ADMIN_EMAIL!)
    await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD!)
    await page.click('button:has-text("Sign in as admin")')

    await page.waitForURL(/\/dashboard$/)

    await context.close()
  })

  test('shows the landing page to a signed-out visitor at the index route', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    await pinEnglish(context)
    const page = await context.newPage()

    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const main = page.getByRole('main')
    await expect(main.getByRole('link', { name: 'Talk on WhatsApp' }).first()).toHaveAttribute(
      'href',
      /^https:\/\/wa\.me\//
    )
    await expect(main.getByRole('link', { name: 'Contact us' }).first()).toHaveAttribute('href', /^mailto:/)
    // The sample button points at the published report, and only exists because the key is set.
    await expect(main.getByRole('link', { name: 'See a sample report' }).first()).toHaveAttribute(
      'href',
      '/r/00000000-0000-4000-8000-000000000001'
    )

    await expect(main.getByRole('heading', { name: 'What it costs' })).toBeVisible()
    // `exact` is load bearing: 'Agency' is a substring of the hero headline and of an FAQ question.
    for (const plan of ['Studio', 'Agency', 'Network']) {
      await expect(main.getByRole('heading', { name: plan, exact: true })).toBeVisible()
    }

    await main.getByRole('link', { name: 'Sign in' }).first().click()
    await expect(page).toHaveURL(/\/auth\/signin/)

    await context.close()
  })

  test('sends a signed-in reader at the index route to the dashboard', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('renders the dashboard with the form and the monthly quota', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Your pages' })).toBeVisible()
    await expect(page.locator('input[name="url"]')).toBeVisible()
    await expect(page.getByTestId('dashboard-quota')).toContainText('analyses used this month')
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

  test('the nav menus close on a click outside and on Escape', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/admin.json' })

    const desktop = await context.newPage()
    await desktop.setViewportSize({ width: 1280, height: 800 })
    await desktop.goto('/dashboard')

    const account = desktop.getByTestId('account-menu')
    await account.locator('summary').click()
    await expect(account).toHaveJSProperty('open', true)

    await desktop.mouse.click(120, 600)
    await expect(account).toHaveJSProperty('open', false)

    const phone = await context.newPage()
    await phone.setViewportSize({ width: 375, height: 812 })
    await phone.goto('/dashboard')

    const menu = phone.getByTestId('mobile-menu')
    await menu.locator('summary').click()
    await expect(menu).toHaveJSProperty('open', true)

    // Left of the panel's left edge, so outside it at any height.
    await phone.mouse.click(20, 600)
    await expect(menu).toHaveJSProperty('open', false)

    await menu.locator('summary').click()
    await expect(menu).toHaveJSProperty('open', true)
    await phone.keyboard.press('Escape')
    await expect(menu).toHaveJSProperty('open', false)

    await context.close()
  })

  // The one context in this file not pinned to English, because what a reader with no cookie gets is
  // the thing being asserted. See e2e/locale.ts.
  test('lands in pt-BR and dark with no cookie, and in English with one', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/auth/signin')
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.getByRole('button', { name: 'Continuar com o Google' })).toBeVisible()

    await pinEnglish(context)
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()

    await context.close()
  })

  test('analyzes a URL, shows the PageSpeed readout and the copy errors, and lists it in history', async ({
    page
  }) => {
    const url = await analyze(page, 'core')

    await expect(page.getByTestId('copy-report-link')).toBeVisible()

    const readout = page.getByTestId('measured-readout')
    await expect(readout.getByTestId('readout-score')).toContainText('76')
    await expect(readout.getByTestId('pagespeed-field')).toBeVisible()
    await expect(readout.getByTestId('pagespeed-category')).toHaveCount(0)

    await expect(page.getByTestId('analysis-section-ai').getByTestId('readout-group')).toHaveCount(1)
    await expect(page.getByTestId('analysis-section-seo').getByTestId('pagespeed-category')).toHaveCount(1)
    await expect(page.getByTestId('analysis-section-seo').getByTestId('site-crawl')).toHaveCount(1)
    await expect(page.getByTestId('analysis-section-seo').getByTestId('backlinks')).toHaveCount(1)
    await expect(page.getByTestId('analysis-section-seo').getByTestId('ranked-keywords')).toHaveCount(1)
    await expect(page.getByTestId('analysis-section-flow').getByTestId('pagespeed-category')).toHaveCount(3)

    // The top card starts open; the rest of the ranking is collapsed, so the assertion reads the top.
    await openSection(page, 'copy')
    await expect(
      page.getByTestId('hypothesis-card').first().getByText('The all-in-one platform for modern teams')
    ).toBeVisible()

    await page.goto('/dashboard')
    const history = page.getByTestId('analysis-history')
    await expect(history.getByText(url)).toBeVisible()
  })

  test('ranks the top errors open and collapses the backlog', async ({ page }) => {
    await analyze(page, 'ranking')
    await openSection(page, 'copy')

    const rows = page.getByTestId('hypothesis-card')
    await expect(rows).toHaveCount(6)
    await expect(page.locator('[data-testid="hypothesis-card"] details[open]')).toHaveCount(3)

    const top = rows.first()
    await expect(top).toContainText('The headline describes the product category')
    await expect(top).toContainText('Start here')

    await top.getByRole('button', { name: 'Why this is an error' }).click()
    await expect(top).toContainText('The visitor has to work out what they get')
  })

  test('lists the structure, SEO and AI errors, without steps, and on the public report', async ({
    page,
    browser
  }) => {
    await analyze(page, 'playbook')

    await openSection(page, 'flow')
    const playbook = page.getByTestId('flow-playbook')
    await expect(playbook).toBeVisible()
    await expect(playbook.getByTestId('flow-fix')).toHaveCount(4)
    await expect(playbook.getByRole('heading', { name: 'No way to sign in with Google' })).toBeVisible()
    await expect(page.getByTestId('flow-steps')).toHaveCount(0)

    await openSection(page, 'seo')
    const seo = page.getByTestId('seo-playbook')
    await expect(seo.getByTestId('seo-fix')).toHaveCount(3)
    await expect(seo.getByRole('heading', { name: 'No meta description' })).toBeVisible()

    await openSection(page, 'ai')
    const ai = page.getByTestId('ai-playbook')
    await expect(ai.getByTestId('ai-fix')).toHaveCount(1)
    await expect(ai.getByRole('heading', { name: 'Product images carry no alt text' })).toBeVisible()

    // Same URL, no cookie: the agency's client opens the exact page the owner was looking at.
    const reportUrl = page.url()

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    await pinEnglish(context)
    const anon = await context.newPage()
    await anon.goto(reportUrl)
    await expect(anon.getByTestId('flow-playbook').getByTestId('flow-fix')).toHaveCount(4)
    await expect(anon.locator('[data-testid^="analysis-section-"]')).toHaveCount(4)

    await expect(anon.getByTestId('copy-report-link')).toHaveCount(0)
    await expect(anon.getByRole('button', { name: 'Run again' })).toHaveCount(0)

    await context.close()
  })

  test('opens a past analysis by clicking its dashboard history entry', async ({ page }) => {
    const url = await analyze(page, 'open')
    const analysisUrl = page.url()

    await page.goto('/dashboard')
    await page.getByRole('link', { name: `Open analysis for ${url}` }).click()
    await expect(page).toHaveURL(analysisUrl)
    await expect(page.getByRole('heading', { level: 1, name: 'example.com' })).toBeVisible()
  })

  test('redirects the old owner route to the report, and refuses it to anyone else', async ({
    page,
    browser
  }) => {
    await analyze(page, 'redirect')
    const reportUrl = page.url()
    const embedKey = reportUrl.split('/').pop()!

    const origin = new URL(reportUrl).origin
    const listed = await page.request.get(`${origin}/api/analyses`)
    const { analyses } = await listed.json()
    const row = analyses.find((entry: { embedKey: string }) => entry.embedKey === embedKey)
    expect(row).toBeTruthy()

    await page.goto(`/analyses/${row.id}`)
    await expect(page).toHaveURL(reportUrl)

    // The embed key is the report's only credential, so the redirect may never trade an id it does
    // not own for one.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    await pinEnglish(context)
    const anon = await context.newPage()
    await anon.goto(`/analyses/${row.id}`)
    await expect(anon).toHaveURL(/\/auth\/signin/)
    await context.close()
  })

  test('refuses to start an analysis without a session', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    const res = await page.request.post('/api/analyses', {
      data: { url: 'https://example.com/' }
    })
    expect(res.status()).toBe(401)

    await context.close()
  })
})
