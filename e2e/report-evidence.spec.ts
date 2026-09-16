import { expect, test } from '@playwright/test'
import { pinEnglish } from './locale'

const NOTE = 'Ran this before our call on Thursday. The first two are the ones I would start with.'

/**
 * What the reader of a report gets beyond the error titles: how bad each one is, what it costs, and
 * whatever the agency wrote at the top. All three are rendered from the analysis, so one run covers
 * them.
 */
test('a report carries severity, business impact and the agency note its reader sees', async ({
  page,
  browser
}) => {
  test.setTimeout(180_000)

  await page.goto('/dashboard')
  await page.fill('input[name="url"]', `https://example.com/?t=${Date.now()}-evidence`)
  await page.getByRole('button', { name: 'Analyze' }).click()
  await page.waitForURL(/\/r\/[0-9a-f-]+$/)
  const reportUrl = page.url()

  // The top of the report: the three biggest problems, each labelled and costed.
  const startHere = page.getByTestId('start-here')
  await expect(startHere.getByRole('heading', { name: 'The three biggest problems' })).toBeVisible()
  await expect(startHere.getByText('Critical').first()).toBeVisible()
  await expect(
    startHere.getByText('Visitors who will not invent another password leave without an account.')
  ).toBeVisible()

  // The owner writes a note, and it is the agency's voice rather than ours.
  const editor = page.getByTestId('agency-note-editor')
  await editor.locator('textarea[name="note"]').fill(NOTE)
  await editor.getByRole('button', { name: 'Save note' }).click()
  await expect(page.getByText('Note saved.')).toBeVisible()

  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  await pinEnglish(context)
  const reader = await context.newPage()
  await reader.goto(reportUrl)

  await expect(reader.getByText(NOTE)).toBeVisible()
  // The reader gets the note, never the field that wrote it, and no control meant for the owner.
  await expect(reader.getByTestId('agency-note-editor')).toHaveCount(0)
  await expect(reader.getByRole('link', { name: 'Send on WhatsApp' })).toHaveCount(0)

  // The owner does get it, and it names nobody: wa.me with only a message.
  const share = page.getByRole('link', { name: 'Send on WhatsApp' })
  await expect(share).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=/)

  // Emptying it removes the note rather than leaving a blank line on the client's report. Polled
  // through a reload rather than waiting on the status line: that line is still showing the previous
  // save, so it says nothing about this one.
  await editor.locator('textarea[name="note"]').fill('')
  await editor.getByRole('button', { name: 'Save note' }).click()

  await expect
    .poll(
      async () => {
        await reader.reload()
        return reader.getByText(NOTE).count()
      },
      { message: 'the cleared note should stop rendering for the reader' }
    )
    .toBe(0)

  await context.close()
})

/**
 * The landing sends anyone with an account to the dashboard, so the price list has to exist behind
 * the sign-in too. Without this the checkout is reachable only by signing out.
 */
test('a signed-in account without a subscription can reach the checkout', async ({ page }) => {
  await page.goto('/settings')

  const plans = page.getByRole('heading', { name: 'What it costs' })
  await expect(plans).toBeVisible()

  for (const plan of ['Studio', 'Agency', 'Network']) {
    await expect(page.getByRole('heading', { name: plan, exact: true })).toBeVisible()
  }

  await expect(page.getByRole('button', { name: 'Subscribe' })).toHaveCount(3)

  // The dashboard's dead end points at it rather than leaving the reader to find it.
  await page.goto('/dashboard')
  const quotaLine = page.getByTestId('dashboard-quota')
  await expect(quotaLine).toBeVisible()
})

/**
 * Bulk generation is sold with the two larger tiers, and the e2e account is on none: it has a quota
 * an operator set rather than a subscription. So the entry point is hidden and, what actually
 * matters, the route refuses.
 */
test('bulk generation is refused to an account whose tier does not include it', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('link', { name: 'In bulk' })).toHaveCount(0)

  await page.goto('/dashboard/bulk')
  await expect(page.getByText('There is nothing at this link')).toBeVisible()

  const refused = await page.request.post('/api/analyses/bulk', {
    data: { urls: 'https://example.com' }
  })

  expect(refused.status()).toBe(403)
  expect((await refused.json()).error).toBe('forbidden')
})
