import { expect, test } from '@playwright/test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, hypotheses, variants } from '@/db/schema'
import { answerBrief } from './brief'
import { ALTERNATES_PER_ROUND, VARIANT_ROUNDS_MAX } from '@/lib/constants'

const URL_UNDER_TEST = `https://example.com/?rounds=${Date.now()}`

/**
 * Asking for more lines, and the ceiling on how often.
 *
 * **The cap is what keeps the cost of a credit knowable.** Without it the only limit is the hourly
 * rate limit, and somebody insistent spends several times in tokens what they paid. See
 * lib/variant-rounds.ts.
 */
test('more lines can be asked for, and the rounds run out', async ({ page }) => {
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

    const card = page.getByTestId('hypothesis-card').first()
    await card.getByRole('button', { name: 'Other options' }).click()
    await expect(card.getByTestId('alternate-variant')).toHaveCount(2)

    // One round is spent by opening the drawer, so the rest are spent by asking for a direction.
    for (let round = 2; round <= VARIANT_ROUNDS_MAX; round++) {
      await card.getByRole('button', { name: 'Shorter' }).click()
      await expect(card.getByTestId('alternate-variant')).toHaveCount(round * 2)
    }

    // Spent, so the directions go and the card says why rather than leaving a dead button.
    await expect(card.getByRole('button', { name: 'Shorter' })).toHaveCount(0)
    await expect(card).toContainText('No rounds left on this line')

    // The cap held in the database too, not only in the card.
    const [analysis] = await db.select().from(analyses).where(eq(analyses.url, URL_UNDER_TEST))
    const rows = await db.select().from(hypotheses).where(eq(hypotheses.analysisId, analysis.id))
    const lines = await db
      .select()
      .from(variants)
      .where(eq(variants.hypothesisId, rows[0].id))

    expect(lines.length).toBeLessThanOrEqual(1 + ALTERNATES_PER_ROUND * VARIANT_ROUNDS_MAX)
  } finally {
    await db.delete(analyses).where(eq(analyses.url, URL_UNDER_TEST))
  }
})
