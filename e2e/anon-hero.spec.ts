import { expect, test } from '@playwright/test'
import { like } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { pinEnglish } from './locale'

// A genuine stranger: the storage state is dropped rather than using the `dom` project, which by
// contract makes no request to the app and writes no row.
test.describe('the hero form, signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ context }) => {
    await pinEnglish(context)
  })

  test.afterAll(async () => {
    await db.delete(analyses).where(like(analyses.url, '%anon-hero%'))
  })

  test('scores a page with no account, and stops at the wall', async ({ page }) => {
    test.setTimeout(180_000)
    await page.goto('/')

    // Nobody is signed in, and the promise on this page is that it does not matter.
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()

    const input = page.locator('#top input[name="url"]')
    await expect(input).toBeVisible()

    // The brief only reaches a prompt on a run that generates, and this one never will.
    await expect(page.locator('#top details')).toHaveCount(0)

    await input.fill(`https://example.com/?anon-hero=${Date.now()}`)
    await page.locator('#top button[type="submit"]').click()

    await page.waitForURL(/\/r\/[0-9a-f-]+$/, { timeout: 150_000 })
    await expect(page.getByTestId('measured-readout')).toBeVisible()
    await expect(page.getByTestId('unlock-wall')).toBeVisible()
  })
})
