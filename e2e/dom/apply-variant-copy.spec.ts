import { test, expect, type Page } from '@playwright/test'
import { applyVariantCopy } from '../../lib/scrape'

// applyVariantCopy is the most delicate code in the repo: it walks an element's text nodes and
// distributes the new copy across them so inline children survive, rather than doing
// `el.textContent = copy` and deleting the styling the preview exists to show.
//
// It runs in a browser and mutates a real DOM, so it cannot be reached from `npm test`. It also
// cannot be reached through screenshotVariant, whose first act is assertPublicUrl -- and that refuses
// loopback, so pointing it at a local fixture would mean punching a hole in the SSRF guard to enable
// a test. Driving the function directly against setContent markup avoids the guarded path entirely.
//
// What is left for `npm run preview:screenshot` is the part no assertion can make: whether the
// gradient span landed on a word that still looks good.

const COPY = 'Ship your product faster than ever before'

// Mirrors openGuardedPage: page.evaluate serializes the function as source, so a transform that
// wraps named functions in a __name() helper leaves that helper undefined inside the page. Passed as
// a string so it cannot itself be rewritten.
async function withShim(page: Page, html: string) {
  await page.setContent(html)
  await page.evaluate('window.__name = window.__name || ((fn) => fn)')
}

function apply(page: Page, options: { selector: string; variantCopy: string; controlCopy: string | null }) {
  return page.evaluate(applyVariantCopy, options)
}

test.describe('applyVariantCopy', () => {
  test('keeps inline children alive instead of flattening the element', async ({ page }) => {
    await withShim(
      page,
      `<h1 id="hero">The <span class="gradient">fastest</span> way to<br>ship</h1>`
    )

    const outcome = await apply(page, {
      selector: '#hero',
      variantCopy: COPY,
      controlCopy: 'The fastest way toship'
    })

    expect(outcome).toBe('ok')
    // The regression this whole routine exists to prevent: textContent assignment deletes both.
    await expect(page.locator('#hero span.gradient')).toHaveCount(1)
    await expect(page.locator('#hero br')).toHaveCount(1)
  })

  test('writes every word exactly once and in order', async ({ page }) => {
    await withShim(
      page,
      `<h1 id="hero">The <span class="gradient">fastest</span> way to<br>ship</h1>`
    )

    await apply(page, { selector: '#hero', variantCopy: COPY, controlCopy: null })

    const rendered = await page.locator('#hero').innerText()
    expect(rendered.replace(/\s+/g, ' ').trim()).toBe(COPY)
  })

  test('leaves no styled fragment empty when there are words to go around', async ({ page }) => {
    // The middle fragment's proportional share rounds to zero against its neighbours; the reserve is
    // what keeps it rendering rather than collapsing the span to nothing.
    await withShim(
      page,
      `<h1 id="hero">An extremely long opening fragment here <span id="tiny">x</span> and another extremely long closing fragment</h1>`
    )

    await apply(page, { selector: '#hero', variantCopy: COPY, controlCopy: null })

    await expect(page.locator('#tiny')).not.toBeEmpty()
  })

  test('never writes into whitespace-only nodes, so words do not glue together', async ({
    page
  }) => {
    // The single space between the two spans is its own text node. Writing to it is what used to
    // produce "Shipfaster".
    await withShim(page, `<h1 id="hero"><span>Ship</span> <span>Faster</span></h1>`)

    await apply(page, { selector: '#hero', variantCopy: 'Launch sooner', controlCopy: null })

    const gap = await page.evaluate(
      () => document.querySelector('#hero')!.childNodes[1]!.nodeValue
    )
    expect(gap).toBe(' ')
    expect(await page.locator('#hero').innerText()).toBe('Launch sooner')
  })

  test('inserts a separator where the page had none between fragments', async ({ page }) => {
    await withShim(page, `<h1 id="hero"><span>Ship</span><span>Faster</span></h1>`)

    await apply(page, { selector: '#hero', variantCopy: 'Launch sooner', controlCopy: null })

    // The split point between these two spans is ours, not the page's, so the copy must not render
    // as one glued word.
    expect(await page.locator('#hero').innerText()).toBe('Launch sooner')
  })

  test('reports a stale selector as mismatch and leaves the DOM untouched', async ({ page }) => {
    await withShim(page, `<h1 id="hero">The <span class="gradient">fastest</span> way to ship</h1>`)

    const outcome = await apply(page, {
      selector: '#hero',
      variantCopy: COPY,
      controlCopy: 'A completely different headline the page no longer has'
    })

    expect(outcome).toBe('mismatch')
    // The check has to stay ahead of the mutation: once one node is rewritten there is no original
    // text left to compare against.
    expect(await page.locator('#hero').innerText()).toBe('The fastest way to ship')
  })

  test('reports a missing element as not_found', async ({ page }) => {
    await withShim(page, `<h1 id="hero">The fastest way to ship</h1>`)

    const outcome = await apply(page, {
      selector: '#nope',
      variantCopy: COPY,
      controlCopy: null
    })

    expect(outcome).toBe('not_found')
  })

  test('fills an element that holds no text node at all', async ({ page }) => {
    // captureElements can land on something whose only child is an <img>; textContent is not an
    // option there either, because it would delete the image.
    await withShim(page, `<h1 id="hero"><img alt="" src="data:,"></h1>`)

    const outcome = await apply(page, {
      selector: '#hero',
      variantCopy: COPY,
      controlCopy: null
    })

    expect(outcome).toBe('ok')
    await expect(page.locator('#hero img')).toHaveCount(1)
    expect((await page.locator('#hero').innerText()).trim()).toBe(COPY)
  })
})
