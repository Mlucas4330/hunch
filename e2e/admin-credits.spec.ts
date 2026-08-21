import { expect, test } from '@playwright/test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { creditTransactions, users } from '@/db/schema'
import { ADMIN_CREDITS_PATH } from '@/lib/constants'

const TARGET = 'grant-target@example.com'

test.describe('admin credits', () => {
  test.afterAll(async () => {
    await db.delete(users).where(eq(users.email, TARGET))
  })

  test('grants credits and writes a grant row to the ledger', async ({ page }) => {
    await page.goto(ADMIN_CREDITS_PATH)
    await expect(page.getByRole('heading', { name: 'Grant credits' })).toBeVisible()

    await page.fill('input[name="email"]', TARGET)
    await page.fill('input[name="credits"]', '7')
    await page.getByRole('button', { name: 'Grant' }).click()

    await expect(page.getByText('Granted.')).toBeVisible()
    await expect(page.getByText(TARGET)).toBeVisible()

    const [row] = await db.select().from(users).where(eq(users.email, TARGET))
    expect(row.credits).toBe(7)

    // The reason is the whole point of the enum value: the ledger must not call this a purchase.
    const ledger = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, row.id))
    expect(ledger).toHaveLength(1)
    expect(ledger[0].reason).toBe('grant')
    expect(ledger[0].delta).toBe(7)
  })

  test('shows the admin link in the nav', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('link', { name: 'Admin' }).first()).toBeVisible()
  })

  test('refuses a grant above the ceiling', async ({ page }) => {
    await page.goto(ADMIN_CREDITS_PATH)
    await page.fill('input[name="email"]', TARGET)
    // Bypasses the input's own max, so this exercises the server-side schema rather than the browser.
    await page.evaluate(() => {
      const field = document.querySelector<HTMLInputElement>('input[name="credits"]')
      if (field) field.max = '999999'
    })
    await page.fill('input[name="credits"]', '999999')
    await page.getByRole('button', { name: 'Grant' }).click()

    await expect(page.getByText('Check the address and the number of credits.')).toBeVisible()
  })
})

// Demotes the *row* while the session stays exactly as it was. That is the whole point of keeping the
// role out of the JWT: revoking must take effect on the next request, not the next login. If this ever
// starts passing with a stale token, the role has leaked into the session.
test.describe('a demoted operator', () => {
  const email = process.env.ADMIN_EMAIL

  test.afterEach(async () => {
    if (email) await db.update(users).set({ role: 'admin' }).where(eq(users.email, email))
  })

  test('loses the screen on the next request, not the next sign in', async ({ page }) => {
    if (!email) throw new Error('ADMIN_EMAIL must be set')

    await page.goto(ADMIN_CREDITS_PATH)
    await expect(page.getByRole('heading', { name: 'Grant credits' })).toBeVisible()

    await db.update(users).set({ role: 'user' }).where(eq(users.email, email))

    const response = await page.goto(ADMIN_CREDITS_PATH)
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: 'Grant credits' })).toHaveCount(0)
  })

  test('no longer sees the nav link', async ({ page }) => {
    if (!email) throw new Error('ADMIN_EMAIL must be set')

    await db.update(users).set({ role: 'user' }).where(eq(users.email, email))
    await page.goto('/dashboard')

    await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0)
  })
})

test.describe('admin credits, signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('is not reachable without a session', async ({ page }) => {
    await page.goto(ADMIN_CREDITS_PATH)
    await expect(page).toHaveURL(/\/auth\/signin/)
  })
})
