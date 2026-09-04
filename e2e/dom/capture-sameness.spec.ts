import { test, expect, type Page } from '@playwright/test'
import { captureSameness } from '../../lib/scrape'
import {
  SAMENESS_CARD_GRID_SIZE,
  SAMENESS_PATTERNS,
  SAMENESS_SAMPLE_MAX
} from '../../lib/constants'

/**
 * The only place in this repo where computed CSS can be tested for real.
 *
 * `lib/readout.test.ts` proves what the readout does with these counts; nothing there can prove the
 * counts themselves, because `getComputedStyle` needs a browser. A gradient declared in a `<style>`
 * block and read back as `linear-gradient(...)` is the whole claim the `sameness` group rests on,
 * and it is checked here or nowhere.
 */

async function withShim(page: Page, html: string) {
  await page.setContent(html)
  // Without it, esbuild's `keepNames` leaves a reference to `window.__name` in the serialised
  // function and every evaluate throws. See docs/scraping.md.
  await page.evaluate('window.__name = window.__name || ((fn) => fn)')
}

function capture(page: Page) {
  return page.evaluate(captureSameness, {
    patterns: SAMENESS_PATTERNS,
    sampleMax: SAMENESS_SAMPLE_MAX,
    cardGridSize: SAMENESS_CARD_GRID_SIZE
  })
}

// A page with none of the marks. **The most important fixture in the file**: a count that is high on
// everything is useless if it is also high on plain HTML, and a false positive here would put a mark
// on the report of somebody who did nothing wrong.
const PLAIN = `
  <main>
    <h1>Invoices for freelancers in Brazil</h1>
    <p>Send an invoice, get paid, and hand your accountant one file at the end of the month.</p>
    <a href="/signup">Start invoicing this month</a>
  </main>
`

test.describe('captureSameness', () => {
  test('counts nothing on a page carrying none of the marks', async ({ page }) => {
    await withShim(page, PLAIN)
    const marks = await capture(page)

    expect(marks.gradientCount).toBe(0)
    expect(marks.iconSetCount).toBe(0)
    expect(marks.cardTripletCount).toBe(0)
    expect(marks.emojiHeadingCount).toBe(0)
    expect(marks.genericCtaCount).toBe(0)
    expect(marks.placeholderCount).toBe(0)
    expect(marks.hasUnlinkedLogoStrip).toBe(false)
    expect(marks.declaredBuilder).toBe(false)
    expect(marks.hasStockHeroImage).toBe(false)
  })

  // The claim that made this feature possible: `SCRAPE_ALLOWED_RESOURCE_TYPES` lets stylesheets
  // through, so a gradient written in CSS comes back as one rather than as a user agent default.
  test('reads a gradient out of the computed style, not out of the markup', async ({ page }) => {
    await withShim(
      page,
      `<style>.hero { background-image: linear-gradient(90deg, #7c3aed, #ec4899); }</style>
       <div class="hero"><h1>Ship faster</h1></div>`
    )

    expect((await capture(page)).gradientCount).toBe(1)
  })

  test('counts font families off the computed stack, not off the declaration', async ({ page }) => {
    await withShim(
      page,
      `<style>body { font-family: Inter, sans-serif; }</style><main><h1>One face</h1><p>Body</p></main>`
    )
    // Inherited, so every element resolves to the same first family: one face, which is the mark.
    expect((await capture(page)).fontFamilyCount).toBe(1)

    await withShim(
      page,
      `<style>body { font-family: Inter, sans-serif; } h1 { font-family: Georgia, serif; }</style>
       <main><h1>Two faces</h1><p>Body</p></main>`
    )
    expect((await capture(page)).fontFamilyCount).toBe(2)
  })

  test('recognises an icon by its attribute and by its path data', async ({ page }) => {
    await withShim(
      page,
      `<svg data-lucide="check"><path d="M20 7 9 18l-5-5"/></svg>
       <svg class="lucide lucide-star"><path d="M9 2 3 8"/></svg>
       <svg><path d="M12 2 4 9"/></svg>
       <svg><path d="M99 99 1 1"/></svg>`
    )
    // Three match: the attribute, the class, and the `M12 2` prefix. The fourth is a shape nobody's
    // icon set ships.
    expect((await capture(page)).iconSetCount).toBe(3)
  })

  test('counts a card row once, on the container rather than per card', async ({ page }) => {
    await withShim(
      page,
      `<div class="grid">
         <div><svg><path d="M12 2"/></svg><h3>Fast</h3><p>It is fast.</p></div>
         <div><svg><path d="M12 2"/></svg><h3>Safe</h3><p>It is safe.</p></div>
         <div><svg><path d="M12 2"/></svg><h3>Cheap</h3><p>It is cheap.</p></div>
       </div>`
    )

    expect((await capture(page)).cardTripletCount).toBe(1)
  })

  // The range is deliberately narrow. A page in Portuguese is full of accented characters and a
  // bullet list is full of `•`, and neither is an emoji: widening this is how the count would
  // start reporting every pt-BR page as decorated.
  test('counts emoji in headings without counting accents or bullets', async ({ page }) => {
    await withShim(
      page,
      `<h2>\u{1F680} Ship it</h2>
       <h3>Acção e integração</h3>
       <li>• A plain bullet</li>
       <li>✅ Done</li>`
    )

    expect((await capture(page)).emojiHeadingCount).toBe(2)
  })

  test('flags a bare generic call to action but not a specific one built on it', async ({ page }) => {
    await withShim(
      page,
      `<a href="/a">Get started</a>
       <a href="/b">Saiba mais</a>
       <a href="/c">Get started with payroll</a>
       <button>Send my first invoice</button>`
    )

    expect((await capture(page)).genericCtaCount).toBe(2)
  })

  test('finds placeholder text anywhere in the document', async ({ page }) => {
    await withShim(
      page,
      `<main><h1>Acme</h1><p>Lorem ipsum dolor sit amet.</p><footer>Your Company 2026</footer></main>`
    )

    expect((await capture(page)).placeholderCount).toBe(3)
  })

  // What makes it a mark is the missing link, not the row. A logo strip whose logos point at the
  // customers is real social proof, and must not be counted.
  test('flags a logo strip only when nothing in it links anywhere', async ({ page }) => {
    const strip = (inner: string) => `<section>Trusted by<div>${inner}</div></section>`

    await withShim(page, strip('<img src="/a.png"><img src="/b.png"><img src="/c.png">'))
    expect((await capture(page)).hasUnlinkedLogoStrip).toBe(true)

    await withShim(
      page,
      strip('<a href="https://a.com"><img src="/a.png"></a><img src="/b.png"><img src="/c.png">')
    )
    expect((await capture(page)).hasUnlinkedLogoStrip).toBe(false)
  })

  // The only finding that touches origin, and it reads a declaration the page volunteered rather
  // than inferring anything.
  test('reads the builder off the page own declaration', async ({ page }) => {
    await withShim(page, `<meta name="generator" content="Lovable"><h1>Hello</h1>`)
    expect((await capture(page)).declaredBuilder).toBe(true)

    await withShim(page, PLAIN)
    expect((await capture(page)).declaredBuilder).toBe(false)
  })

  test('spots a stock hero image by its host', async ({ page }) => {
    await withShim(page, `<img src="https://images.unsplash.com/photo-123?w=1200">`)
    expect((await capture(page)).hasStockHeroImage).toBe(true)

    await withShim(page, `<img src="/hero.png">`)
    expect((await capture(page)).hasStockHeroImage).toBe(false)
  })
})
