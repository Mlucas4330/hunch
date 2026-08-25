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
  await page.getByText('Add business details (optional)').click()
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
    await page.getByRole('button', { name: 'Software on a subscription' }).click()

    expect(await page.evaluate(() => window.scrollY)).toBe(before)
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
