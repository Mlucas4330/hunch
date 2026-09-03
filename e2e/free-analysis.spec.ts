import { expect, test } from '@playwright/test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, users } from '@/db/schema'

const URL_UNDER_TEST = 'https://example.com/?free-half'
const URL_WITHOUT_BRIEF = 'https://example.com/?no-brief'
const URL_WITH_BRIEF = 'https://example.com/?with-brief'

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

    // **It must not read as "nothing to improve".** The cover used to fill its count sentence with
    // zeroes and the strip above the readout printed "Changes recommended: 0" -- a page scored 47
    // being told it was perfect. Incomplete and clean are opposite claims.
    await expect(page.getByText('have not been written for this page yet')).toBeVisible()
    await expect(page.getByText('Changes recommended')).toHaveCount(0)
    await expect(page.getByText('found 0 changes worth making')).toHaveCount(0)

    // And it fits a phone.
    await page.setViewportSize({ width: 360, height: 780 })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(overflow).toBeLessThanOrEqual(0)
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

// The path 5b opened. **A credit is spent on the four answers, so a run without them is the free
// half** -- the same row, the same wall, the same untouched balance as a reader with no credits at
// all. The brief panel is open on this screen and this deliberately does not touch it.
test('a reader with a credit and no brief is not charged for one', async ({ page }) => {
  test.setTimeout(180_000)

  const email = process.env.ADMIN_EMAIL
  if (!email) throw new Error('ADMIN_EMAIL must be set')
  const [before] = await db.select().from(users).where(eq(users.email, email))
  expect(before.credits).toBeGreaterThan(0)

  // The wording is the reader's half of the rule, so it is checked on the screen.
  await page.goto('/dashboard')
  await expect(page.getByText('Business details, which a credit is spent on')).toBeVisible()

  // The run itself goes through the route rather than the form, and that is not a shortcut. The
  // dashboard pre-fills the wizard with the last brief this reader wrote, so a second analysis
  // submitted from the form is never briefless -- which is the behaviour we want and makes the form
  // the wrong instrument for asserting what happens without one.
  const started = await page.request.post('/api/analyses', {
    data: { url: URL_WITHOUT_BRIEF }
  })
  expect(started.status()).toBe(202)
  expect((await started.json()).owned).toBe(false)

  const [row] = await db.select().from(analyses).where(eq(analyses.url, URL_WITHOUT_BRIEF))
  expect(row.userId).toBeNull()
  expect(row.brief).toBeNull()

  const [after] = await db.select().from(users).where(eq(users.email, email))
  expect(after.credits).toBe(before.credits)

  await db.delete(analyses).where(eq(analyses.url, URL_WITHOUT_BRIEF))
})

// The other side of the same rule, and the one that proves the four answers are what changed hands.
test('the same reader, with the four answers, is charged', async ({ page }) => {
  test.setTimeout(180_000)

  const email = process.env.ADMIN_EMAIL
  if (!email) throw new Error('ADMIN_EMAIL must be set')
  const [before] = await db.select().from(users).where(eq(users.email, email))

  const started = await page.request.post('/api/analyses', {
    data: {
      url: URL_WITH_BRIEF,
      brief: [
        'Audience: Small businesses and their owners',
        'Offer: Software or an app',
        'Action: Buy, right here',
        'Objection: They cannot tell what it actually does'
      ].join('\n')
    }
  })
  expect(started.status()).toBe(202)
  const { embedKey, owned } = await started.json()
  expect(owned).toBe(true)

  const [after] = await db.select().from(users).where(eq(users.email, email))
  expect(after.credits).toBe(before.credits - 1)

  const [row] = await db.select().from(analyses).where(eq(analyses.url, URL_WITH_BRIEF))
  expect(row.userId).not.toBeNull()

  // **Waited out rather than deleted from under.** This is the only spec here that starts a run it
  // does not follow on screen, and deleting the row while the worker still holds the job makes the
  // hypotheses insert fail on a foreign key that is already gone.
  await expect
    .poll(
      async () => (await (await page.request.get(`/api/analyses?embedKey=${embedKey}`)).json()).generated,
      { timeout: 150_000 }
    )
    .toBe(true)

  await db.delete(analyses).where(eq(analyses.url, URL_WITH_BRIEF))
  await db.update(users).set({ credits: before.credits }).where(eq(users.email, email))
})
