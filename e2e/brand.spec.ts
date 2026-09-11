import { expect, test } from '@playwright/test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { pinEnglish } from './locale'

// A 1x1 PNG, built here so the suite carries no binary fixture.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)
const AGENCY = 'Northwind Studio'

test('an agency brand replaces Hunch on the report its client opens', async ({ page, browser }) => {
  test.setTimeout(180_000)

  const email = process.env.ADMIN_EMAIL
  if (!email) throw new Error('ADMIN_EMAIL must be set')

  try {
    await page.goto('/dashboard')
    await page.fill('input[name="url"]', `https://example.com/?t=${Date.now()}-brand`)
    await page.getByRole('button', { name: 'Analyze' }).click()
    await page.waitForURL(/\/r\/[0-9a-f-]+$/)
    const reportUrl = page.url()

    await page.goto('/settings')
    await page.fill('input[name="name"]', AGENCY)
    await page.setInputFiles('input[name="logo"]', { name: 'logo.png', mimeType: 'image/png', buffer: PNG })
    await page.getByTestId('save-brand').click()
    await expect(page.getByTestId('brand-saved')).toBeVisible()

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    await pinEnglish(context)
    const anon = await context.newPage()
    await anon.goto(reportUrl)

    const header = anon.locator('main header').first()
    const mark = header.getByTestId('agency-brand')
    await expect(mark).toHaveAttribute('src', /^\/brand\/[0-9a-f-]+\.png$/)
    await expect(header).not.toContainText('Hunch')
    await expect(anon).toHaveTitle(new RegExp(`\\| ${AGENCY}$`))

    const logo = await anon.request.get((await mark.getAttribute('src'))!)
    expect(logo.headers()['content-type']).toBe('image/png')

    await page.goto('/settings')
    await page.getByLabel('Remove the logo').check()
    await page.getByTestId('save-brand').click()
    await expect(page.getByTestId('brand-saved')).toBeVisible()

    await anon.reload()
    await expect(header.getByTestId('agency-brand')).toHaveText(AGENCY)

    await db.update(users).set({ brandName: null, brandLogoUrl: null }).where(eq(users.email, email))
    await anon.reload()
    await expect(header).toContainText('Hunch')
    await expect(anon).not.toHaveTitle(new RegExp(AGENCY))

    await context.close()
  } finally {
    await db.update(users).set({ brandName: null, brandLogoUrl: null }).where(eq(users.email, email))
  }
})
