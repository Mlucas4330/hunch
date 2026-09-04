import { expect, test } from '@playwright/test'
import { answerBrief } from './brief'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'

// The marker `lib/analyze.ts` looks for. The e2e web server starts once with a fixed environment, so
// a scenario cannot be switched on with a variable; every spec separates its own by URL, and this
// follows that.
const URL_UNDER_TEST = 'https://example.com/?hunch-e2e-unquoted'

/**
 * What happens to a rewrite whose `current_copy` is on no element of the page.
 *
 * **The card is dropped, and the report is one card shorter than the model's answer.** The prompt
 * requires the quote verbatim off the element list it was given, Zod sees a plain string, and the
 * reader's card renders that quote struck through as what their page says today. So an unmatched one
 * is a sentence a model wrote being presented as a measurement, and it is checked on the way back
 * rather than asked for in the prompt.
 *
 * The fixture withholds the first element, which is the only way to reach this without a real model.
 * Six hypotheses come back, five survive, and the rest of the report is untouched: the drop is not a
 * failure and nothing is refunded, because the reader was still sold a finished analysis.
 */
test('a rewrite quoting a line the page does not carry never reaches the reader', async ({
  page
}) => {
  test.setTimeout(180_000)

  await page.goto('/dashboard')
  await page.fill('input[name="url"]', URL_UNDER_TEST)
  await answerBrief(page)
  await page.getByRole('button', { name: 'Analyze' }).click()
  await page.waitForURL(/\/r\/[0-9a-f-]+$/, { timeout: 150_000 })

  try {
    const panel = page.getByTestId('analysis-section-copy')
    const details = panel.locator('details').first()
    if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open))) {
      await panel.locator('summary').first().click()
    }

    // Six in the fixture, one of them quoting a line no element carries.
    await expect(page.getByTestId('hypothesis-card')).toHaveCount(5)

    // And it is the dropped one that is gone, not simply the last. The headline hypothesis is first
    // in the fixture, so it is the one whose element was withheld.
    await expect(page.getByTestId('hypothesis-card').first()).not.toContainText(
      'The headline describes the product category'
    )

    // The drop is not a failure: the reader keeps the readout and the other lists.
    await expect(page.getByTestId('measured-readout')).toBeVisible()
    await expect(page.getByTestId('generation-failed')).toHaveCount(0)
  } finally {
    await db.delete(analyses).where(eq(analyses.url, URL_UNDER_TEST))
  }
})
