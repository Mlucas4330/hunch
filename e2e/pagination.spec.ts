import { expect, test } from '@playwright/test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, users } from '@/db/schema'

// Two pages need more rows than DEFAULT_PAGE_SIZE, and the suite's other specs do not create that
// many. Planted directly rather than through the form: this is about where the viewport lands after
// a click, and eleven real analyses would cost eleven browser runs to prove nothing extra.
const ROWS = 11
const MARKER = 'e2e:pagination'

test.describe('dashboard pagination', () => {
  test.beforeAll(async () => {
    const email = process.env.ADMIN_EMAIL
    if (!email) throw new Error('ADMIN_EMAIL must be set')

    const [admin] = await db.select().from(users).where(eq(users.email, email))

    await db.insert(analyses).values(
      Array.from({ length: ROWS }, (_, i) => ({
        userId: admin.id,
        url: `https://paging-${i}.example.com/`,
        brief: MARKER,
        structure: {} as never
      }))
    )
  })

  test.afterAll(async () => {
    await db.delete(analyses).where(eq(analyses.brief, MARKER))
  })

  test('paging does not throw the reader back to the top of the page', async ({ page }) => {
    await page.goto('/dashboard')

    const older = page.getByRole('link', { name: 'Older' })
    await older.scrollIntoViewIfNeeded()

    const before = await page.evaluate(() => window.scrollY)
    expect(before).toBeGreaterThan(0)

    await older.click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByText('Page 2 of')).toBeVisible()

    // The whole point: the controls stay under the cursor instead of the document jumping to 0.
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  })
})
