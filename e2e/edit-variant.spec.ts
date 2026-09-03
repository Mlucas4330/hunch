import { expect, test } from '@playwright/test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, hypotheses, variants } from '@/db/schema'
import { answerBrief } from './brief'
import { pinEnglish } from './locale'

const URL_UNDER_TEST = `https://example.com/?edit=${Date.now()}`
const MY_LINE = 'Ship a landing page that says what it does'

/**
 * The owner writing their own line.
 *
 * **It is a new row, never an overwrite.** What the model proposed stays beside what the reader
 * published, and the distance between the two is the most precise thing this product can know about
 * its own copy -- produced by somebody using the tool rather than by anybody sitting down to label
 * anything. `scripts/rewrite-stats.mts` reads it back.
 */
test('the owner rewrites the line, and what the model wrote stays in the row', async ({
  page,
  browser
}) => {
  test.setTimeout(180_000)

  await page.goto('/dashboard')
  await page.fill('input[name="url"]', URL_UNDER_TEST)
  await answerBrief(page)
  await page.getByRole('button', { name: 'Analyze' }).click()
  await page.waitForURL(/\/r\/[0-9a-f-]+$/, { timeout: 150_000 })
  const reportUrl = page.url()

  async function linesOf(analysisId: string) {
    const rows = await db.select().from(hypotheses).where(eq(hypotheses.analysisId, analysisId))
    const all = await Promise.all(
      rows.map((row) => db.select().from(variants).where(eq(variants.hypothesisId, row.id)))
    )
    return all.flat()
  }

  try {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.url, URL_UNDER_TEST))
    const before = await linesOf(analysis.id)
    expect(before.every((line) => line.author === 'model')).toBe(true)

    const panel = page.getByTestId('analysis-section-copy')
    const details = panel.locator('details').first()
    if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open))) {
      await panel.locator('summary').first().click()
    }

    const card = page.getByTestId('hypothesis-card').first()
    await card.getByRole('button', { name: 'Write my own' }).click()
    const editor = card.getByTestId('variant-editor')
    await editor.locator('textarea').fill(MY_LINE)
    await editor.getByRole('button', { name: 'Save my line' }).click()

    // Their words on the card, marked as theirs: nothing here may read as generated when it was not.
    await expect(card).toContainText(MY_LINE)
    await expect(card).toContainText('Your words')

    const after = await linesOf(analysis.id)
    const mine = after.filter((line) => line.author === 'owner')
    expect(mine).toHaveLength(1)
    expect(mine[0].copy).toBe(MY_LINE)
    // The chosen line is position 0, which is what the card, the screenshot route and the harness
    // all read.
    expect(mine[0].position).toBe(0)
    // Nobody argues for their own sentence.
    expect(mine[0].evidence).toBeNull()

    // **Every line the model wrote is still there.** An edit that overwrote one would destroy the
    // only comparison that says how close the generation was.
    for (const line of before) {
      expect(after.some((row) => row.id === line.id && row.copy === line.copy)).toBe(true)
    }

    // Owner only, like every other control that changes the document.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    await pinEnglish(context)
    const anon = await context.newPage()
    await anon.goto(reportUrl)
    await expect(anon.getByRole('button', { name: 'Write my own' })).toHaveCount(0)
    await context.close()
  } finally {
    await db.delete(analyses).where(eq(analyses.url, URL_UNDER_TEST))
  }
})
