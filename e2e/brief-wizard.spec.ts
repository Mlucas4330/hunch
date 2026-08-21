import { expect, test } from '@playwright/test'

// Anonymous: the wizard sits on the same form a signed-out visitor uses, so this needs no session.
test.describe('brief wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('is four tapped steps, and answering one advances', async ({ page }) => {
    await page.getByText('Add business details (optional)').click()

    await expect(page.getByText('Step 1 of 4')).toBeVisible()
    await expect(page.getByText('Who lands on this page?')).toBeVisible()

    await page.getByRole('button', { name: 'Small businesses and their owners' }).click()

    await expect(page.getByText('Step 2 of 4')).toBeVisible()
    await expect(page.getByText('What are you selling them?')).toBeVisible()
  })

  test('choosing never moves the page', async ({ page }) => {
    await page.getByText('Add business details (optional)').click()
    const before = await page.evaluate(() => window.scrollY)

    await page.getByRole('button', { name: 'Small businesses and their owners' }).click()
    await page.getByRole('button', { name: 'Software on a subscription' }).click()

    expect(await page.evaluate(() => window.scrollY)).toBe(before)
  })

  test('something else takes free text, and Enter does not submit the analysis', async ({
    page
  }) => {
    await page.getByText('Add business details (optional)').click()
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
