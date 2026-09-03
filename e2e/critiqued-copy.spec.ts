import { expect, test } from '@playwright/test'
import { answerBrief } from './brief'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'

// The marker `lib/analyze.ts` looks for, alongside `hunch-e2e-unquoted` and `hunch-e2e-permutation`.
const URL_UNDER_TEST = 'https://example.com/?hunch-e2e-critique'

/**
 * What happens to a rewrite the second pass refuses.
 *
 * **The call that writes a rewrite also decides it was worth writing**, which is the arrangement that
 * produced an `assessment` saying the CTA removed the cost objection in the same response that
 * deleted the word "free". Judging is a different job, so it is a different call, and its schema has
 * no field for a replacement: it can only take rewrites away.
 *
 * The fixture supplies the critic's answer and nothing else. `applyCritique` is the real one, so what
 * this walks is the code that acts on a refusal rather than a model pretending to make one. Six come
 * back, five survive, and nothing else about the report moves: a dropped card is not a failed
 * generation and no credit is returned.
 */
test('a rewrite the second pass refuses never reaches the reader', async ({ page }) => {
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

    // Index 1 is the headline hypothesis, so it is the one that has to be gone.
    await expect(page.getByTestId('hypothesis-card').first()).not.toContainText(
      'The headline describes the product category'
    )

    await expect(page.getByTestId('measured-readout')).toBeVisible()
    await expect(page.getByTestId('generation-failed')).toHaveCount(0)
  } finally {
    await db.delete(analyses).where(eq(analyses.url, URL_UNDER_TEST))
  }
})
