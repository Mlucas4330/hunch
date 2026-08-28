import { expect, test } from '@playwright/test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { subscriptions, users } from '@/db/schema'
import { MERCADOPAGO_PROVIDER } from '@/lib/constants'
import { pinEnglish } from './locale'

const OTHER = 'someone-elses-subscription@example.com'
const OTHER_REF = 'e2e-preapproval-not-yours'

/**
 * The authorisation boundary on cancelling.
 *
 * The route takes **no id**: it resolves the subscription from the session, so there is no field a
 * caller could put somebody else's `preapproval_id` in. This spec pins that structurally -- a
 * signed-in reader with no subscription of their own cannot reach a stranger's row, however the
 * request is shaped.
 */
test.describe('cancelling a subscription', () => {
  test.beforeAll(async () => {
    const [row] = await db
      .insert(users)
      .values({ email: OTHER, name: OTHER })
      .onConflictDoUpdate({ target: users.email, set: { email: OTHER } })
      .returning({ id: users.id })

    await db
      .insert(subscriptions)
      .values({
        userId: row.id,
        provider: MERCADOPAGO_PROVIDER,
        providerRef: OTHER_REF,
        status: 'authorized'
      })
      .onConflictDoNothing()
  })

  test.afterAll(async () => {
    await db.delete(users).where(eq(users.email, OTHER))
  })

  test('refuses a signed out caller', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    await pinEnglish(context)

    const response = await context.request.delete('/api/billing/mercadopago/subscribe')
    expect(response.status()).toBe(401)

    await context.close()
  })

  test('answers 404 for a signed in caller who has none, and leaves other rows alone', async ({
    request
  }) => {
    // The suite's session is the admin, who has no subscription. Nothing about the request names
    // one, which is the point -- there is no shape of this call that could reach OTHER's row.
    const response = await request.delete('/api/billing/mercadopago/subscribe')
    expect(response.status()).toBe(404)

    const [row] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.providerRef, OTHER_REF))

    expect(row.status).toBe('authorized')
  })

  test('the dashboard shows no subscription card when there is none', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByTestId('subscription-card')).toHaveCount(0)
  })
})
