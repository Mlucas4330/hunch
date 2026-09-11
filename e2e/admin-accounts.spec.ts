import { expect, test } from '@playwright/test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { ADMIN_ACCOUNTS_PATH } from '@/lib/constants'
import { pinEnglish } from './locale'

const TARGET = 'quota-target@example.com'

test.describe('admin accounts', () => {
  test.afterAll(async () => {
    await db.delete(users).where(eq(users.email, TARGET))
  })

  test('sets a monthly quota for an address that has never signed in', async ({ page }) => {
    await page.goto(ADMIN_ACCOUNTS_PATH)
    await expect(page.getByRole('heading', { name: 'Accounts', exact: true })).toBeVisible()

    await page.fill('input[name="email"]', TARGET)
    await page.fill('input[name="quota"]', '7')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Saved.')).toBeVisible()
    await expect(page.getByTestId('account-quotas').getByText(TARGET)).toBeVisible()
    await expect(page.getByTestId('account-quotas').getByText('0 of 7 this month')).toBeVisible()

    const [row] = await db.select().from(users).where(eq(users.email, TARGET))
    expect(row.monthlyQuota).toBe(7)
  })

  test('shows the admin link in the nav', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('link', { name: 'Admin' }).first()).toBeVisible()
  })

  test('refuses a quota above the ceiling', async ({ page }) => {
    await page.goto(ADMIN_ACCOUNTS_PATH)
    await page.fill('input[name="email"]', TARGET)
    // Bypasses the input's own max, so this exercises the server-side schema rather than the browser.
    await page.evaluate(() => {
      const field = document.querySelector<HTMLInputElement>('input[name="quota"]')
      if (field) field.max = '999999'
    })
    await page.fill('input[name="quota"]', '999999')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Check the address and the number of analyses.')).toBeVisible()
  })
})

// Demotes the *row* while the session stays exactly as it was: revoking must take effect on the next
// request, not the next login.
test.describe('a demoted operator', () => {
  const email = process.env.ADMIN_EMAIL

  test.afterEach(async () => {
    if (email) await db.update(users).set({ role: 'admin' }).where(eq(users.email, email))
  })

  test('loses the screen on the next request, not the next sign in', async ({ page }) => {
    if (!email) throw new Error('ADMIN_EMAIL must be set')

    await page.goto(ADMIN_ACCOUNTS_PATH)
    await expect(page.getByRole('heading', { name: 'Accounts', exact: true })).toBeVisible()

    await db.update(users).set({ role: 'user' }).where(eq(users.email, email))

    const response = await page.goto(ADMIN_ACCOUNTS_PATH)
    expect(response?.status()).toBe(404)
  })

  test('no longer sees the nav link', async ({ page }) => {
    if (!email) throw new Error('ADMIN_EMAIL must be set')

    await db.update(users).set({ role: 'user' }).where(eq(users.email, email))
    await page.goto('/dashboard')

    await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0)
  })
})

test.describe('admin accounts, signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ context }) => {
    await pinEnglish(context)
  })

  test('is not reachable without a session', async ({ page }) => {
    await page.goto(ADMIN_ACCOUNTS_PATH)
    await expect(page).toHaveURL(/\/auth\/signin/)
  })
})
