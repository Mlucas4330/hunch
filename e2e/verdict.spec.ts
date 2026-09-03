import { expect, test, type Page } from '@playwright/test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, hypotheses } from '@/db/schema'
import { answerBrief } from './brief'
import { pinEnglish } from './locale'

/**
 * The owner's verdict, which is the only judgement this product holds about its own output.
 *
 * It records that somebody decided, never that a change worked. Nothing asserted here reads a
 * verdict as a result -- see docs/invariants.md.
 */

const URL_UNDER_TEST = `https://example.com/?verdict=${Date.now()}`

async function openSection(page: Page, section: string) {
  const panel = page.getByTestId(`analysis-section-${section}`)
  const details = panel.locator('details').first()
  if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open))) {
    await panel.locator('summary').first().click()
  }
}

test('the owner decides on a fix, and the decision is what gets stored', async ({ page, browser }) => {
  test.setTimeout(180_000)

  await page.goto('/dashboard')
  await page.fill('input[name="url"]', URL_UNDER_TEST)
  await answerBrief(page)
  await page.getByRole('button', { name: 'Analyze' }).click()
  await page.waitForURL(/\/r\/[0-9a-f-]+$/)
  const reportUrl = page.url()

  await openSection(page, 'copy')
  const card = page.getByTestId('hypothesis-card').first()
  const verdict = card.getByTestId('fix-verdict')

  // Undecided is the state every row starts in, and it is not the same as decided against.
  await expect(verdict.getByRole('button', { name: 'I applied this' })).toBeVisible()
  await verdict.getByRole('button', { name: 'I applied this' }).click()
  await expect(verdict).toHaveAttribute('data-verdict', 'applied')

  const [analysis] = await db.select().from(analyses).where(eq(analyses.url, URL_UNDER_TEST))
  await expect
    .poll(async () => {
      const rows = await db.select().from(hypotheses).where(eq(hypotheses.analysisId, analysis.id))
      return rows.filter((row) => row.verdict === 'applied').length
    })
    .toBe(1)

  // Taking it back is its own state, not a dismissal. An acceptance rate over decided rows would be
  // wrong the moment those two collapsed into one.
  await verdict.getByRole('button', { name: 'undo' }).click()
  await expect(verdict.getByRole('button', { name: 'I applied this' })).toBeVisible()

  await expect
    .poll(async () => {
      const rows = await db.select().from(hypotheses).where(eq(hypotheses.analysisId, analysis.id))
      return rows.filter((row) => row.verdict !== null).length
    })
    .toBe(0)

  // The flow list carries the same control, on the other table.
  await openSection(page, 'flow')
  const fix = page.getByTestId('flow-fix').first()
  await fix.getByTestId('fix-verdict').getByRole('button', { name: 'Not for me' }).click()
  await expect(fix.getByTestId('fix-verdict')).toHaveAttribute('data-verdict', 'dismissed')

  // **Whoever holds the link sees the fixes and never the decisions.** A report is handed to a
  // client and to a partner, and what the owner threw out is not theirs to read.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  await pinEnglish(context)
  const anon = await context.newPage()
  await anon.goto(reportUrl)
  await expect(anon.getByTestId('flow-fix').first()).toBeVisible()
  await expect(anon.getByTestId('fix-verdict')).toHaveCount(0)
  await context.close()

  await db.delete(analyses).where(eq(analyses.url, URL_UNDER_TEST))
})

test('a verdict on somebody else s analysis is a 404, not a 403', async ({ page }) => {
  const res = await page.request.patch('/api/verdicts', {
    data: {
      target: 'hypothesis',
      id: '00000000-0000-4000-8000-000000000000',
      verdict: 'applied'
    }
  })

  expect(res.status()).toBe(404)
})
