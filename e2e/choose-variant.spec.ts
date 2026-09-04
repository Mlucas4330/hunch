import { expect, test } from '@playwright/test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { answerBrief } from './brief'
import { pinEnglish } from './locale'

const URL_UNDER_TEST = `https://example.com/?choose=${Date.now()}`

/**
 * Choosing one of the written lines.
 *
 * **An option must not be a dead end.** A drawer that renders each alternate as a paragraph and
 * nothing else, with no way to take one, preview one or act on one, makes the reader do the triage
 * they paid to avoid.
 *
 * Choosing is reordering, because position 0 already means "the one" to the card, to the screenshot
 * route and to the harness.
 */
test('an alternate can be taken, and the card then shows that line', async ({ page, browser }) => {
  test.setTimeout(180_000)

  await page.goto('/dashboard')
  await page.fill('input[name="url"]', URL_UNDER_TEST)
  await answerBrief(page)
  await page.getByRole('button', { name: 'Analyze' }).click()
  await page.waitForURL(/\/r\/[0-9a-f-]+$/, { timeout: 150_000 })
  const reportUrl = page.url()

  try {
    const panel = page.getByTestId('analysis-section-copy')
    const details = panel.locator('details').first()
    if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open))) {
      await panel.locator('summary').first().click()
    }

    const card = page.getByTestId('hypothesis-card').first()
    await card.getByRole('button', { name: 'Other options' }).click()

    const alternates = card.getByTestId('alternate-variant')
    await expect(alternates).toHaveCount(2)

    // The line the fixture writes as the first alternate. It has to leave the drawer and appear as
    // the card's replacement, and the one it displaces has to take its place in the drawer.
    const taken = 'The workspace that gets [your core job] done in [timeframe]'
    await expect(alternates.first()).toContainText(taken)

    await alternates.first().getByRole('button', { name: 'Use this one' }).click()

    await expect(card.getByTestId('alternate-variant').first()).not.toContainText(taken)
    await expect(alternates).toHaveCount(2)

    // Position, not a second column: a reload reads the same answer off the row.
    await page.reload()
    const reopened = page.getByTestId('analysis-section-copy').locator('details').first()
    if (!(await reopened.evaluate((el) => (el as HTMLDetailsElement).open))) {
      await page.getByTestId('analysis-section-copy').locator('summary').first().click()
    }
    await expect(page.getByTestId('hypothesis-card').first()).toContainText(taken)

    // Owner only, like the drawer that writes them.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    await pinEnglish(context)
    const anon = await context.newPage()
    await anon.goto(reportUrl)
    await expect(anon.getByRole('button', { name: 'Use this one' })).toHaveCount(0)
    await context.close()
  } finally {
    await db.delete(analyses).where(eq(analyses.url, URL_UNDER_TEST))
  }
})
