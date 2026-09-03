import { expect, test } from '@playwright/test'
import { answerBrief } from './brief'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'

// The marker `lib/analyze.ts` looks for, alongside `hunch-e2e-unquoted`. The e2e web server starts
// once with a fixed environment, so a scenario is selected by URL like every other spec's.
const URL_UNDER_TEST = 'https://example.com/?hunch-e2e-permutation'

/**
 * What happens to a replacement built entirely out of the words it replaces.
 *
 * **It never reaches the reader**, because it cannot be an improvement to any page. Two of the 32
 * real rewrites stored during development were exactly this: one reordered three security badges,
 * another swapped two sentences, and both were ranked and shown as recommended changes with an
 * impact score beside them.
 *
 * The fixture reverses the first hypothesis's own words, which is a permutation by construction. Six
 * come back, five survive, and nothing else about the report moves: a dropped card is not a failed
 * generation and no credit is returned, because the reader was still sold a finished analysis.
 */
test('a replacement made only of the words it replaces never reaches the reader', async ({
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

    await expect(page.getByTestId('hypothesis-card')).toHaveCount(5)

    // The headline hypothesis is the one the fixture permutes, so it is the one that has to be gone.
    await expect(page.getByTestId('hypothesis-card').first()).not.toContainText(
      'The headline describes the product category'
    )

    await expect(page.getByTestId('measured-readout')).toBeVisible()
    await expect(page.getByTestId('generation-failed')).toHaveCount(0)
  } finally {
    await db.delete(analyses).where(eq(analyses.url, URL_UNDER_TEST))
  }
})
