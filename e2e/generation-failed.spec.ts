import { expect, test } from '@playwright/test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, analysisRuns, flowFixes, hypotheses, users } from '@/db/schema'
import { quotaFor } from '@/lib/quota'

const URL_UNDER_TEST = 'https://example.com/?generation-failed'

/**
 * What a reader sees when the run threw, and what it costs the account.
 *
 * The spec runs a real analysis and then puts the rows into the shape a failure leaves: the generated
 * rows gone and the run's `failed_at` set, which is exactly what `runAnalysis` writes from its
 * `catch`. The job is long gone by then, so the column is the only thing left saying the run failed.
 */
test('a failed generation shows what happened and does not count against the quota', async ({
  page
}) => {
  test.setTimeout(180_000)

  const email = process.env.ADMIN_EMAIL
  if (!email) throw new Error('ADMIN_EMAIL must be set')
  const [owner] = await db.select().from(users).where(eq(users.email, email))

  await page.goto('/dashboard')
  await page.fill('input[name="url"]', URL_UNDER_TEST)
  await page.getByRole('button', { name: 'Analyze' }).click()
  await page.waitForURL(/\/r\/[0-9a-f-]+$/, { timeout: 150_000 })

  // The happy path first, so a failure of this spec cannot be mistaken for the report being broken.
  await expect(page.getByTestId('analysis-sections')).toBeVisible()

  const [row] = await db.select().from(analyses).where(eq(analyses.url, URL_UNDER_TEST))

  try {
    const before = await quotaFor(owner.id)

    await db.delete(hypotheses).where(eq(hypotheses.analysisId, row.id))
    await db.delete(flowFixes).where(eq(flowFixes.analysisId, row.id))
    await db.update(analysisRuns).set({ failedAt: new Date() }).where(eq(analysisRuns.analysisId, row.id))

    await page.reload()

    await expect(page.getByTestId('generation-failed')).toBeVisible()
    // The measurement was committed before the generation started, so it stays.
    await expect(page.getByTestId('measured-readout')).toBeVisible()

    const after = await quotaFor(owner.id)
    expect(after.used).toBe(before.used - 1)
  } finally {
    await db.delete(analyses).where(eq(analyses.id, row.id))
  }
})
