import { test, expect, type Page } from '@playwright/test'

async function openCopyTab(page: Page) {
  await page.getByRole('tab', { name: 'Copy' }).click()
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

    // `/analyses` is a protected prefix with no page of its own, so it renders not-found once the
    // redirect lands. That is fine and deliberate: what is under test is the callbackUrl round trip,
    // and the URL is the whole assertion. It used to point at `/admin/leads`, which no longer exists.
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
    const page = await context.newPage()

    await page.goto('/auth/signin?callbackUrl=%2F%2Fexample.com')

    await page.fill('input[name="email"]', process.env.ADMIN_EMAIL!)
    await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD!)
    await page.click('button:has-text("Sign in as admin")')

    await page.waitForURL(/\/dashboard$/)

    await context.close()
  })

  test('renders the marketing landing publicly at the index route', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'Score my page' }).first()).toBeVisible()

    await context.close()
  })

  test('renders the dashboard at /dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Your pages' })).toBeVisible()
    await expect(page.locator('input[name="url"]')).toBeVisible()
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

  // A inversao que o teste anterior prometia: os pacotes chegaram, entao o preco TEM de estar la,
  // com o selo dizendo qual deles a maioria leva. O formulario de contato segue sem existir.
  test('prices the three packs on the landing and marks the one most buyers take', async ({
    browser
  }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/')

    const packs = page.getByTestId('credit-packs')
    await expect(packs.getByText('R$19').first()).toBeVisible()
    await expect(packs.getByText('R$39').first()).toBeVisible()
    await expect(packs.getByText('R$99').first()).toBeVisible()
    await expect(packs.getByText('Most chosen')).toHaveCount(1)
    await expect(packs.getByRole('button', { name: 'Buy' })).toHaveCount(3)

    await expect(page.locator('#contact')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Score my page' }).first()).toBeVisible()

    await context.close()
  })

  // A rota que a landing consulta e publica, e o que ela devolve e a unica coisa que separa a prova
  // social de um vazamento: dominio e nota, nunca a embed key, o caminho da URL ou o dono. Este teste
  // existe para falhar no dia em que alguem alargar a query. Ver docs/security.md.
  test('exposes only a domain and a score on the public pulse route', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    const res = await page.request.get('/api/pulse')
    expect(res.ok()).toBe(true)

    const body = await res.json()
    expect(Array.isArray(body.leaderboard)).toBe(true)
    expect(Array.isArray(body.pulse)).toBe(true)

    for (const entry of body.leaderboard) {
      expect(Object.keys(entry).sort()).toEqual(['domain', 'score'])
    }
    for (const entry of body.pulse) {
      expect(Object.keys(entry).sort()).toEqual(['at', 'domain', 'score', 'state'])
    }

    const raw = await res.text()
    expect(raw).not.toMatch(/embedKey|userId|"url"|https?:\/\//)

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
    await expect(page.getByRole('link', { name: 'Ver a minha nota' }).first()).toBeVisible()
    await expect(page.getByText('Score my page')).toHaveCount(0)

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



    // One destination, not two: the PDF and the /analyses/[id]/report route are both gone, so the
    // card count is the assertion. A second Open link reappearing here means something reintroduced a
    // deliverable without a name -- see docs/report.md.
    const deliverables = page.getByTestId('deliverables')
    await expect(deliverables.getByText('Interactive report')).toBeVisible()
    await expect(deliverables.getByRole('button', { name: 'Copy link' })).toBeVisible()
    await expect(deliverables.getByRole('link', { name: 'Open' })).toHaveCount(1)
    await expect(deliverables.getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      /\/r\/[0-9a-f-]+$/
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

    await page.getByRole('tab', { name: 'SEO' }).click()
    const seo = page.getByTestId('seo-playbook')
    await expect(seo).toBeVisible()
    await expect(seo.getByTestId('seo-fix')).toHaveCount(2)
    await expect(seo.getByTestId('flow-fix')).toHaveCount(0)
    await expect(seo.getByRole('heading', { name: 'Write a meta description' })).toBeVisible()

    await page.getByRole('tab', { name: 'AI' }).click()
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

    await anon.getByRole('tab', { name: 'AI' }).click()
    await expect(anon.getByTestId('ai-playbook').getByTestId('ai-fix')).toHaveCount(1)

    // Four tabs, all about what to change.
    await expect(anon.getByRole('tab')).toHaveCount(4)

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
    await expect(page.getByRole('heading', { name: 'What to change on this page' })).toBeVisible()
  })
})
