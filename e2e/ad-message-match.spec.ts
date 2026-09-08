import { expect, test, type Locator } from '@playwright/test'
import { pinEnglish } from './locale'

/**
 * The hero continues the sentence the reader clicked, and nothing else moves.
 *
 * **No account, no row, no analysis.** Every case here is one `goto` against a page a stranger can
 * reach, which is what makes the whole file cheap enough to run on every change to the landing copy.
 *
 * The assertions are as much about what stays put as about what moves: `cta` and `ctaNote` are read
 * twice on this page, and the closing card two thousand pixels down must never wear the ad's words.
 * See docs/ads.md.
 */

// `textContent` rather than `innerText`, so the control and the comparison are the same string:
// `innerText` returns what the CSS made of it, uppercased by `panel-label` and broken across the
// block span inside the headline, while `toHaveText` reads the DOM's own text.
async function textOf(locator: Locator): Promise<string> {
  const value = await locator.textContent()
  if (value === null) throw new Error('the control element is not on the page')
  return value
}

const HERO = '#top h1'
const LEAD = '#top h1 + p'

test.describe('the hero echoes the ad group', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ context }) => {
    await pinEnglish(context)
  })

  test('an ad group swaps the headline and the paragraph, and moves nothing else', async ({
    page
  }) => {
    await page.goto('/')
    const control = {
      headline: await textOf(page.locator(HERO)),
      lead: await textOf(page.locator(LEAD)),
      eyebrow: await textOf(page.locator('#top p').first()),
      submit: await textOf(page.locator('#top button[type="submit"]'))
    }

    await page.goto('/?ag=audit')

    await expect(page.locator(HERO)).not.toHaveText(control.headline)
    await expect(page.locator(LEAD)).not.toHaveText(control.lead)

    // The audit reader did not necessarily build with a tool, which is the whole reason this hero
    // exists: the control paragraph name drops four of them.
    await expect(page.locator(LEAD)).not.toContainText('Lovable')

    await expect(page.locator('#top p').first()).toHaveText(control.eyebrow)
    await expect(page.locator('#top button[type="submit"]')).toHaveText(control.submit)
  })

  // Absent, empty, unknown, hostile and repeated all land on the same branch, which is the copy the
  // page has always had and the copy a crawler sees.
  for (const query of ['?ag=', '?ag=nope', '?ag=<script>alert(1)</script>', '?ag=fix&ag=audit']) {
    test(`falls back to the control hero on ${query}`, async ({ page }) => {
      await page.goto('/')
      const control = await textOf(page.locator(HERO))

      await page.goto(`/${query}`)

      await expect(page.locator(HERO)).toHaveText(control)
      await expect(page.locator(`${HERO} script`)).toHaveCount(0)
    })
  }

  // **The regression this file exists for.** A hash-only `<Link>` resolves against the pathname and
  // drops the query, so clicking this used to re-render the page without the ad group and swap the
  // headline back with the reader two screens down.
  //
  // Scoped to the hero on purpose: the navbar carries the same label pointing at `/#how`, which is a
  // cross-page address and drops the parameter by design, since it has to work from the blog too.
  test('an in-page anchor keeps the ad group in the URL and on the screen', async ({ page }) => {
    await page.goto('/?ag=fix')
    const chosen = await textOf(page.locator(HERO))

    await page.locator('#top').getByRole('link', { name: /how it works/i }).click()

    await expect(page).toHaveURL(/ag=fix/)
    await expect(page.locator(HERO)).toHaveText(chosen)
  })

  // The parameter is a rendering detail and never an address. What is indexed, shared and unfurled
  // is `/`, on the control copy. See docs/seo.md.
  test('the canonical and the title ignore the parameter', async ({ page }) => {
    await page.goto('/')
    const controlTitle = await page.title()
    const controlCanonical = await page.locator('link[rel="canonical"]').getAttribute('href')

    await page.goto('/?ag=fix')

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe(controlCanonical)
    expect(canonical).not.toContain('ag=')
    expect(await page.title()).toBe(controlTitle)
  })
})
