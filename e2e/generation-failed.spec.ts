import { expect, test } from '@playwright/test'
import { answerBrief } from './brief'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, creditTransactions, flowFixes, hypotheses, users } from '@/db/schema'

const URL_UNDER_TEST = 'https://example.com/?generation-failed'

/**
 * What a reader sees when the generation threw and the credit went back.
 *
 * **This was the unlock wall**, because a failed generation leaves an owned, measured analysis with
 * no hypotheses -- byte for byte what a claimed free run looks like. So the person who had paid,
 * waited and been refunded was shown a lock and a button to buy a credit.
 *
 * The spec runs a real analysis and then puts the row into the shape a failure leaves: the generated
 * rows gone, a `refund` in the ledger against that analysis. That is the state rather than a
 * simulation of it -- `refundCredit` writes exactly this, from the one `catch` in lib/run-analysis.ts.
 *
 * Doing it this way also covers the case a thrown exception could not: **the job is long gone.** Its
 * TTL is ten minutes and nothing here is in flight, so the only thing left saying the generation
 * failed is the ledger row -- which is the whole reason the state is read from there.
 */
test('a failed generation shows what happened, never the wall', async ({ page }) => {
  test.setTimeout(180_000)

  const email = process.env.ADMIN_EMAIL
  if (!email) throw new Error('ADMIN_EMAIL must be set')
  const [owner] = await db.select().from(users).where(eq(users.email, email))

  await page.goto('/dashboard')
  await page.fill('input[name="url"]', URL_UNDER_TEST)
  await answerBrief(page)
  await page.getByRole('button', { name: 'Analyze' }).click()
  await page.waitForURL(/\/r\/[0-9a-f-]+$/, { timeout: 150_000 })

  // The happy path first, so a failure of this spec cannot be mistaken for the report being broken.
  await expect(page.getByTestId('analysis-sections')).toBeVisible()

  const [row] = await db.select().from(analyses).where(eq(analyses.url, URL_UNDER_TEST))

  try {
    await db.delete(hypotheses).where(eq(hypotheses.analysisId, row.id))
    await db.delete(flowFixes).where(eq(flowFixes.analysisId, row.id))
    await db
      .insert(creditTransactions)
      .values({ userId: owner.id, delta: 1, reason: 'refund', analysisId: row.id })

    await page.reload()

    await expect(page.getByTestId('generation-failed')).toBeVisible()
    await expect(page.getByTestId('unlock-wall')).toHaveCount(0)

    // The half that was already paid for in browser time is still the reader's. It was committed
    // before the generation started, which is what makes this recoverable rather than wasted.
    await expect(page.getByTestId('measured-readout')).toBeVisible()
  } finally {
    await db.delete(creditTransactions).where(eq(creditTransactions.analysisId, row.id))
    await db.delete(analyses).where(eq(analyses.id, row.id))
  }
})

/**
 * The mirror of the test above, and the reason the state is not simply "owned and empty".
 *
 * An owned analysis with nothing generated and **no** refund is somebody who claimed a free run and
 * never bought the written half. Nothing is coming for them, so the wall is right -- and if this
 * ever starts showing the failure notice instead, the product is telling people their credit came
 * back when nothing was ever charged.
 */
test('an owned analysis with no refund still gets the wall', async ({ page }) => {
  test.setTimeout(180_000)

  await page.goto('/dashboard')
  await page.fill('input[name="url"]', `${URL_UNDER_TEST}-no-refund`)
  await answerBrief(page)
  await page.getByRole('button', { name: 'Analyze' }).click()
  await page.waitForURL(/\/r\/[0-9a-f-]+$/, { timeout: 150_000 })

  const [row] = await db
    .select()
    .from(analyses)
    .where(eq(analyses.url, `${URL_UNDER_TEST}-no-refund`))

  try {
    await db.delete(hypotheses).where(eq(hypotheses.analysisId, row.id))
    await db.delete(flowFixes).where(eq(flowFixes.analysisId, row.id))

    await page.reload()

    await expect(page.getByTestId('unlock-wall')).toBeVisible()
    await expect(page.getByTestId('generation-failed')).toHaveCount(0)
  } finally {
    await db.delete(analyses).where(eq(analyses.id, row.id))
  }
})

// There was a third spec here asserting the user had no `refund` rows left once these had run. It
// was wrong in a way worth recording: `credit_transactions.analysis_id` is `onDelete: 'set null'`, so
// deleting an analysis **keeps its ledger row and orphans it** -- which is correct for a ledger whose
// job is being auditable about money that really moved, and which means a dev database accumulates
// refunds pointing at nothing. Asserting on the user's whole ledger tested that history, not this
// feature. `wasRefunded` filters on a specific analysis id and a null never matches one, so the
// orphans are invisible to it.
