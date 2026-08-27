import { test, expect, type Page } from '@playwright/test'
import { pinEnglish } from './locale'

async function openCopyTab(page: Page) {
  await page.getByRole('tab', { name: 'Copy' }).click()
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
    await pinEnglish(context)
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
    await pinEnglish(context)
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

  // Um <details> fecha no proprio summary e em mais nada, entao o painel ficava por cima do que o
  // leitor tinha acabado de tentar tocar. Os dois menus da nav usam o mesmo Dropdown, entao os dois
  // sao verificados aqui -- a versao anterior do bug existia em um e nao no outro.
  test('the nav menus close on a click outside and on Escape', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/admin.json' })

    const desktop = await context.newPage()
    await desktop.setViewportSize({ width: 1280, height: 800 })
    await desktop.goto('/dashboard')

    const account = desktop.getByTestId('account-menu')
    await account.locator('summary').click()
    await expect(account).toHaveJSProperty('open', true)

    // Longe do painel, que fica ancorado no canto superior direito.
    await desktop.mouse.click(120, 600)
    await expect(account).toHaveJSProperty('open', false)

    const phone = await context.newPage()
    await phone.setViewportSize({ width: 375, height: 812 })
    await phone.goto('/dashboard')

    const menu = phone.getByTestId('mobile-menu')
    await menu.locator('summary').click()
    await expect(menu).toHaveJSProperty('open', true)

    await phone.mouse.click(120, 600)
    await expect(menu).toHaveJSProperty('open', false)

    await menu.locator('summary').click()
    await expect(menu).toHaveJSProperty('open', true)
    await phone.keyboard.press('Escape')
    await expect(menu).toHaveJSProperty('open', false)

    await context.close()
  })

  // A inversao que o teste anterior prometia: os pacotes chegaram, entao o preco TEM de estar la,
  // com o selo dizendo qual deles a maioria leva. O formulario de contato segue sem existir.
  test('prices the three packs on the landing and marks the one most buyers take', async ({
    browser
  }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    await pinEnglish(context)
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
    await pinEnglish(context)
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

  // The hero gives this form a grid track next to the readout card, and a CTA long enough to take
  // most of it. What keeps the field usable is a container query rather than a viewport breakpoint:
  // the button drops below it instead of sharing a row it does not fit in. See
  // components/url-input-form.tsx.
  test('keeps the hero URL field the width of its column, with the CTA below it', async ({
    browser
  }) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
      viewport: { width: 1440, height: 900 }
    })
    await pinEnglish(context)
    const page = await context.newPage()

    await page.goto('/')
    const form = page.locator('form').filter({ has: page.locator('input[name="url"]') }).first()
    const field = (await form.locator('input[name="url"]').boundingBox())!
    const submit = (await form.locator('button[type="submit"]').boundingBox())!

    expect(field.width).toBeGreaterThan(400)
    expect(submit.y).toBeGreaterThan(field.y)

    await context.close()
  })

  // **The one context in this file that is not pinned to English**, because what a reader with no
  // cookie gets is the thing being asserted. `DEFAULT_LOCALE` is pt-BR, and the switch back is the
  // same cookie the toggle writes. See e2e/locale.ts.
  test('lands in pt-BR with no cookie, and in English with one', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
    await expect(
      page.getByRole('link', { name: 'Ver minha nota agora, de graça' }).first()
    ).toBeVisible()
    await expect(page.getByText('Score my page')).toHaveCount(0)

    await pinEnglish(context)
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('link', { name: 'Score my page' }).first()).toBeVisible()
    await expect(page.getByText('Ver minha nota agora, de graça')).toHaveCount(0)

    await context.close()
  })

  test('analyzes a URL, shows ranked hypotheses with a recommended challenger, and lists it in history', async ({
    page
  }) => {
    const url = `https://example.com/?t=${Date.now()}`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()

    await page.waitForURL(/\/r\/[0-9a-f-]+$/)



    // **Copying the link is the whole of it, and there is nothing to open.** This used to assert a
    // named "Interactive report" card with an `Open` button, which made sense while the owner read
    // this document on a different route -- the link now points at the page it sits on. An `Open`
    // control reappearing here means somebody reintroduced the second route -- see docs/report.md.
    await expect(page.getByTestId('copy-report-link')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open' })).toHaveCount(0)

    await openCopyTab(page)
    await expect(page.getByText('Ship faster: releases in').first()).toBeVisible()

    await page.goto('/dashboard')
    const history = page.getByTestId('analysis-history')
    await expect(history.getByText(url)).toBeVisible()
    // Two documents on the client card, and nothing else. Stage 2 is gone.
    await expect(history.getByRole('link', { name: 'Tests' })).toHaveCount(0)
    await expect(page.getByTestId('copy-report-link').first()).toBeVisible()
  })

  test('writes the two alternate options on demand, from the analysis', async ({ page }) => {
    const url = `https://example.com/?t=${Date.now()}-alt`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/r\/[0-9a-f-]+$/)
    await openCopyTab(page)

    const card = page.getByTestId('hypothesis-card').first()
    // Everything past the rewritten line is a drawer now, so nothing below is on screen until the
    // reader asks for it. That is the assertion: an open card is the decision and nothing else.
    await expect(card.getByTestId('alternate-variants')).toHaveCount(0)
    await expect(card.getByTestId('variant-preview')).toHaveCount(0)

    // A previa vive nas duas telas. Ficou so no relatorio publico por um tempo, o que colocava a
    // imagem na frente de todo mundo com quem o link foi compartilhado e de ninguem que pagou por
    // ela. Sob E2E_FIXTURES o render responde `unavailable`, entao o que se verifica aqui e que o
    // controle esta montado, nao que a imagem chegou.
    await card.getByRole('button', { name: 'On your page' }).click()
    await expect(card.getByTestId('variant-preview')).toBeVisible()

    // Synchronized on the response rather than the default expect timeout: this is the only test
    // that hits the route, so it always pays `next dev`'s cold compile for it. Opening the drawer
    // is what buys the two options -- the fetch fires once, on the first open.
    const [written] = await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/hypotheses\/[0-9a-f-]+\/variants$/.test(r.url()) && r.request().method() === 'POST'
      ),
      card.getByTestId('load-alternates').click()
    ])
    expect(written.ok()).toBeTruthy()

    await expect(card.getByTestId('alternate-variants')).toBeVisible()
    // The preview drawer closed when the alternates one opened: one panel at a time is the whole
    // reason the card got shorter.
    await expect(card.getByTestId('variant-preview')).toHaveCount(0)

    // Persisted, not just held in local state.
    await page.reload()
    await openCopyTab(page)
    const reopened = page.getByTestId('hypothesis-card').first()
    await reopened.getByTestId('load-alternates').click()
    await expect(reopened.getByTestId('alternate-variants')).toBeVisible()
    await expect(reopened.getByText('Stop [specific pain]. Start shipping.')).toBeVisible()
  })

  test('ranks the top ideas open and collapses the backlog', async ({ page }) => {
    const url = `https://example.com/?t=${Date.now()}-ranking`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/r\/[0-9a-f-]+$/)
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
    // The rationale is the "Why this works" drawer now, not a panel stacked under the copy.
    await top.getByRole('button', { name: 'Why this works' }).click()
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
    await page.waitForURL(/\/r\/[0-9a-f-]+$/)

    const playbook = page.getByTestId('flow-playbook')
    await expect(playbook).toBeVisible()
    await expect(playbook.getByTestId('flow-fix')).toHaveCount(4)
    await expect(playbook.getByRole('heading', { name: 'Offer login with Google' })).toBeVisible()
    await expect(
      playbook.getByText('Add a "Continue with Google" button above the email field on the signup form')
    ).toBeVisible()
    await playbook.getByRole('button', { name: 'Why these are shipped by hand' }).click()
    await expect(playbook.getByRole('tooltip')).toContainText('ship by hand')

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

    // Same URL, no cookie. There is one route now, so the anonymous reader opens the exact page the
    // owner was just looking at -- what changes is what they are allowed to do on it.
    const reportUrl = page.url()

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    await pinEnglish(context)
    const anon = await context.newPage()
    await anon.goto(reportUrl)
    await expect(anon.getByTestId('flow-playbook').getByTestId('flow-fix')).toHaveCount(4)

    await anon.getByRole('tab', { name: 'AI' }).click()
    await expect(anon.getByTestId('ai-playbook').getByTestId('ai-fix')).toHaveCount(1)

    // Four tabs, all about what to change.
    await expect(anon.getByRole('tab')).toHaveCount(4)

    await anon.getByRole('tab', { name: 'Copy' }).click()
    const card = anon.getByTestId('hypothesis-card').first()
    await card.getByRole('button', { name: 'On your page' }).click()
    const preview = anon.getByTestId('variant-preview').first()
    await expect(preview.getByRole('button', { name: 'See how this looks on your page' })).toBeVisible()
    await expect(preview.getByRole('img')).toHaveCount(0)

    // Owner-only affordances, and the whole of the isOwner axis: no share card, no re-measure
    // button, no way to buy two more variants off a report somebody handed them.
    await expect(anon.getByTestId('copy-report-link')).toHaveCount(0)
    await expect(anon.getByTestId('load-alternates')).toHaveCount(0)
    await expect(anon.getByRole('button', { name: 'Measure again' })).toHaveCount(0)

    await context.close()
  })

  test('opens a past analysis by clicking its dashboard history entry', async ({ page }) => {
    const url = `https://example.com/?t=${Date.now()}-open`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/r\/[0-9a-f-]+$/)
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
    const url = `https://example.com/?t=${Date.now()}-redirect`

    await page.goto('/dashboard')
    await page.fill('input[name="url"]', url)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/r\/[0-9a-f-]+$/)
    const reportUrl = page.url()
    const embedKey = reportUrl.split('/').pop()!

    const origin = new URL(reportUrl).origin
    const listed = await page.request.get(`${origin}/api/analyses`)
    const { analyses } = await listed.json()
    const row = analyses.find((entry: { embedKey: string }) => entry.embedKey === embedKey)
    expect(row).toBeTruthy()

    await page.goto(`/analyses/${row.id}`)
    await expect(page).toHaveURL(reportUrl)

    // **The embed key is the report's only credential**, so the redirect may never trade an id it
    // does not own for one. A signed-out reader gets the sign-in wall from middleware; a signed-in
    // stranger would get 404 from the page itself.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    await pinEnglish(context)
    const anon = await context.newPage()
    await anon.goto(`/analyses/${row.id}`)
    await expect(anon).toHaveURL(/\/auth\/signin/)
    await context.close()
  })
})
