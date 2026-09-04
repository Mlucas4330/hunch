import { lookup } from 'node:dns/promises'
import puppeteer, { type Browser, type Page } from 'puppeteer'
import {
  BROWSER_CONNECT_RETRY_DELAY_MS,
  DEAD_HREFS,
  FIT_MIN_SCALE,
  FIT_STEP_RATIO,
  FIT_TOLERANCE_PX,
  GOAL_CANDIDATE_MAX_WORDS,
  MOBILE_MIN_FONT_PX,
  MOBILE_TAP_TARGET_MIN_PX,
  MOBILE_USER_AGENT,
  NORMAL_LINE_HEIGHT_RATIO,
  OAUTH_PROVIDER_PATTERNS,
  STRUCTURE_PATTERNS,
  SCRAPE_ALLOWED_RESOURCE_TYPES,
  SCRAPE_ASSET_READY_TIMEOUT_MS,
  SCRAPE_LCP_FLUSH_MS,
  PAGE_LINKS_MAX,
  SCRAPE_MAX_CONCURRENT_PAGES,
  SCRAPE_MAX_RESPONSE_BYTES,
  SCRAPE_PAINT_SETTLE_MS,
  SCRAPE_NAVIGATION_TIMEOUT_MS,
  SCRAPE_QUEUE_MAX_WAIT_MS,
  SCREENSHOT_QUEUE_MAX_WAIT_MS,
  SCRAPE_SETTLE_MIN_TEXT_LENGTH,
  SCRAPE_SETTLE_POLL_MS,
  SCRAPE_SETTLE_TEXT_TOLERANCE,
  SCRAPE_SETTLE_TIMEOUT_MS,
  SCRAPE_VIEWPORT,
  SCRAPE_VIEWPORT_MOBILE,
  SEO_HEADING_MAX_CHARS,
  SEO_HEADINGS_MAX,
  TRUST_PATTERNS,
  VARIANT_GROWTH_LINES
} from '@/lib/constants'
import { assertPublicUrl, isPublicUrl } from '@/lib/url-guard'
import { log } from '@/lib/log'

export interface PageElement {
  text: string
  selector: string
  tag: string
  // Characters the element's own box can hold, measured off the page. See docs/scraping.md.
  capacity: number
  // The element renders part of its text inside a child (a <strong>, a gradient <span>), so the
  // variant may choose which of its own words land there.
  emphasized: boolean
}

/**
 * What one page contains, counted off the DOM.
 *
 * **Everything below `wordCount` is optional, and that is load bearing.** These columns live in a
 * `jsonb` that has been written since before they existed, so a row measured last month has none of
 * them. `undefined` there means "not measured", which is a different fact from `0`, and the readout
 * is required to tell them apart: emitting a finding of zero for a page nobody counted reports
 * unknown as negative, which is the one thing docs/invariants.md forbids outright. A new field
 * arrives here optional and stays optional.
 */
export interface PageStructure {
  hasOauth: boolean
  oauthProviders: string[]
  /**
   * Whether **this page is where you sign in**, rather than a page that links to one.
   *
   * **The distinction is the whole value of the field, and getting it wrong is how this was wrong
   * twice.** `hasOauth` says the page offers Google or GitHub. This says the page hosts the
   * authentication at all -- so the readout can tell "signs you in, but only with email" from "signs
   * nobody in" from "merely has a link to a sign in page somewhere else".
   *
   * A landing page with `Entrar` in its navigation is the third. The sign in flow lives on another
   * URL that this analysis never opened, so **nothing here knows whether that flow offers social
   * login**, and asking the question produces a fix for a page nobody measured. Our own report did
   * exactly that: it recommended adding social login to a product whose sign in page has had Google
   * and GitHub all along.
   *
   * True when an auth-labelled control sits inside a `<form>` (which is how a real sign in action is
   * built, including next-auth's), when there is a visible password field, or when a provider was
   * detected -- any of the three means the credentials are collected *here*.
   *
   * Optional for the reason every late field here is optional: a row measured before this existed has
   * none, and `undefined` means "not measured" rather than "this page signs nobody in".
   */
  hasAuthForm?: boolean
  formCount: number
  formFieldCount: number
  hasFaq: boolean
  hasPricing: boolean
  hasTestimonials: boolean
  hasVideo: boolean
  hasStickyCta: boolean
  bodyLinkCount: number
  aboveFoldCtaCount: number
  navLinkCount: number
  headingCount: number
  sectionCount: number
  wordCount: number

  // What the form actually asks for, read from the DOM and never by filling it in. Submitting a
  // stranger's form would write a fake lead into their CRM on every analysis -- see docs/scraping.md.
  requiredFieldCount?: number
  fieldsWithoutLabel?: number
  formSteps?: number
  hasSubmit?: boolean
  hasClientValidation?: boolean
  deadCtaCount?: number

  // Why a visitor should believe the page.
  hasCnpj?: boolean
  testimonialWithAttributionCount?: number
  clientLogoCount?: number
  trustBadgeCount?: number
  hasPrivacyPolicy?: boolean
  hasTerms?: boolean
  hasPhysicalAddress?: boolean
  hasPhone?: boolean
  hasSocialLinks?: boolean
}

/**
 * One first-level block of the page, with the heading that introduces it.
 *
 * The set is exactly what `sectionCount` counts -- the visible children of `main` -- rather than a
 * second definition of "section" living beside the first. There was no reason to invent one, and two
 * definitions of the same noun drift the moment either is touched.
 *
 * Its job is to let the prompt drop the MIDDLE of a page that will not fit instead of its tail. A
 * character truncation always amputates pricing, FAQ and footer, which is precisely where objections
 * and proof live -- so the model was reliably blind to the part of a long page it most needed.
 */
export interface PageSection {
  heading: string | null
  text: string
}

export interface PageSeo {
  title: string | null
  metaDescription: string | null
  canonical: string | null
  robotsMeta: string | null
  lang: string | null
  h1Count: number
  imageCount: number
  imagesMissingAlt: number
  internalLinkCount: number
  hasOgTitle: boolean
  hasOgDescription: boolean
  hasOgImage: boolean
  jsonLdTypes: string[]
  headings: string[]
}

/**
 * The same page seen through a phone. Optional on `ScrapedPage` for the same reason the fields above
 * are optional on `PageStructure`: nothing measured before this existed has it, and `null` there
 * means "not measured" rather than "nothing wrong". The readout skips the whole group instead of
 * reporting zeroes -- the same shape as the robots.txt guard.
 */
/**
 * **Geometry only, and deliberately no load numbers.** The phone pass is a reload on a connection the
 * desktop pass already opened, so its TTFB skips DNS and the TLS handshake and every timing after it
 * inherits the head start. Measured that way a page reports painting faster on a phone than on a
 * laptop, which is not a floor with a caveat on it -- it is backwards. Load times stay in the `load`
 * group, measured once, with the caveat they already carry.
 *
 * What is left is unaffected by any of that: how wide the page is, how big its controls are, how
 * small its text is, and what sits above the fold. Those are facts about layout, and the reload
 * exists to get them right -- a bare `setViewport` re-lays the page out, but does not re-run the
 * user agent branch or re-request images at phone sizes.
 */
export interface PageMobile {
  horizontalOverflow: boolean
  smallTapTargetCount: number
  tinyTextCount: number
  aboveFoldCtaCount: number
  hasViewportMeta: boolean
}

export interface PagePerformance {
  ttfbMs: number | null
  fcpMs: number | null
  lcpMs: number | null
  domContentLoadedMs: number | null
  loadMs: number | null
  transferredBytes: number | null
  requestCount: number
  domNodeCount: number
}

/**
 * One same-origin link off the page, kept for `pickNeighbours` in lib/site-pages.ts.
 *
 * `captureSeo` already walked `a[href]` to count these and threw the hrefs away. The count answers
 * "is this page connected to the rest of the site"; the list answers "which other pages of this
 * business exist", which is the raw material a generation needs and never a number the reader sees.
 */
export interface PageLink {
  href: string
  text: string
}

export interface ScrapedPage {
  url: string
  html: string
  elements: PageElement[]
  structure: PageStructure
  seo: PageSeo
  performance: PagePerformance
  mobile: PageMobile
  // Optional for the reason every late field on PageStructure is: nothing measured before this
  // existed has it, and `undefined` means "not measured" rather than "the page had none".
  sections?: PageSection[]
  // Optional for the same reason `sections` is: nothing scraped before this existed carries it.
  links?: PageLink[]
}

export class ScrapeError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ScrapeError'
  }
}

const globalForBrowserPool = globalThis as unknown as {
  browserPool?: { active: number; waiting: Array<() => void> }
}

function browserPool() {
  globalForBrowserPool.browserPool ??= { active: 0, waiting: [] }

  return globalForBrowserPool.browserPool
}

async function withBrowserSlot<T>(maxWaitMs: number, run: () => Promise<T>): Promise<T> {
  const pool = browserPool()
  const queuedAt = Date.now()

  if (pool.active < SCRAPE_MAX_CONCURRENT_PAGES) {
    pool.active += 1
  } else {
    await new Promise<void>((resolve, reject) => {
      const grant = () => {
        // Cleared on the way in, not left to fire against a waiter that is no longer queued. The
        // splice below makes a late timer harmless, but harmless is not free: it holds this closure
        // and a live handle for the rest of the wait, on every job that queues and is then served.
        // Under a burst that is the common path, not the rare one.
        clearTimeout(expiry)
        pool.active += 1
        resolve()
      }

      pool.waiting.push(grant)

      // Declared after `grant` and closed over by it. Nothing can call `grant` before this line
      // runs -- it is only reachable from the `finally` of another slot holder -- so the closure
      // always sees an assigned handle.
      const expiry = setTimeout(() => {
        const queued = pool.waiting.indexOf(grant)
        if (queued === -1) return

        pool.waiting.splice(queued, 1)
        reject(new ScrapeError(`Timed out after ${maxWaitMs}ms waiting for a browser slot`))
      }, maxWaitMs)
    })
  }

  // Zero on the common path, and that is the point: the interesting number is how often it is not,
  // and how long the tail gets. This is the only view into whether SCRAPE_MAX_CONCURRENT_PAGES is
  // the binding constraint or an untouched ceiling. `queued` is what is still behind us.
  log.info('scrape.slot_acquired', {
    waitMs: Date.now() - queuedAt,
    active: pool.active,
    queued: pool.waiting.length
  })

  try {
    return await run()
  } finally {
    pool.active -= 1
    pool.waiting.shift()?.()
  }
}

async function connectToBrowser(remote: string): Promise<Browser> {
  const { hostname, port, protocol } = new URL(remote)
  const { address, family } = await lookup(hostname)
  const host = family === 6 ? `[${address}]` : address

  return puppeteer.connect({ browserURL: `${protocol}//${host}:${port}` })
}

async function launchBrowser(): Promise<Browser> {
  const remote = process.env.BROWSER_URL

  if (remote) {
    try {
      return await connectToBrowser(remote)
    } catch {
      await new Promise((resolve) => setTimeout(resolve, BROWSER_CONNECT_RETRY_DELAY_MS))

      return connectToBrowser(remote)
    }
  }

  const sandboxless = process.env.PUPPETEER_ALLOW_NO_SANDBOX === '1'

  return puppeteer.launch({
    headless: true,
    args: [
      ...(sandboxless ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  })
}

async function releaseBrowser(browser: Browser, page: Page | null): Promise<void> {
  await page?.close().catch(() => {})

  if (process.env.BROWSER_URL) {
    await browser.disconnect().catch(() => {})
    return
  }

  await browser.close().catch(() => {})
}

async function openGuardedPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage()
  page.setDefaultTimeout(SCRAPE_NAVIGATION_TIMEOUT_MS)

  await page.evaluateOnNewDocument('window.__name = window.__name || ((fn) => fn)')

  await page.setRequestInterception(true)

  let bytes = 0

  page.on('request', async (request) => {
    if (request.isInterceptResolutionHandled()) return

    if (!SCRAPE_ALLOWED_RESOURCE_TYPES.includes(request.resourceType())) {
      return request.abort('blockedbyclient').catch(() => {})
    }
    if (bytes > SCRAPE_MAX_RESPONSE_BYTES) {
      return request.abort('blockedbyclient').catch(() => {})
    }
    if (!(await isPublicUrl(request.url()))) {
      return request.abort('blockedbyclient').catch(() => {})
    }

    request.continue().catch(() => {})
  })

  page.on('response', (response) => {
    const length = Number(response.headers()['content-length'] ?? 0)
    bytes += Number.isFinite(length) ? length : 0
  })

  return page
}

async function settlePage(page: Page): Promise<void> {
  const deadline = Date.now() + SCRAPE_SETTLE_TIMEOUT_MS
  let previous = -1

  while (Date.now() < deadline) {
    const length = await page.evaluate(() => document.body?.innerText.length ?? 0)

    const stable = Math.abs(length - previous) <= SCRAPE_SETTLE_TEXT_TOLERANCE
    if (stable && length >= SCRAPE_SETTLE_MIN_TEXT_LENGTH) return

    previous = length
    await new Promise((resolve) => setTimeout(resolve, SCRAPE_SETTLE_POLL_MS))
  }
}

export async function scrapePage(url: string): Promise<ScrapedPage> {
  const target = await assertPublicUrl(url)

  return withBrowserSlot(SCRAPE_QUEUE_MAX_WAIT_MS, async () => {
    const browser = await launchBrowser()
    let page: Page | null = null

    try {
      page = await openGuardedPage(browser)
      await page.setViewport(SCRAPE_VIEWPORT)
      await page.goto(target.href, {
        waitUntil: 'networkidle2',
        timeout: SCRAPE_NAVIGATION_TIMEOUT_MS
      })
      await settlePage(page)
      const html = await page.content()
      const elements = await page.evaluate(captureElements, {
        growthLines: VARIANT_GROWTH_LINES,
        normalLineHeightRatio: NORMAL_LINE_HEIGHT_RATIO
      })
      const structure = await page.evaluate(captureStructure, {
        oauthProviders: OAUTH_PROVIDER_PATTERNS,
        patterns: STRUCTURE_PATTERNS,
        trust: TRUST_PATTERNS,
        deadHrefs: DEAD_HREFS,
        ctaMaxWords: GOAL_CANDIDATE_MAX_WORDS
      })
      const seo = await page.evaluate(captureSeo, {
        headingsMax: SEO_HEADINGS_MAX,
        headingMaxChars: SEO_HEADING_MAX_CHARS
      })
      const sections = await page.evaluate(captureSections)
      const links = await page.evaluate(captureLinks, { max: PAGE_LINKS_MAX })
      const performance = await page.evaluate(capturePerformance, {
        lcpFlushMs: SCRAPE_LCP_FLUSH_MS
      })

      // The second pass, in the same slot. Everything above was measured at SCRAPE_VIEWPORT; from
      // here the page is a phone. Nothing after this reads the desktop DOM, so the reload is safe to
      // do in place rather than on a second page.
      await page.setUserAgent(MOBILE_USER_AGENT)
      await page.setViewport(SCRAPE_VIEWPORT_MOBILE)
      // **The cache has to go before the reload.** A warm reload serves most of the page from memory
      // and reports an LCP faster than the desktop pass measured, which would tell the reader their
      // page is quicker on a phone than on a laptop. That is not a floor with a caveat on it, it is
      // a wrong number -- and the load figures only survive because they are honest about being a
      // best case. See docs/invariants.md.
      await page.setCacheEnabled(false)
      await page.reload({ waitUntil: 'networkidle2', timeout: SCRAPE_NAVIGATION_TIMEOUT_MS })
      await settlePage(page)

      const mobile = await page.evaluate(captureMobile, {
        tapTargetMinPx: MOBILE_TAP_TARGET_MIN_PX,
        minFontPx: MOBILE_MIN_FONT_PX,
        ctaMaxWords: GOAL_CANDIDATE_MAX_WORDS
      })

      return { url, html, elements, structure, seo, performance, mobile, sections, links }
    } catch (error) {
      throw new ScrapeError(`Failed to scrape ${url}`, { cause: error })
    } finally {
      await releaseBrowser(browser, page)
    }
  })
}

/**
 * One page opened for its words and for nothing else.
 *
 * **A neighbour page is material, never a measurement**, so everything `scrapePage` does that feeds a
 * number is skipped here: no structure, no SEO, no performance, and above all no phone pass, which is
 * a full second page load with the cache cleared. The reader waits for these, and what the generation
 * needs from them is the text.
 *
 * Guarded like every other outbound URL, and it takes its own browser slot. See docs/scraping.md.
 */
export async function scrapePageText(url: string): Promise<{ sections: PageSection[]; html: string }> {
  const target = await assertPublicUrl(url)

  return withBrowserSlot(SCRAPE_QUEUE_MAX_WAIT_MS, async () => {
    const browser = await launchBrowser()
    let page: Page | null = null

    try {
      page = await openGuardedPage(browser)
      await page.setViewport(SCRAPE_VIEWPORT)
      await page.goto(target.href, {
        waitUntil: 'networkidle2',
        timeout: SCRAPE_NAVIGATION_TIMEOUT_MS
      })
      await settlePage(page)

      return { sections: await page.evaluate(captureSections), html: await page.content() }
    } catch (error) {
      throw new ScrapeError(`Failed to read ${url}`, { cause: error })
    } finally {
      await releaseBrowser(browser, page)
    }
  })
}

export type VariantShot = {
  // The page as it is today, photographed before the swap.
  before: Buffer
  // The same page with the variant applied.
  after: Buffer
  // The copy still did not fit its box at the smallest size the fit is willing to use, so the image
  // shows the reader clipped text. Surfaced rather than swallowed -- see docs/report.md.
  // It describes the `after` shot only: nothing was changed in `before` to overflow anything.
  overflow: boolean
}

export async function screenshotVariant(
  url: string,
  selector: string | null,
  variantCopy: string,
  controlCopy?: string | null,
  emphasis?: string | null
): Promise<VariantShot> {
  const target = await assertPublicUrl(url)

  return withBrowserSlot(SCREENSHOT_QUEUE_MAX_WAIT_MS, async () => {
    const browser = await launchBrowser()
    let page: Page | null = null

    try {
      page = await openGuardedPage(browser)
      await page.setViewport(SCRAPE_VIEWPORT)
      await page.goto(target.href, {
        waitUntil: 'networkidle2',
        timeout: SCRAPE_NAVIGATION_TIMEOUT_MS
      })
      await settlePage(page)

      // **Both shots come from one page load, and that is what makes the slider work.** Same
      // navigation, same viewport, same scroll offset, same lazy images already settled -- so the
      // two images line up pixel for pixel and the only thing that differs between them is the copy
      // that was swapped. Loading the page twice would let a carousel advance, an animation land
      // somewhere else, or an ad slot fill differently, and the wipe would read as the whole page
      // twitching rather than as one line changing.
      //
      // **Scrolling comes first, before either shot.** The element being rewritten is usually below
      // the fold, so a shot taken at the top of the page is a picture of something the change does
      // not touch. Scrolling once here and never again is what keeps the pair registered: doing it
      // after the swap frames the two shots at different offsets.
      await page.evaluate(freezeMotion)
      if (selector) await page.evaluate(scrollToTarget, selector)
      await awaitPaint(page)
      const before = await page.screenshot({ type: 'png' })

      let overflow = false

      if (selector) {
        const outcome = await page.evaluate(applyVariantCopy, {
          selector,
          variantCopy,
          controlCopy: controlCopy ?? null,
          emphasis: emphasis ?? null,
          fitStepRatio: FIT_STEP_RATIO,
          fitMinScale: FIT_MIN_SCALE,
          fitTolerancePx: FIT_TOLERANCE_PX
        })

        if (!isApplied(outcome)) {
          throw new ScrapeError(`Variant target not applicable on ${url} (${outcome})`)
        }
        overflow = outcome === 'overflow'
      }

      // Again after the swap: replacing the text can pull a webfont weight that was not on the page
      // before, and the fit loop may have resized the type.
      await awaitPaint(page)
      const after = await page.screenshot({ type: 'png' })

      return { before: Buffer.from(before), after: Buffer.from(after), overflow }
    } catch (error) {
      if (error instanceof ScrapeError) throw error
      throw new ScrapeError(`Failed to screenshot ${url}`, { cause: error })
    } finally {
      await releaseBrowser(browser, page)
    }
  })
}

// `ok`, `fitted` and `overflow` all mean the swap happened; they differ in what the box did with it.
// See docs/scraping.md.
type ApplyOutcome = 'ok' | 'fitted' | 'overflow' | 'not_found' | 'mismatch'

export function isApplied(outcome: ApplyOutcome): boolean {
  return outcome === 'ok' || outcome === 'fitted' || outcome === 'overflow'
}

export function applyVariantCopy(options: {
  selector: string
  variantCopy: string
  controlCopy: string | null
  emphasis: string | null
  fitStepRatio: number
  fitMinScale: number
  fitTolerancePx: number
}): ApplyOutcome {
  const el = document.querySelector(options.selector)
  if (!el) return 'not_found'

  if (options.controlCopy) {
    const own = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const control = options.controlCopy.replace(/\s+/g, ' ').trim().toLowerCase()
    if (own !== control && !own.includes(control) && !control.includes(own)) return 'mismatch'
  }

  const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT'])
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text
    if (skip.has(text.parentElement?.tagName || '')) continue
    if (!(text.nodeValue || '').trim()) continue
    nodes.push(text)
  }

  const words = options.variantCopy.split(/\s+/).filter(Boolean)

  // Words per node, by fragment size. One word is reserved for each fragment still to come, so a
  // share that rounds to zero does not empty a styled span; the last node takes the remainder, so
  // rounding never drops a word.
  function proportional(weights: number[], wordTotal: number): number[] {
    const total = weights.reduce((sum, weight) => sum + weight, 0) || weights.length
    const counts: number[] = []
    let taken = 0

    weights.forEach((weight, index) => {
      const remaining = wordTotal - taken
      const reserve = Math.min(weights.length - index - 1, remaining)
      const ceiling = remaining - reserve
      const share = Math.round((wordTotal * weight) / total)
      const take =
        index === weights.length - 1
          ? remaining
          : Math.min(ceiling, Math.max(ceiling > 0 ? 1 : 0, share))

      counts.push(take)
      taken += take
    })

    return counts
  }

  // Where the emphasis sits in the variant's own words. Null unless it is a whole-word substring of
  // the copy, which is what lets the words either side be handed to the nodes either side.
  function emphasisSpan(copy: string, emphasis: string): { start: number; length: number } | null {
    const at = copy.indexOf(emphasis)
    if (at === -1) return null

    const before = at === 0 ? ' ' : copy.charAt(at - 1)
    const end = at + emphasis.length
    const after = end >= copy.length ? ' ' : copy.charAt(end)
    if (/\S/.test(before) || /\S/.test(after)) return null

    const start = copy.slice(0, at).split(/\s+/).filter(Boolean).length
    const length = emphasis.split(/\s+/).filter(Boolean).length
    if (length === 0 || length === words.length) return null

    return { start, length }
  }

  // The emphasis is honoured only when every word has somewhere to go: it is placed in a styled
  // fragment that already exists, and nothing here ever creates one. Anything else falls back to the
  // proportional split. See docs/scraping.md.
  function counts(): number[] {
    const weights = nodes.map((node) => (node.nodeValue || '').trim().length)
    if (!options.emphasis) return proportional(weights, words.length)

    const styled = nodes.findIndex((node) => node.parentElement !== el)
    if (styled === -1) return proportional(weights, words.length)

    const span = emphasisSpan(options.variantCopy, options.emphasis)
    if (!span) return proportional(weights, words.length)

    const after = words.length - span.start - span.length
    if (span.start > 0 && styled === 0) return proportional(weights, words.length)
    if (after > 0 && styled === nodes.length - 1) return proportional(weights, words.length)

    return [
      ...proportional(weights.slice(0, styled), span.start),
      span.length,
      ...proportional(weights.slice(styled + 1), after)
    ]
  }

  if (nodes.length === 0) {
    el.appendChild(document.createTextNode(options.variantCopy))
  } else {
    const plan = counts()
    let taken = 0
    let wrote = false

    nodes.forEach((node, index) => {
      const value = node.nodeValue || ''
      const lead = value.match(/^\s*/)?.[0] || (wrote ? ' ' : '')
      const trail = value.match(/\s*$/)?.[0] ?? ''

      const chunk = words.slice(taken, taken + plan[index]).join(' ')
      taken += plan[index]
      wrote = wrote || chunk.length > 0
      node.nodeValue = chunk ? lead + chunk + trail : ''
    })
  }

  // Longer copy that simply wraps to another line is not a break -- the page reflows and the reader
  // sees the real thing. A break is the text being cut off: clipped sideways by a nowrap or ellipsis
  // rule, taller than a fixed height, or pushed past the bottom of an ancestor that hides its
  // overflow. Only that is worth distorting the designer's type for, and only down to `fitMinScale`.
  function clipsBelow(target: Element): boolean {
    const bottom = target.getBoundingClientRect().bottom
    let node = target.parentElement
    while (node && node !== document.body) {
      const style = getComputedStyle(node)
      if (style.overflowY === 'hidden' || style.overflowY === 'clip') {
        if (bottom > node.getBoundingClientRect().bottom + options.fitTolerancePx) return true
      }
      node = node.parentElement
    }
    return false
  }

  function clipped(target: Element): boolean {
    if (target.scrollWidth > target.clientWidth + options.fitTolerancePx) return true
    if (target.scrollHeight > target.clientHeight + options.fitTolerancePx) return true
    return clipsBelow(target)
  }

  function fitToBox(target: HTMLElement): 'ok' | 'fitted' | 'overflow' {
    if (!clipped(target)) return 'ok'

    const base = parseFloat(getComputedStyle(target).fontSize)
    if (!base) return 'overflow'

    const previous = target.style.fontSize
    let scale = options.fitStepRatio
    while (scale >= options.fitMinScale) {
      target.style.fontSize = `${base * scale}px`
      if (!clipped(target)) return 'fitted'
      scale *= options.fitStepRatio
    }

    target.style.fontSize = previous
    return 'overflow'
  }

  // **The scroll is deliberately not here.** This function runs between the two shots, so scrolling
  // inside it would frame the "before" at the top of the page and the "after" centred on the
  // element, and the wipe would compare two different parts of the page. `scrollToTarget` runs
  // before either shot, so both share one offset. See docs/scraping.md.
  return fitToBox(el as HTMLElement)
}

/**
 * Stops the page moving on its own, so the only difference between the two shots is the copy.
 *
 * A marquee, a carousel or a looping hero animation advances in the milliseconds between the two
 * screenshots, and the wipe then shows it jumping -- which reads as the whole page twitching rather
 * than as one line changing. Pausing rather than removing: `animation: none` would drop an element
 * back to whatever its unanimated rule says, and for the common fade-in-from-zero that is invisible.
 * Paused freezes each animation where it already is, which after `settlePage` is its finished state.
 */
function freezeMotion(): void {
  const style = document.createElement('style')
  style.textContent = `*, *::before, *::after {
    animation-play-state: paused !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }`
  document.head.appendChild(style)
}

/**
 * Puts the element the variant targets in the middle of the viewport, before anything is swapped.
 *
 * Without it the shot frames the top of the page and the change is somewhere below the fold, which
 * is a picture of nothing. Run once, and never again after the swap: replacing the text can make the
 * element taller, and re-centring on the new height would slide the page under the wipe.
 */
function scrollToTarget(selector: string): void {
  document.querySelector(selector)?.scrollIntoView({ block: 'center', inline: 'nearest' })
}

async function awaitPaint(page: Page): Promise<void> {
  await page
    .evaluate(async (timeout) => {
      const pending: Promise<unknown>[] = [document.fonts?.ready ?? Promise.resolve()]

      for (const image of Array.from(document.images)) {
        if (image.complete) continue
        pending.push(
          new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true })
            image.addEventListener('error', resolve, { once: true })
          })
        )
      }

      await Promise.race([
        Promise.all(pending),
        new Promise((resolve) => setTimeout(resolve, timeout))
      ])
    }, SCRAPE_ASSET_READY_TIMEOUT_MS)
    .catch(() => {})

  await new Promise((resolve) => setTimeout(resolve, SCRAPE_PAINT_SETTLE_MS))
}

function captureElements(options: {
  growthLines: number
  normalLineHeightRatio: number
}): PageElement[] {
  const SKIP = new Set(['script', 'style', 'noscript', 'svg', 'head', 'meta', 'link', 'title'])
  const INLINE = new Set([
    'span', 'a', 'strong', 'em', 'b', 'i', 'u', 's', 'mark', 'small', 'sub', 'sup', 'code',
    'abbr', 'time', 'cite', 'q', 'kbd', 'samp', 'var', 'ins', 'del', 'wbr', 'br', 'bdi', 'bdo',
    'font', 'svg', 'img', 'picture', 'label'
  ])

  function hasBlockChild(el: Element): boolean {
    return Array.from(el.children).some((c) => !INLINE.has(c.tagName.toLowerCase()))
  }

  function cssPath(el: Element): string {
    const parts: string[] = []
    let node: Element | null = el
    while (node && node.nodeType === 1 && node.tagName.toLowerCase() !== 'html') {
      if (node.id) {
        parts.unshift(`#${CSS.escape(node.id)}`)
        break
      }
      const tag = node.tagName.toLowerCase()
      const parent: Element | null = node.parentElement
      if (!parent) {
        parts.unshift(tag)
        break
      }
      const siblings = Array.from(parent.children).filter((c) => c.tagName === node!.tagName)
      const index = siblings.indexOf(node) + 1
      parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag)
      node = parent
    }
    return parts.join(' > ')
  }

  function isVisible(el: Element): boolean {
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return false
    const style = getComputedStyle(el)
    return style.visibility !== 'hidden' && style.display !== 'none'
  }

  function clippingBottom(el: Element): number | null {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node)
      if (style.overflowY === 'hidden' || style.overflowY === 'clip') {
        return node.getBoundingClientRect().bottom
      }
    }
    return null
  }

  // How many characters fit in the box the designer drew. The average character width is measured
  // off the text already rendered there rather than assumed from the font size, because a condensed
  // display face and a wide serif differ by more than any constant would survive.
  function capacityOf(el: Element, text: string): number {
    const rect = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    const fontSize = parseFloat(style.fontSize) || 0
    const lineHeight =
      parseFloat(style.lineHeight) || fontSize * options.normalLineHeightRatio || 0

    const range = document.createRange()
    range.selectNodeContents(el)
    const inkWidth = Array.from(range.getClientRects()).reduce((sum, r) => sum + r.width, 0)
    range.detach()

    const charWidth = text.length > 0 ? inkWidth / text.length : 0
    if (charWidth <= 0 || lineHeight <= 0 || rect.width <= 0) return text.length

    const clipBottom = clippingBottom(el)
    const available =
      clipBottom === null
        ? rect.height + lineHeight * options.growthLines
        : Math.max(rect.height, clipBottom - rect.top)

    const perLine = Math.floor(rect.width / charWidth)
    const lines = Math.max(1, Math.floor(available / lineHeight))
    return Math.max(text.length, perLine * lines)
  }

  // A text node whose parent is not the element itself sits inside a styling wrapper. That, and only
  // that, is what an emphasis can be placed into -- nothing here ever creates one.
  function emphasizedFragments(el: Element): number {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let count = 0
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!(node.nodeValue || '').trim()) continue
      if (node.parentElement !== el) count += 1
    }
    return count
  }

  const seen = new Set<string>()
  const out: PageElement[] = []
  for (const el of Array.from(document.querySelectorAll('*'))) {
    const tag = el.tagName.toLowerCase()
    if (SKIP.has(tag)) continue
    if (hasBlockChild(el)) continue
    const parent = el.parentElement
    const outermost = !parent || parent.tagName === 'BODY' || hasBlockChild(parent)
    const isLink = tag === 'a' || tag === 'button'
    if (!outermost && !isLink) continue
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
    if (!text || text.length > 300 || seen.has(text)) continue
    if (!/[a-z0-9]/i.test(text)) continue
    if (!isVisible(el)) continue
    seen.add(text)
    out.push({
      text,
      selector: cssPath(el),
      tag,
      capacity: capacityOf(el, text),
      emphasized: emphasizedFragments(el) > 0
    })
  }
  return out
}

/**
 * The page broken into its first-level blocks, so the prompt can drop the middle of a long one.
 *
 * `main`'s visible children, which is the same set `captureStructure` counts as `sectionCount` --
 * said once there and once here rather than defined twice with a chance to disagree. A page with no
 * `<main>` falls back to `body` exactly as that function does.
 *
 * The heading is the first one INSIDE the block, and it is what names a dropped section in the
 * coverage note the prompt carries. A block with no heading reports `null` rather than borrowing the
 * previous one, because a borrowed heading would tell the model a section was about something nobody
 * measured it to be about.
 */
/**
 * Every same-origin link, with the words that pointed at it.
 *
 * Deliberately dumb: it collects and does not choose. Which of these is worth opening is decided in
 * lib/site-pages.ts, where it can be tested without a browser.
 */
function captureLinks(options: { max: number }): PageLink[] {
  const origin = location.origin
  const seen = new Set<string>()
  const links: PageLink[] = []

  for (const anchor of Array.from(document.querySelectorAll('a[href]'))) {
    const raw = anchor.getAttribute('href') || ''
    if (!raw || raw.startsWith('#')) continue

    let resolved: URL
    try {
      resolved = new URL(raw, origin)
    } catch {
      continue
    }

    if (resolved.origin !== origin) continue

    // A fragment is the same page, and the query string is usually a campaign tag rather than a
    // different document. Both are dropped before the deduplication so one page counts once.
    resolved.hash = ''
    resolved.search = ''
    const href = resolved.href
    if (seen.has(href)) continue

    seen.add(href)
    links.push({ href, text: (anchor.textContent || '').replace(/\s+/g, ' ').trim() })
    if (links.length >= options.max) break
  }

  return links
}

function captureSections(): PageSection[] {
  const main = document.querySelector('main') ?? document.body

  function isVisible(el: Element): boolean {
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return false
    const style = getComputedStyle(el)
    return style.visibility !== 'hidden' && style.display !== 'none'
  }

  function clean(value: string | null | undefined): string {
    return (value || '').replace(/\s+/g, ' ').trim()
  }

  return Array.from(main.children)
    .filter(isVisible)
    .map((section) => ({
      heading: clean(section.querySelector('h1, h2, h3, h4, h5, h6')?.textContent) || null,
      text: clean(section.textContent)
    }))
    .filter((section) => section.text.length > 0)
}

function captureStructure(options: {
  oauthProviders: Record<string, string[]>
  patterns: typeof STRUCTURE_PATTERNS
  trust: typeof TRUST_PATTERNS
  deadHrefs: string[]
  ctaMaxWords: number
}): PageStructure {
  const { oauthProviders, patterns, trust, deadHrefs, ctaMaxWords } = options

  function isVisible(el: Element): boolean {
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return false
    const style = getComputedStyle(el)
    return style.visibility !== 'hidden' && style.display !== 'none'
  }

  function label(el: Element): string {
    const text = (el.textContent || '') + ' ' + (el.getAttribute('aria-label') || '')
    return text.replace(/\s+/g, ' ').trim().toLowerCase()
  }

  function matchesAny(value: string, needles: string[]): boolean {
    return needles.some((needle) => value.includes(needle))
  }

  function words(value: string): number {
    return value.split(/\s+/).filter(Boolean).length
  }

  const clickables = Array.from(document.querySelectorAll('a, button')).filter(isVisible)

  // One pass, two answers. The auth test was already being run here to decide which controls could
  // carry a provider name; it simply was not recorded, so nothing downstream could tell a page that
  // signs people in from a page that merely has a form.
  //
  // `closest('form')` is what separates the sign in *action* from a link to the sign in *page*. A
  // navigation link is an anchor loose in a header; the real control submits something.
  let authInForm = false
  const providers = new Set<string>()
  for (const el of clickables) {
    const text = label(el)
    if (!matchesAny(text, patterns.auth)) continue
    if (el.closest('form')) authInForm = true
    for (const [provider, needles] of Object.entries(oauthProviders)) {
      if (matchesAny(text, needles)) providers.add(provider)
    }
  }

  const fields = Array.from(
    document.querySelectorAll<HTMLElement>('input, select, textarea')
  ).filter((el) => {
    if (el.tagName === 'INPUT') {
      const type = (el as HTMLInputElement).type
      if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) return false
    }
    return isVisible(el)
  })

  const forms = Array.from(document.querySelectorAll('form')).filter((form) =>
    fields.some((field) => form.contains(field))
  )

  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(isVisible)
  const headingText = headings.map((h) => label(h))

  const bodyText = (document.body.innerText || '').replace(/\s+/g, ' ').trim()

  const ctas = clickables.filter((el) => {
    if (el.closest('nav, header, footer')) return false
    const text = label(el)
    return text.length > 0 && words(text) <= ctaMaxWords
  })

  const hasStickyCta = Array.from(document.querySelectorAll('*')).some((el) => {
    const position = getComputedStyle(el).position
    if (position !== 'fixed' && position !== 'sticky') return false
    return isVisible(el) && el.querySelector('a, button') !== null
  })

  const hasVideo =
    document.querySelector('video') !== null ||
    Array.from(document.querySelectorAll('iframe')).some((frame) =>
      matchesAny((frame.getAttribute('src') || '').toLowerCase(), patterns.videoHosts)
    )

  const main = document.querySelector('main') ?? document.body

  // ---- What the form asks for. Read only: nothing here clicks, types, or submits. ----

  function labelled(field: HTMLElement): boolean {
    if (field.getAttribute('aria-label') || field.getAttribute('aria-labelledby')) return true
    if (field.closest('label')) return true
    const id = field.getAttribute('id')
    // A placeholder is deliberately not a label: it disappears the moment the visitor types, so the
    // field they are halfway through filling has nothing next to it saying what it wanted.
    return Boolean(id && document.querySelector(`label[for="${CSS.escape(id)}"]`))
  }

  const requiredFieldCount = fields.filter(
    (field) => field.hasAttribute('required') || field.getAttribute('aria-required') === 'true'
  ).length

  const stepContainers = forms.flatMap((form) =>
    Array.from(form.querySelectorAll('fieldset, [role="group"], [data-step], [class*="step"]'))
  ).filter(isVisible)

  const hasSubmit = forms.some(
    (form) =>
      form.querySelector('button[type="submit"], input[type="submit"], button:not([type])') !== null
  )

  const hasClientValidation = fields.some((field) => {
    if (field.hasAttribute('required') || field.hasAttribute('pattern')) return true
    const type = field.getAttribute('type')
    return type !== null && ['email', 'tel', 'url', 'number'].includes(type)
  })

  const deadCtaCount = ctas.filter((el) => {
    if (el.tagName !== 'A') return false
    const href = el.getAttribute('href')
    return href === null || deadHrefs.includes(href.trim().toLowerCase())
  }).length

  // ---- Why a visitor should believe it. ----

  const bodyLower = bodyText.toLowerCase()
  const anchors = Array.from(document.querySelectorAll('a')).filter(isVisible)

  function anchorMatches(needles: string[]): boolean {
    return anchors.some((el) => {
      const href = (el.getAttribute('href') || '').toLowerCase()
      return matchesAny(label(el), needles) || matchesAny(href, needles)
    })
  }

  const quotes = Array.from(
    document.querySelectorAll('blockquote, [class*="testimonial"], [class*="depoimento"]')
  ).filter(isVisible)

  const trustBadgeCount = Array.from(document.querySelectorAll('img')).filter((img) => {
    const source = (
      (img.getAttribute('alt') || '') +
      ' ' +
      (img.getAttribute('src') || '')
    ).toLowerCase()
    return matchesAny(source, trust.badges)
  }).length

  return {
    hasOauth: providers.size > 0,
    hasAuthForm:
      authInForm ||
      providers.size > 0 ||
      fields.some((el) => el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'password'),
    oauthProviders: Array.from(providers),
    formCount: forms.length,
    formFieldCount: fields.length,
    hasFaq:
      document.querySelector('details > summary') !== null ||
      headingText.some((text) => matchesAny(text, patterns.faq)),
    hasPricing:
      headingText.some((text) => matchesAny(text, patterns.pricing)) ||
      /[$€£]\s?\d|R\$\s?\d/.test(bodyText),
    hasTestimonials:
      document.querySelector('blockquote') !== null ||
      headingText.some((text) => matchesAny(text, patterns.testimonials)),
    hasVideo,
    hasStickyCta,
    bodyLinkCount: ctas.length,
    // Both bounds, not just the upper one. `top < innerHeight` alone is also true of everything
    // ABOVE the viewport, and an off canvas menu parks its whole contents at a negative top -- so a
    // page with a closed drawer counted a dozen calls to action nobody can see.
    aboveFoldCtaCount: ctas.filter((el) => {
      const top = el.getBoundingClientRect().top
      return top >= 0 && top < window.innerHeight
    }).length,
    navLinkCount: Array.from(document.querySelectorAll('nav a, header a')).filter(isVisible).length,
    headingCount: headings.length,
    sectionCount: Array.from(main.children).filter(isVisible).length,
    wordCount: words(bodyText),

    requiredFieldCount,
    fieldsWithoutLabel: fields.filter((field) => !labelled(field)).length,
    // A flat form is one step, not zero. Zero is reserved for a page with no form at all, which is
    // the value the readout uses to stay quiet rather than to report a form of length nothing.
    formSteps: forms.length === 0 ? 0 : Math.max(1, stepContainers.length),
    hasSubmit,
    hasClientValidation,
    deadCtaCount,

    hasCnpj: new RegExp(trust.cnpj).test(bodyText) || matchesAny(bodyLower, trust.cnpjLabel),
    testimonialWithAttributionCount: quotes.filter(
      (quote) =>
        quote.querySelector('cite, footer, img, [class*="author"], [class*="name"]') !== null
    ).length,
    clientLogoCount: Array.from(
      document.querySelectorAll('[class*="logo"] img, [class*="client"] img, [class*="brand"] img')
    ).filter(isVisible).length,
    trustBadgeCount,
    hasPrivacyPolicy: anchorMatches(trust.privacy),
    hasTerms: anchorMatches(trust.terms),
    hasPhysicalAddress:
      document.querySelector('address') !== null || new RegExp(trust.postcode).test(bodyText),
    hasPhone:
      document.querySelector('a[href^="tel:"]') !== null || new RegExp(trust.phone).test(bodyText),
    hasSocialLinks: anchors.some((el) =>
      matchesAny((el.getAttribute('href') || '').toLowerCase(), trust.socialHosts)
    )
  }
}

/**
 * What the page does to a thumb. Runs in the mobile viewport, after the reload, and measures only
 * the things that differ from the desktop pass: a meta description reads the same on both, so
 * repeating it here would be noise dressed as a second opinion.
 *
 */
function captureMobile(options: {
  tapTargetMinPx: number
  minFontPx: number
  ctaMaxWords: number
}): PageMobile {
  const { tapTargetMinPx, minFontPx, ctaMaxWords } = options

  // Stricter than the desktop pass's, and it has to be. A phone layout routinely keeps its whole
  // navigation in the DOM translated off to one side, and `display`/`visibility` say nothing about
  // that -- so the closed menu's twenty links arrive as twenty visible controls, every one of them
  // "too small to tap". Requiring the element to actually intersect the viewport horizontally is
  // what stops the audit accusing a well built page of a menu the visitor never sees.
  function isVisible(el: Element): boolean {
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return false
    if (rect.right <= 0 || rect.left >= window.innerWidth) return false
    const style = getComputedStyle(el)
    if (style.visibility === 'hidden' || style.display === 'none') return false
    return parseFloat(style.opacity) > 0
  }

  function label(el: Element): string {
    const text = (el.textContent || '') + ' ' + (el.getAttribute('aria-label') || '')
    return text.replace(/\s+/g, ' ').trim().toLowerCase()
  }

  const interactive = Array.from(
    document.querySelectorAll('a, button, input, select, textarea, [role="button"]')
  ).filter(isVisible)

  // A link inside a sentence is prose, not a tap target, and a paragraph full of them is not a page
  // that fails to be usable with a thumb. Every real control -- a button, a field, a nav item, a
  // card -- lays itself out as something other than `inline`, so that is the line.
  const tapTargets = interactive.filter((el) => getComputedStyle(el).display !== 'inline')

  const ctas = interactive.filter((el) => {
    if (el.closest('nav, header, footer')) return false
    const text = label(el)
    return text.length > 0 && text.split(/\s+/).filter(Boolean).length <= ctaMaxWords
  })

  // Counted on elements that carry their own words, so a wrapper inheriting a small size from a
  // child it does not render is not counted twice.
  const tinyTextCount = Array.from(document.querySelectorAll('p, span, li, a, td, label, small'))
    .filter(isVisible)
    .filter((el) => {
      const own = Array.from(el.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && (node.textContent || '').trim().length > 0
      )
      if (!own) return false
      return parseFloat(getComputedStyle(el).fontSize) < minFontPx
    }).length

  return {
    // The one finding a visitor feels before reading anything: the page slides sideways.
    horizontalOverflow:
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    smallTapTargetCount: tapTargets.filter((el) => {
      const rect = el.getBoundingClientRect()
      return rect.width < tapTargetMinPx || rect.height < tapTargetMinPx
    }).length,
    tinyTextCount,
    aboveFoldCtaCount: ctas.filter((el) => {
      const top = el.getBoundingClientRect().top
      return top >= 0 && top < window.innerHeight
    }).length,
    hasViewportMeta: document.querySelector('meta[name="viewport"]') !== null
  }
}

function captureSeo(options: { headingsMax: number; headingMaxChars: number }): PageSeo {
  function attr(selector: string, name: string): string | null {
    const value = document.querySelector(selector)?.getAttribute(name)
    const trimmed = (value || '').trim()
    return trimmed.length > 0 ? trimmed : null
  }

  const jsonLdTypes = new Set<string>()
  for (const script of Array.from(
    document.querySelectorAll('script[type="application/ld+json"]')
  )) {
    try {
      const collect = (node: unknown): void => {
        if (Array.isArray(node)) {
          node.forEach(collect)
          return
        }
        if (node === null || typeof node !== 'object') return
        const record = node as Record<string, unknown>
        const type = record['@type']
        if (typeof type === 'string') jsonLdTypes.add(type)
        if (Array.isArray(type)) {
          type.forEach((t) => {
            if (typeof t === 'string') jsonLdTypes.add(t)
          })
        }
        if ('@graph' in record) collect(record['@graph'])
      }
      collect(JSON.parse(script.textContent || ''))
    } catch {
    }
  }

  const images = Array.from(document.querySelectorAll('img'))
  const origin = window.location.origin

  return {
    title: (document.title || '').trim() || null,
    metaDescription: attr('meta[name="description"]', 'content'),
    canonical: attr('link[rel="canonical"]', 'href'),
    robotsMeta: attr('meta[name="robots"]', 'content'),
    lang: attr('html', 'lang'),
    h1Count: document.querySelectorAll('h1').length,
    imageCount: images.length,
    imagesMissingAlt: images.filter((img) => !img.hasAttribute('alt')).length,
    internalLinkCount: Array.from(document.querySelectorAll('a[href]')).filter((a) => {
      const href = a.getAttribute('href') || ''
      if (href.startsWith('#')) return false
      try {
        return new URL(href, origin).origin === origin
      } catch {
        return false
      }
    }).length,
    hasOgTitle: attr('meta[property="og:title"]', 'content') !== null,
    hasOgDescription: attr('meta[property="og:description"]', 'content') !== null,
    hasOgImage: attr('meta[property="og:image"]', 'content') !== null,
    jsonLdTypes: Array.from(jsonLdTypes),
    headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map((heading) => (heading.textContent || '').replace(/\s+/g, ' ').trim())
      .filter((text) => text.length > 0)
      .slice(0, options.headingsMax)
      .map((text) => text.slice(0, options.headingMaxChars))
  }
}

async function capturePerformance(options: { lcpFlushMs: number }): Promise<PagePerformance> {
  function round(value: number | null | undefined): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
    return Math.round(value)
  }

  const lcpMs = await new Promise<number | null>((resolve) => {
    let latest: number | null = null
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) latest = entry.startTime
      })
      observer.observe({ type: 'largest-contentful-paint', buffered: true })
      setTimeout(() => {
        observer.disconnect()
        resolve(latest)
      }, options.lcpFlushMs)
    } catch {
      resolve(null)
    }
  })

  const navigation = window.performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined

  const paint = window.performance
    .getEntriesByType('paint')
    .find((entry) => entry.name === 'first-contentful-paint')

  const resources = window.performance.getEntriesByType(
    'resource'
  ) as PerformanceResourceTiming[]

  const transferred =
    (navigation?.transferSize ?? 0) +
    resources.reduce((total, entry) => total + (entry.transferSize || 0), 0)

  return {
    ttfbMs: round(navigation?.responseStart),
    fcpMs: round(paint?.startTime),
    lcpMs: round(lcpMs),
    domContentLoadedMs: round(navigation?.domContentLoadedEventEnd),
    loadMs: round(navigation?.loadEventEnd),
    transferredBytes: transferred > 0 ? transferred : null,
    requestCount: resources.length,
    domNodeCount: document.getElementsByTagName('*').length
  }
}

/**
 * The page's readable text, with the markup taken out.
 *
 * **It does not truncate.** A `.slice` here, invisible to every caller, is how a long page reaches
 * every prompt as its own top third. The budget belongs to whoever is building a prompt (see
 * composePageText in lib/page-text.ts) and this function's only job is to flatten.
 */
export function preprocessHtml(html: string): string {
  const text = html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()

  return text
}
