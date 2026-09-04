import { test, expect, type Page } from '@playwright/test'

/**
 * **A tooltip may never widen the document.**
 *
 * `InfoHint` is a panel absolutely positioned against a 16px button. Pinned at `left-0`, a trigger
 * near the right edge (the impact legend is right-aligned over both ranked lists) runs the panel off
 * the page and puts a horizontal scrollbar on the whole document.
 *
 * This opens **every** hint on the analysis at three widths and asserts the document never scrolls
 * sideways. It is written as a sweep rather than against a single hint, because the
 * failure is positional: the next one to break will be whichever hint moves closest to an edge.
 */
async function documentOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
}

const WIDTHS = [
  { name: 'phone', width: 360, height: 780 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 }
]

test('no hint on the analysis can push the page sideways', async ({ page }) => {
  test.setTimeout(180_000)

  const url = `https://example.com/?t=${Date.now()}-hint`
  await page.goto('/dashboard')
  await page.fill('input[name="url"]', url)
  await page.getByRole('button', { name: 'Analyze' }).click()
  await page.waitForURL(/\/r\/[0-9a-f-]+$/)

  for (const size of WIDTHS) {
    await page.setViewportSize({ width: size.width, height: size.height })

    // Every section, because the impact legend and the section hints move with the panel they sit
    // in. They are stacked `<details>` now rather than tabs, so opening one leaves the rest as they
    // were and the loop ends with all four open.
    for (const section of ['flow', 'copy', 'seo', 'ai']) {
      const panel = page.getByTestId(`analysis-section-${section}`)
      // The panel's own `<details>` is the outer one; every fix card inside it is a `<details>` too,
      // so an unqualified locator is ambiguous and Playwright refuses it. See e2e/core.spec.ts.
      const open = await panel
        .locator('details')
        .first()
        .evaluate((el) => (el as HTMLDetailsElement).open)
      if (!open) await panel.locator('summary').first().click()

      const hints = page.locator('button[aria-expanded]:has(svg)')
      const count = await hints.count()

      for (let i = 0; i < count; i++) {
        const hint = hints.nth(i)
        if (!(await hint.isVisible())) continue

        await hint.click()
        const tooltip = page.getByRole('tooltip')
        if ((await tooltip.count()) === 0) {
          // Not a hint -- some other control that happens to carry aria-expanded. Leave it as found.
          await hint.click()
          continue
        }

        await expect(tooltip.first()).toBeVisible()

        // The panel itself has to be inside the document, not merely not-scrolling: a parent with
        // `overflow: hidden` would hide the symptom while still clipping the text.
        const box = await tooltip.first().boundingBox()
        expect(box, `${size.name} / ${section} / hint ${i}: no box`).not.toBeNull()
        expect(box!.x, `${size.name} / ${section} / hint ${i}: off the left edge`).toBeGreaterThanOrEqual(0)
        expect(
          box!.x + box!.width,
          `${size.name} / ${section} / hint ${i}: off the right edge`
        ).toBeLessThanOrEqual(size.width)

        expect(
          await documentOverflow(page),
          `${size.name} / ${section} / hint ${i}: document scrolls sideways`
        ).toBeLessThanOrEqual(0)

        await page.keyboard.press('Escape')
      }
    }
  }
})
