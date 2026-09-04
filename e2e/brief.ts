import { expect, type Page } from '@playwright/test'

/**
 * Answers the four questions a credit is spent on.
 *
 * **Every spec that expects a generated analysis needs this.** Filling the URL and pressing Analyze
 * buys the free half, so a spec that skips this lands on the unlock wall and reports a bug in
 * whatever it was actually testing. See `app/api/analyses/route.ts`.
 *
 * The panel is already open wherever the reader has a credit, which is every signed in spec in this
 * suite. Tapping an option advances on its own, so four taps is the whole interaction.
 */
export async function answerBrief(page: Page) {
  await expect(page.getByText('Step 1 of 4')).toBeVisible()

  for (const option of [
    'Small businesses and their owners',
    'Software or an app',
    'Buy, right here',
    'They cannot tell what it actually does'
  ]) {
    await page.getByRole('button', { name: option }).click()
  }
}
