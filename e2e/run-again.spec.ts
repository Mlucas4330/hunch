import { expect, test } from '@playwright/test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, analysisRuns, hypotheses, pageSnapshots, users } from '@/db/schema'
import { quotaFor } from '@/lib/quota'
import { E2E_QUOTA } from '../playwright.config'
import { pinEnglish } from './locale'

const URL_UNDER_TEST = `https://example.com/?run-again=${Date.now()}`

/**
 * "Run again" measures the page and rewrites the lists on the same report. It spends one run of the
 * month, keeps the score history, and a deleted analysis does not give the run back.
 */
test('running a page again rewrites the report, keeps the history and spends one run', async ({
  page,
  browser
}) => {
  test.setTimeout(240_000)

  const email = process.env.ADMIN_EMAIL
  if (!email) throw new Error('ADMIN_EMAIL must be set')
  const [owner] = await db.select().from(users).where(eq(users.email, email))

  await page.goto('/dashboard')
  await page.fill('input[name="url"]', URL_UNDER_TEST)
  await page.getByRole('button', { name: 'Analyze' }).click()
  await page.waitForURL(/\/r\/[0-9a-f-]+$/, { timeout: 150_000 })
  await expect(page.getByTestId('analysis-sections')).toBeVisible({ timeout: 60_000 })

  const reportUrl = page.url()
  const [row] = await db.select().from(analyses).where(eq(analyses.url, URL_UNDER_TEST))

  try {
    const before = await quotaFor(owner.id)
    const listed = (await db.select().from(hypotheses).where(eq(hypotheses.analysisId, row.id))).length

    await expect(page.getByTestId('run-again-trend-start')).toBeVisible()
    await page.getByTestId('run-again').getByRole('button', { name: 'Run again' }).click()

    // The second snapshot is what draws the trend, and it lands with the new run.
    await expect(page.getByTestId('readout-trend')).toBeVisible({ timeout: 120_000 })
    await expect(page.getByTestId('run-again')).toBeVisible()

    const runs = await db.select().from(analysisRuns).where(eq(analysisRuns.analysisId, row.id))
    expect(runs).toHaveLength(2)
    expect(runs.every((run) => run.finishedAt !== null)).toBe(true)

    const snapshots = await db.select().from(pageSnapshots).where(eq(pageSnapshots.analysisId, row.id))
    expect(snapshots).toHaveLength(2)

    // Replaced, not appended.
    const relisted = await db.select().from(hypotheses).where(eq(hypotheses.analysisId, row.id))
    expect(relisted).toHaveLength(listed)

    expect((await quotaFor(owner.id)).used).toBe(before.used + 1)

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    await pinEnglish(context)
    const anon = await context.newPage()
    await anon.goto(reportUrl)
    await expect(anon.getByTestId('measured-readout')).toBeVisible()
    await expect(anon.getByTestId('run-again')).toHaveCount(0)
    await context.close()

    try {
      const { used } = await quotaFor(owner.id)
      await db.update(users).set({ monthlyQuota: used }).where(eq(users.id, owner.id))

      await page.reload()
      const control = page.getByTestId('run-again')
      await expect(control.getByRole('button', { name: 'Run again' })).toBeDisabled()
      await expect(control.getByText('No analyses left this month.')).toBeVisible()
    } finally {
      await db.update(users).set({ monthlyQuota: E2E_QUOTA }).where(eq(users.id, owner.id))
    }

    const usedBeforeDelete = (await quotaFor(owner.id)).used
    const deleted = await page.request.delete(`/api/analyses/${row.id}`)
    expect(deleted.ok()).toBe(true)
    expect((await quotaFor(owner.id)).used).toBe(usedBeforeDelete)
  } finally {
    await db.delete(analyses).where(eq(analyses.id, row.id))
  }
})
