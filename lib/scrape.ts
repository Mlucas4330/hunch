import { lookup } from 'node:dns/promises'
import puppeteer, { type Browser, type Page } from 'puppeteer'
import {
  BROWSER_CONNECT_RETRY_DELAY_MS,
  FIT_MIN_SCALE,
  FIT_STEP_RATIO,
  FIT_TOLERANCE_PX,
  GOAL_CANDIDATE_MAX_WORDS,
  GOAL_TARGET_SELECTOR,
  NORMAL_LINE_HEIGHT_RATIO,
  OAUTH_PROVIDER_PATTERNS,
  STRUCTURE_PATTERNS,
  SCRAPE_ALLOWED_RESOURCE_TYPES,
  SCRAPE_ASSET_READY_TIMEOUT_MS,
  SCRAPE_LCP_FLUSH_MS,
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
  SEO_HEADING_MAX_CHARS,
  SEO_HEADINGS_MAX,
  TARGET_MATCH_MAX_WORD_RATIO,
  VARIANT_GROWTH_LINES
} from '@/lib/constants'
import { assertPublicUrl, isPublicUrl } from '@/lib/url-guard'
import { wordCount } from '@/lib/text'

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

export interface PageStructure {
  hasOauth: boolean
  oauthProviders: string[]
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
}

// `seo` and `performance` are optional because rows stored before they were kept do not have them,
// and a comparison row is dropped rather than guessed. See docs/readout.md.
export interface CompetitorStructure {
  name: string
  url: string
  structure: PageStructure
  seo?: PageSeo
  performance?: PagePerformance
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

export type TargetMode = 'auto' | 'manual'

export interface ResolvedTarget {
  selector: string | null
  mode: TargetMode
  text: string | null
}

export interface ScrapedPage {
  url: string
  html: string
  elements: PageElement[]
  structure: PageStructure
  seo: PageSeo
  performance: PagePerformance
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

  if (pool.active < SCRAPE_MAX_CONCURRENT_PAGES) {
    pool.active += 1
  } else {
    await new Promise<void>((resolve, reject) => {
      const grant = () => {
        pool.active += 1
        resolve()
      }

      pool.waiting.push(grant)

      setTimeout(() => {
        const queued = pool.waiting.indexOf(grant)
        if (queued === -1) return

        pool.waiting.splice(queued, 1)
        reject(new ScrapeError(`Timed out after ${maxWaitMs}ms waiting for a browser slot`))
      }, maxWaitMs)
    })
  }

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
        ctaMaxWords: GOAL_CANDIDATE_MAX_WORDS
      })
      const seo = await page.evaluate(captureSeo, {
        headingsMax: SEO_HEADINGS_MAX,
        headingMaxChars: SEO_HEADING_MAX_CHARS
      })
      const performance = await page.evaluate(capturePerformance, {
        lcpFlushMs: SCRAPE_LCP_FLUSH_MS
      })
      return { url, html, elements, structure, seo, performance }
    } catch (error) {
      throw new ScrapeError(`Failed to scrape ${url}`, { cause: error })
    } finally {
      await releaseBrowser(browser, page)
    }
  })
}

export type VariantShot = {
  buffer: Buffer
  // The copy still did not fit its box at the smallest size the fit is willing to use, so the image
  // shows the reader clipped text. Surfaced rather than swallowed -- see docs/report.md.
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

      await awaitPaint(page)

      const shot = await page.screenshot({ type: 'png' })
      return { buffer: Buffer.from(shot), overflow }
    } catch (error) {
      if (error instanceof ScrapeError) throw error
      throw new ScrapeError(`Failed to screenshot ${url}`, { cause: error })
    } finally {
      await releaseBrowser(browser, page)
    }
  })
}

// Whether the page carries the conversion goal attribute. A browser, not a fetch: on a
// client-rendered page the attribute is not in the served HTML, and answering "missing" for a page
// that has it would block a launch that should have gone ahead.
export async function pageHasGoalTarget(url: string): Promise<boolean> {
  // Mirrors measurePage in lib/analyze.ts. Keyed on the URL rather than a flat true so the refusal
  // path stays reachable from e2e, which puts its tag in the URL.
  if (process.env.E2E_FIXTURES === '1') return !url.includes('no-goal')

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
      return await page.evaluate(
        (selector) => !!document.querySelector(selector),
        GOAL_TARGET_SELECTOR
      )
    } catch (error) {
      throw new ScrapeError(`Failed to check the conversion goal on ${url}`, { cause: error })
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

  const outcome = fitToBox(el as HTMLElement)
  el.scrollIntoView({ block: 'center', inline: 'nearest' })
  return outcome
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

function captureStructure(options: {
  oauthProviders: Record<string, string[]>
  patterns: typeof STRUCTURE_PATTERNS
  ctaMaxWords: number
}): PageStructure {
  const { oauthProviders, patterns, ctaMaxWords } = options

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

  const providers = new Set<string>()
  for (const el of clickables) {
    const text = label(el)
    if (!matchesAny(text, patterns.auth)) continue
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

  return {
    hasOauth: providers.size > 0,
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
    aboveFoldCtaCount: ctas.filter((el) => el.getBoundingClientRect().top < window.innerHeight)
      .length,
    navLinkCount: Array.from(document.querySelectorAll('nav a, header a')).filter(isVisible).length,
    headingCount: headings.length,
    sectionCount: Array.from(main.children).filter(isVisible).length,
    wordCount: words(bodyText)
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

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function resolveTarget(currentCopy: string, elements: PageElement[]): ResolvedTarget {
  const manual: ResolvedTarget = { selector: null, mode: 'manual', text: null }
  const target = normalize(currentCopy)
  if (!target) return manual

  const exact = elements.filter((e) => normalize(e.text) === target)
  if (exact.length === 1) return { selector: exact[0].selector, mode: 'auto', text: exact[0].text }
  if (exact.length > 1) return manual

  const targetWords = wordCount(target)
  const near = elements
    .map((e) => ({ el: e, norm: normalize(e.text) }))
    .filter(({ norm }) => norm.includes(target) || target.includes(norm))
    .map(({ el, norm }) => {
      const words = wordCount(norm)
      const ratio = Math.max(words, targetWords) / Math.max(1, Math.min(words, targetWords))
      return { el, ratio }
    })
    .filter(({ ratio }) => ratio <= TARGET_MATCH_MAX_WORD_RATIO)
    .sort((a, b) => a.ratio - b.ratio)

  if (near.length === 0) return manual
  if (near.length > 1 && near[0].ratio === near[1].ratio) return manual
  return { selector: near[0].el.selector, mode: 'auto', text: near[0].el.text }
}

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

  return text.slice(0, 8000)
}
