import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { eq, like } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, leads } from '@/db/schema'
import { pinEnglish } from './locale'

const ADDRESS = 'unsubscribe@example.com'

/**
 * Leaving the sequence, from the link in the mail.
 *
 * **The point being pinned is that one click is enough.** An unsubscribe that needs a second click,
 * or that fails quietly, is one people give up on and report as spam instead, and the reputation of
 * a young sending domain is the thing that pays for it.
 */
test.describe('unsubscribe', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ context }) => {
    await pinEnglish(context)
  })

  test.afterAll(async () => {
    await db.delete(leads).where(eq(leads.email, ADDRESS))
    await db.delete(analyses).where(like(analyses.url, '%unsubscribe-spec%'))
  })

  async function seed() {
    const [analysis] = await db
      .insert(analyses)
      .values({ url: `https://example.com/?unsubscribe-spec=${Date.now()}` })
      .returning({ id: analyses.id })

    const [lead] = await db
      .insert(leads)
      .values({ email: ADDRESS, analysisId: analysis.id, consentedAt: new Date() })
      .returning({ token: leads.unsubscribeToken })

    return lead.token
  }

  test('one click marks the row and shows the confirmation', async ({ page }) => {
    const token = await seed()

    await page.goto(`/api/leads/unsubscribe?token=${token}`)

    // The route redirects to the page rather than rendering from the write, so a refresh here
    // repeats nothing.
    await expect(page).toHaveURL(/\/unsubscribe$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const [row] = await db.select().from(leads).where(eq(leads.unsubscribeToken, token))
    expect(row.unsubscribedAt).not.toBeNull()
  })

  test('a token nobody holds is answered exactly like one that worked', async ({ page }) => {
    // Telling a stranger whether a token is real is the only thing this endpoint could leak.
    await page.goto(`/api/leads/unsubscribe?token=${randomUUID()}`)

    await expect(page).toHaveURL(/\/unsubscribe$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('a malformed token is refused without touching anything', async ({ page }) => {
    const token = await seed()

    await page.goto('/api/leads/unsubscribe?token=not-a-uuid')
    await expect(page).toHaveURL(/\/unsubscribe$/)

    const [row] = await db.select().from(leads).where(eq(leads.unsubscribeToken, token))
    expect(row.unsubscribedAt).toBeNull()
  })
})
