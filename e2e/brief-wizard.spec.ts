import { expect, test, type Page } from '@playwright/test'

// The panel the wizard sits in opens to its own height: details::details-content in app/globals.css
// transitions block-size, so the click on the summary returns while the page is still growing under
// it, and the growth starts a frame or two later still. Clicking an option in that window makes the
// page move, which is exactly what 'choosing never moves the page' asserts never happens.
//
// So every test here waits for the height to stop changing first, over a window longer than the
// transition -- two consecutive frames are not enough, because the pair can be sampled before the
// transition has started. It keeps these tests about the wizard rather than about the panel opening.
//
// It only ever failed where the dashboard is short enough for the panel to be what overflows the
// viewport, which is CI on a database with no history in it, never a populated laptop.
const SETTLE_MS = 300

async function openBrief(page: Page) {
  // Already open wherever the reader has a credit, because there the four answers are the price
  // rather than an offer. Clicking the summary then would shut it.
  const closed = page.getByText('Add business details (optional)')
  if ((await closed.count()) > 0) await closed.click()
  await expect(page.getByText('Step 1 of 4')).toBeVisible()

  await page.waitForFunction(
    (settleMs) =>
      new Promise<boolean>((resolve) => {
        const before = document.documentElement.scrollHeight
        setTimeout(() => resolve(document.documentElement.scrollHeight === before), settleMs)
      }),
    SETTLE_MS
  )
}

// Anonymous: the wizard sits on the same form a signed-out visitor uses, so this needs no session.
test.describe('brief wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('is four tapped steps, and answering one advances', async ({ page }) => {
    await openBrief(page)

    await expect(page.getByText('Who lands on this page?')).toBeVisible()

    await page.getByRole('button', { name: 'Small businesses and their owners' }).click()

    await expect(page.getByText('Step 2 of 4')).toBeVisible()
    await expect(page.getByText('What are you selling them?')).toBeVisible()
  })

  test('choosing never moves the page', async ({ page }) => {
    await openBrief(page)
    const before = await page.evaluate(() => window.scrollY)

    await page.getByRole('button', { name: 'Small businesses and their owners' }).click()
    await page.getByRole('button', { name: 'Software or an app' }).click()

    expect(await page.evaluate(() => window.scrollY)).toBe(before)
  })

  // The state a carried-over brief opens straight into. Getting there by answering all four is the
  // same code path the dashboard reaches when `defaultBrief` already holds every answer, and it
  // needs no seeded history to arrange.
  test('the fourth answer lands on a summary of all four, each changeable', async ({ page }) => {
    await openBrief(page)

    for (const option of [
      'Small businesses and their owners',
      'Software or an app',
      'Buy, right here',
      'They cannot tell what it actually does'
    ]) {
      await page.getByRole('button', { name: option }).click()
    }

    await expect(page.getByText('Step 4 of 4')).toHaveCount(0)
    await expect(page.getByText('Audience')).toBeVisible()
    await expect(page.getByText('Objection')).toBeVisible()
    await expect(page.getByText('Small businesses and their owners')).toBeVisible()

    // Changing one reopens that question alone, and answering it returns to the summary rather than
    // walking the reader through the three they did not ask to change.
    await page.getByRole('button', { name: 'Change' }).nth(1).click()
    await expect(page.getByText('What are you selling them?')).toBeVisible()

    await page.getByRole('button', { name: 'A service I deliver myself' }).click()
    await expect(page.getByText('A service I deliver myself')).toBeVisible()
    await expect(page.getByText('What are you selling them?')).toHaveCount(0)
  })

  test('something else takes free text, and Enter does not submit the analysis', async ({
    page
  }) => {
    await openBrief(page)
    await page.getByRole('button', { name: 'Something else' }).click()

    await page.getByPlaceholder('Describe it in your own words').fill('Dentists in Porto Alegre')
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText('Step 2 of 4')).toBeVisible()

    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page.getByRole('button', { name: 'Dentists in Porto Alegre' })).toHaveCount(0)
    await expect(page.getByText('Step 1 of 4')).toBeVisible()
  })
})
