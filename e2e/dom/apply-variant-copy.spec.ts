import { test, expect, type Page } from '@playwright/test'
import { applyVariantCopy } from '../../lib/scrape'
import { FIT_MIN_SCALE, FIT_STEP_RATIO, FIT_TOLERANCE_PX } from '../../lib/constants'

const COPY = 'Ship your product faster than ever before'

async function withShim(page: Page, html: string) {
  await page.setContent(html)
  await page.evaluate('window.__name = window.__name || ((fn) => fn)')
}

function apply(
  page: Page,
  options: {
    selector: string
    variantCopy: string
    controlCopy: string | null
    emphasis?: string | null
  }
) {
  return page.evaluate(applyVariantCopy, {
    ...options,
    emphasis: options.emphasis ?? null,
    fitStepRatio: FIT_STEP_RATIO,
    fitMinScale: FIT_MIN_SCALE,
    fitTolerancePx: FIT_TOLERANCE_PX
  })
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

  test('puts the chosen words in the styled fragment instead of a proportional share', async ({
    page
  }) => {
    await withShim(page, `<h1 id="hero">The <span class="gradient">fastest</span> way to ship</h1>`)

    const outcome = await apply(page, {
      selector: '#hero',
      variantCopy: 'Cut your deploy time in half',
      controlCopy: null,
      emphasis: 'deploy time'
    })

    expect(outcome).toBe('ok')
    expect(await page.locator('#hero span.gradient').innerText()).toBe('deploy time')
    expect(await page.locator('#hero').innerText()).toBe('Cut your deploy time in half')
  })

  test('falls back to the proportional split when the emphasis is not in the copy', async ({
    page
  }) => {
    await withShim(page, `<h1 id="hero">The <span class="gradient">fastest</span> way to ship</h1>`)

    const outcome = await apply(page, {
      selector: '#hero',
      variantCopy: 'Cut your deploy time in half',
      controlCopy: null,
      emphasis: 'words the model edited away'
    })

    expect(outcome).toBe('ok')
    await expect(page.locator('#hero span.gradient')).toHaveCount(1)
    expect(await page.locator('#hero').innerText()).toBe('Cut your deploy time in half')
  })

  test('falls back rather than dropping words the node order cannot hold', async ({ page }) => {
    // The styled fragment is last, so trailing words would have nowhere to go.
    await withShim(page, `<h1 id="hero">Ship <span class="gradient">faster</span></h1>`)

    const outcome = await apply(page, {
      selector: '#hero',
      variantCopy: 'Cut your deploy time in half',
      controlCopy: null,
      emphasis: 'deploy time'
    })

    expect(outcome).toBe('ok')
    expect(await page.locator('#hero').innerText()).toBe('Cut your deploy time in half')
  })

  test('creates no element when the target has no styled fragment', async ({ page }) => {
    await withShim(page, `<h1 id="hero">The fastest way to ship</h1>`)

    const outcome = await apply(page, {
      selector: '#hero',
      variantCopy: 'Cut your deploy time in half',
      controlCopy: null,
      emphasis: 'deploy time'
    })

    expect(outcome).toBe('ok')
    await expect(page.locator('#hero *')).toHaveCount(0)
    expect(await page.locator('#hero').innerText()).toBe('Cut your deploy time in half')
  })

  test('leaves the type alone when longer copy merely wraps to another line', async ({ page }) => {
    await withShim(page, `<div style="width:200px"><h1 id="hero" style="font-size:20px">Ship</h1></div>`)

    const outcome = await apply(page, { selector: '#hero', variantCopy: COPY, controlCopy: null })

    expect(outcome).toBe('ok')
    expect(await page.locator('#hero').evaluate((el) => getComputedStyle(el).fontSize)).toBe('20px')
  })

  test('shrinks the type when the copy would be clipped by a nowrap box', async ({ page }) => {
    await withShim(
      page,
      `<h1 id="hero" style="width:340px;font-size:20px;white-space:nowrap;overflow:hidden">Ship</h1>`
    )

    const outcome = await apply(page, { selector: '#hero', variantCopy: COPY, controlCopy: null })

    expect(outcome).toBe('fitted')
    const size = await page.locator('#hero').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(size).toBeLessThan(20)
    expect(size).toBeGreaterThanOrEqual(20 * FIT_MIN_SCALE)
  })

  test('reports overflow and restores the type when even the floor does not fit', async ({ page }) => {
    await withShim(
      page,
      `<h1 id="hero" style="width:40px;font-size:20px;white-space:nowrap;overflow:hidden">Ship</h1>`
    )

    const outcome = await apply(page, { selector: '#hero', variantCopy: COPY, controlCopy: null })

    expect(outcome).toBe('overflow')
    expect(await page.locator('#hero').evaluate((el) => getComputedStyle(el).fontSize)).toBe('20px')
  })
})
