import { expect, test } from '@playwright/test'
import { eq, like } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, leads } from '@/db/schema'
import { pinEnglish } from './locale'

const ADDRESS = 'lead-capture@example.com'

/**
 * The address is asked for **below** the readout and gates nothing.
 *
 * This is the spec that pins the shape rather than the copy. An email wall used to stand where the
 * unlock wall is now, trading a stranger's address for a preview of someone else's report, and
 * docs/invariants.md forbids putting the readout behind anything on any surface. A regression here
 * would not throw -- it would quietly re-gate a measurement of the reader's own page.
 */
test.describe('lead capture on the report', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ context }) => {
    await pinEnglish(context)
  })

  test.afterAll(async () => {
    await db.delete(leads).where(eq(leads.email, ADDRESS))
    await db.delete(analyses).where(like(analyses.url, '%lead-capture%'))
  })

  test('takes an address without ever standing in front of the numbers', async ({ page }) => {
    test.setTimeout(180_000)

    await page.goto('/')
    await page.locator('#top input[name="url"]').fill(`https://example.com/?lead-capture=${Date.now()}`)
    await page.locator('#top button[type="submit"]').click()

    await page.waitForURL(/\/r\/[0-9a-f-]+$/, { timeout: 150_000 })

    const readout = page.getByTestId('measured-readout')
    const form = page.getByTestId('watch-page-form')

    // Both are on the page, and the readout is readable before anyone types anything.
    await expect(readout).toBeVisible()
    await expect(form).toBeVisible()

    // **Below, never above.** The offer may sit next to the numbers and never in front of them.
    const readoutTop = await readout.evaluate((node) => node.getBoundingClientRect().top)
    const formTop = await form.evaluate((node) => node.getBoundingClientRect().top)
    expect(formTop).toBeGreaterThan(readoutTop)

    // The fixes stay behind the unlock wall, which the address does not open.
    await expect(page.getByTestId('unlock-wall')).toBeVisible()

    await form.getByRole('textbox').fill(ADDRESS)
    await form.getByRole('button').click()

    await expect(form.getByText('Check your inbox')).toBeVisible()

    // The row landed, and it landed in `leads` -- never in `users`.
    const rows = await db.select().from(leads).where(eq(leads.email, ADDRESS))
    expect(rows).toHaveLength(1)

    // Leaving an address is not ownership. The analysis is still ownerless, which is the one column
    // the free/paid split reads.
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, rows[0].analysisId))
    expect(analysis.userId).toBeNull()

    // ...and the wall did not move.
    await expect(page.getByTestId('unlock-wall')).toBeVisible()
  })

  test('refuses an embed key no analysis carries', async ({ request }) => {
    const response = await request.post('/api/leads', {
      data: { email: ADDRESS, embedKey: '00000000-0000-4000-8000-000000000000' }
    })

    expect(response.status()).toBe(404)
  })

  test('refuses a malformed address', async ({ request }) => {
    const response = await request.post('/api/leads', {
      data: { email: 'not-an-address', embedKey: '00000000-0000-4000-8000-000000000000' }
    })

    expect(response.status()).toBe(422)
  })
})
