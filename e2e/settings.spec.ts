import { expect, test } from '@playwright/test'

/**
 * The account screen: what it is called, where it is reached from, and how wide it sits.
 *
 * **Nothing here posts to the billing route.** That call reaches Mercado Pago and opens a real
 * subscription, so the suite stops at the button being there.
 */
test('the account screen fills its column and nothing sits at half the width', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/settings')

  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible()

  const column = page.locator('main > div').first()
  const columnBox = await column.boundingBox()
  expect(columnBox).not.toBeNull()

  const card = page.getByTestId('brand-settings').locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
  const cardBox = await card.boundingBox()
  expect(cardBox).not.toBeNull()

  // Same left edge and the same width as the column: a card capped on its own used to sit at about
  // half of it, which reads as a layout bug rather than as a measure.
  expect(Math.abs(cardBox!.x - columnBox!.x)).toBeLessThan(2)
  expect(Math.abs(cardBox!.width - columnBox!.width)).toBeLessThan(2)
})

test('the account screen hangs off the account menu, not the main nav', async ({ page }) => {
  await page.goto('/dashboard')

  const nav = page.locator('header nav')
  await expect(nav.getByRole('link', { name: 'Settings' })).toHaveCount(0)

  const menu = page.getByTestId('account-menu')
  await menu.locator('summary').click()

  const link = menu.getByRole('link', { name: 'Settings' })
  await expect(link).toBeVisible()

  await link.click()
  await expect(page).toHaveURL(/\/settings$/)
})

/**
 * The card form evaluates strings, so its page needs `unsafe-eval`, and no other page may have it.
 *
 * **Next applies the later of two matching header rules**, so declaring them in the wrong order
 * serves the checkout the general policy. That is invisible while the policy is report-only and
 * breaks the form the moment it is enforced, which is how it reached production once.
 */
test('only the checkout page may evaluate strings', async ({ request }) => {
  const policyOf = async (path: string) => {
    const headers = (await request.get(path, { maxRedirects: 0 })).headers()
    return headers['content-security-policy'] ?? headers['content-security-policy-report-only'] ?? ''
  }

  expect(await policyOf('/settings')).toContain("'unsafe-eval'")

  for (const path of ['/', '/dashboard', '/r/00000000-0000-4000-8000-000000000000']) {
    expect(await policyOf(path), path).not.toContain("'unsafe-eval'")
  }

  // The anti-fraud check and the card fields both call home; blocking either leaves a form that
  // does nothing.
  const checkout = await policyOf('/settings')
  for (const host of [
    'https://secure-fields.mercadopago.com',
    'https://www.mercadolibre.com',
    'https://www.mercadolivre.com'
  ]) {
    expect(checkout, host).toMatch(new RegExp(`connect-src[^;]*${host.replaceAll('.', '\\.')}`))
  }
})

test('an account with no live subscription is offered the plans', async ({ page }) => {
  await page.goto('/settings')

  await expect(page.getByRole('heading', { name: 'What it costs' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Subscribe' })).toHaveCount(3)

  // A checkout nobody finished is not a subscription, so it must not replace the price list with a
  // cancel button. See docs/invariants.md.
  await expect(page.getByRole('heading', { name: 'Your subscription' })).toHaveCount(0)
})
