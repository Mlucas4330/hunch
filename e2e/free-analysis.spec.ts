import { expect, test } from '@playwright/test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, users } from '@/db/schema'

const URL_UNDER_TEST = 'https://example.com/?free-half'

// Drains the balance for the duration, then puts it back. The suite's other specs need credits, so
// this must restore whatever it took rather than a fixed number.
async function withZeroBalance(run: () => Promise<void>) {
  const email = process.env.ADMIN_EMAIL
  if (!email) throw new Error('ADMIN_EMAIL must be set')

  const [before] = await db.select().from(users).where(eq(users.email, email))
  await db.update(users).set({ credits: 0 }).where(eq(users.email, email))

  try {
    await run()
  } finally {
    await db.update(users).set({ credits: before.credits }).where(eq(users.email, email))
  }
}

test('a signed in reader with no credits still gets the measured half', async ({ page }) => {
  test.setTimeout(180_000)

  await withZeroBalance(async () => {
    await page.goto('/dashboard')
    await page.fill('input[name="url"]', URL_UNDER_TEST)
    await page.getByRole('button', { name: 'Analyze' }).click()

    // The free half lands on the shareable report, exactly as it does with no session at all --
    // it used to answer 402 and delete the row.
    await page.waitForURL(/\/r\/[0-9a-f-]+$/, { timeout: 150_000 })

    // The readout is never gated, on any surface.
    await expect(page.getByTestId('measured-readout')).toBeVisible()

    // ...and the fixes are, with a route to buying rather than a sign in they are already past.
    const wall = page.getByTestId('unlock-wall')
    await expect(wall).toBeVisible()
    await expect(wall.getByRole('link', { name: 'Buy a credit to unlock' })).toBeVisible()
  })

  // Zero tokens: the row stayed ownerless, which is what makes the free half free.
  const [row] = await db.select().from(analyses).where(eq(analyses.url, URL_UNDER_TEST))
  expect(row.userId).toBeNull()
  expect(row.structure).not.toBeNull()

  await db.delete(analyses).where(eq(analyses.url, URL_UNDER_TEST))
})

test('the balance is untouched by a free run', async () => {
  const email = process.env.ADMIN_EMAIL
  if (!email) throw new Error('ADMIN_EMAIL must be set')

  const [row] = await db.select().from(users).where(eq(users.email, email))
  expect(row.credits).toBeGreaterThan(0)
})
