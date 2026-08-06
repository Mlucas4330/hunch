import { lookup } from 'node:dns/promises'
import puppeteer, { type Browser, type Page } from 'puppeteer'
import {
  BROWSER_CONNECT_RETRY_DELAY_MS,
  GOAL_CANDIDATE_MAX_WORDS,
  OAUTH_PROVIDER_PATTERNS,
  STRUCTURE_PATTERNS,
  SCRAPE_ALLOWED_RESOURCE_TYPES,
  SCRAPE_ASSET_READY_TIMEOUT_MS,
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
  TARGET_MATCH_MAX_WORD_RATIO
} from '@/lib/constants'
import { assertPublicUrl, isPublicUrl } from '@/lib/url-guard'
import { wordCount } from '@/lib/text'

export interface PageElement {
  text: string
  selector: string
  tag: string
}

// What the page DOES, as opposed to what it says. The copy hypotheses only ever need `elements`;
// the flow playbook needs to know whether a fix it is about to recommend is already implemented.
// Flat and boolean/numeric only: it is serialized straight into the playbook prompt, where a nested
// shape would cost tokens without telling the model anything the flat one does not.
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
  // Every short clickable in the body, not only real calls to action -- a feature card's "Learn
  // more" counts. Named for what it measures so the model never reads it as "you have 68 CTAs".
  bodyLinkCount: number
  aboveFoldCtaCount: number
  navLinkCount: number
  headingCount: number
  sectionCount: number
  wordCount: number
}

// What a crawler and a language model can find, read, and cite. Sibling of PageStructure and held to
// the same discipline -- flat, measured, no inference -- but a separate readout because it answers a
// different question: PageStructure is what the page DOES, this is how the page is DESCRIBED.
//
// Nearly all of it is the <head>, which preprocessHtml strips before any model sees the page, so
// without this capture none of it reaches generation at all.
export interface PageSeo {
  title: string | null
  metaDescription: string | null
  canonical: string | null
  // The <meta name="robots"> content verbatim. A page can be noindex without anyone noticing.
  robotsMeta: string | null
  // <html lang>. Also what detectMarket reads, which is why the two features share one capture.
  lang: string | null
  h1Count: number
  // Images are how a landing page states its strongest claims, and alt text is the only version of
  // them a crawler or a model receives.
  imageCount: number
  imagesMissingAlt: number
  internalLinkCount: number
  hasOgTitle: boolean
  hasOgDescription: boolean
  hasOgImage: boolean
  // The @type of every JSON-LD block on the page (Organization, Product, FAQPage, ...). The most
  // direct citability signal there is: it is the page telling a machine what it is, in machine terms.
  jsonLdTypes: string[]
}

export type TargetMode = 'auto' | 'manual'

export interface GoalCandidate {
  text: string
  selector: string
}

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
}

export class ScrapeError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ScrapeError'
  }
}

// Pages open concurrently against the shared browser are capped, and the counter lives on globalThis
// for the same reason the Redis client does (lib/rate-limit.ts): Next re-evaluates modules on every
// edit in dev and splits server bundles per route, so a module-scope counter risks being per-bundle
// rather than per-process -- a cap that silently is not one.
const globalForBrowserPool = globalThis as unknown as {
  browserPool?: { active: number; waiting: Array<() => void> }
}

function browserPool() {
  globalForBrowserPool.browserPool ??= { active: 0, waiting: [] }

  return globalForBrowserPool.browserPool
}

// The invariant that makes the pool safe: nothing may await scrapePage or screenshotVariant while
// already holding a slot. Nothing does today -- analyze.ts fans its competitor scrapes out flat --
// but a nested call self-deadlocks at the cap and presents as an analysis that simply hangs.
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

      // Presence in the queue is what says "not yet granted", so there is nothing to clear: a slot
      // that arrived first took `grant` off the queue, and the expiry then finds nothing to do.
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
    // Decrement first, then hand the freed slot to the next waiter, which re-increments it. Waking a
    // waiter without decrementing would raise the effective cap by one on every handoff.
    pool.active -= 1
    pool.waiting.shift()?.()
  }
}

async function connectToBrowser(remote: string): Promise<Browser> {
  // Chrome's DevTools endpoint refuses any Host header that is not an IP or localhost -- its own
  // DNS-rebinding guard -- so a service name has to be resolved before connecting.
  const { hostname, port, protocol } = new URL(remote)
  const { address, family } = await lookup(hostname)
  // Railway's internal DNS answers with IPv6, and a bare v6 literal in a URL is malformed --
  // it has to be bracketed or the connection never reaches Chrome.
  const host = family === 6 ? `[${address}]` : address

  return puppeteer.connect({ browserURL: `${protocol}//${host}:${port}` })
}

// The single place a browser is obtained, so the sandbox flags and the request guard below can
// never drift apart between call sites.
//
// In production BROWSER_URL points at a dedicated browser service: it holds no DB or API
// credentials, so a renderer escape finds nothing worth stealing. Unset -- local dev, the ingest
// CLI, the e2e suite -- falls back to launching Chrome in this process exactly as before.
async function launchBrowser(): Promise<Browser> {
  const remote = process.env.BROWSER_URL

  if (remote) {
    // Retried once, because the browser service restarts on its own (restartPolicyType: ALWAYS) and
    // the window where Chrome is coming back up is otherwise a hard failure for whatever asked
    // first. The hostname is resolved inside the attempt: a restarted container can come back on a
    // different internal address, so a cached resolution is exactly what must not be reused.
    try {
      return await connectToBrowser(remote)
    } catch {
      await new Promise((resolve) => setTimeout(resolve, BROWSER_CONNECT_RETRY_DELAY_MS))

      return connectToBrowser(remote)
    }
  }

  // The Chrome sandbox is what keeps a renderer exploit -- from a page we do not control -- away
  // from this process's env, which holds the DB and API credentials. Disabling it is opt-in and
  // explicit, never the silent default, because some serverless runtimes cannot provide it.
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

// The mirror of launchBrowser: a connected browser is shared by every later request, so closing it
// would take the whole container down with one scrape. The page is closed either way -- against a
// long-lived browser, relying on close() to reap it leaks a tab per scrape.
async function releaseBrowser(browser: Browser, page: Page | null): Promise<void> {
  await page?.close().catch(() => {})

  if (process.env.BROWSER_URL) {
    await browser.disconnect().catch(() => {})
    return
  }

  await browser.close().catch(() => {})
}

// assertPublicUrl only vets the URL we were handed. Redirects and anything the page requests on its
// own are re-checked here, which is what actually closes DNS rebinding and 302-to-metadata.
async function openGuardedPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage()
  page.setDefaultTimeout(SCRAPE_NAVIGATION_TIMEOUT_MS)

  // The functions handed to page.evaluate() are serialized as source, so whatever transpiled them
  // comes along. esbuild (which is what runs `npm run test:screenshot` through tsx) wraps named
  // functions in a __name() helper that lives in the module scope and therefore does not exist in
  // the page, making every evaluate throw "__name is not defined". Declaring it as an identity
  // function in the page is what lets the scraper run outside the Next build. Passed as a string so
  // it cannot itself be rewritten by the same transform.
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

// `networkidle2` is a network condition, not a rendering one: it fires once the sockets go quiet,
// which a client-rendered page satisfies while its skeleton is still the only thing on screen.
// Everything downstream reads the DOM -- the copy, the element list, the structural readout, the
// screenshot -- so the capture waits here until the rendered text stops growing. Bounded and
// fail-soft: a page that never settles is captured as-is rather than failing the scrape.
async function settlePage(page: Page): Promise<void> {
  const deadline = Date.now() + SCRAPE_SETTLE_TIMEOUT_MS
  let previous = -1

  while (Date.now() < deadline) {
    const length = await page.evaluate(() => document.body?.innerText.length ?? 0)

    // A stable sample that is still skeleton-sized means the frame has not painted yet, not that
    // the page is finished, so only a stable *and* substantial one ends the wait early.
    const stable = Math.abs(length - previous) <= SCRAPE_SETTLE_TEXT_TOLERANCE
    if (stable && length >= SCRAPE_SETTLE_MIN_TEXT_LENGTH) return

    previous = length
    await new Promise((resolve) => setTimeout(resolve, SCRAPE_SETTLE_POLL_MS))
  }
}

export async function scrapePage(url: string): Promise<ScrapedPage> {
  // Guarded before a slot is taken, so a refused URL never spends capacity the render path needs.
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
      const elements = await page.evaluate(captureElements)
      const structure = await page.evaluate(captureStructure, {
        oauthProviders: OAUTH_PROVIDER_PATTERNS,
        patterns: STRUCTURE_PATTERNS,
        ctaMaxWords: GOAL_CANDIDATE_MAX_WORDS
      })
      const seo = await page.evaluate(captureSeo)
      return { url, html, elements, structure, seo }
    } catch (error) {
      throw new ScrapeError(`Failed to scrape ${url}`, { cause: error })
    } finally {
      await releaseBrowser(browser, page)
    }
  })
}

// Renders the landing page with the variant copy swapped into its target element and captures an
// above-the-fold viewport PNG -- the changed element is scrolled to center so the report shows it
// in context, surrounded by its real neighbors. When a selector is given but the element can no
// longer be found or its text has drifted from `controlCopy` (stale selector), throws ScrapeError
// rather than silently shooting an unchanged page, so callers can degrade honestly.
export async function screenshotVariant(
  url: string,
  selector: string | null,
  variantCopy: string,
  controlCopy?: string | null
): Promise<Buffer> {
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

      if (selector) {
        const outcome = await page.evaluate(applyVariantCopy, {
          selector,
          variantCopy,
          controlCopy: controlCopy ?? null
        })

        if (outcome !== 'ok') {
          throw new ScrapeError(`Variant target not applicable on ${url} (${outcome})`)
        }
      }

      await awaitPaint(page)

      const shot = await page.screenshot({ type: 'png' })
      return Buffer.from(shot)
    } catch (error) {
      if (error instanceof ScrapeError) throw error
      throw new ScrapeError(`Failed to screenshot ${url}`, { cause: error })
    } finally {
      await releaseBrowser(browser, page)
    }
  })
}

type ApplyOutcome = 'ok' | 'not_found' | 'mismatch'

// Runs in the browser context: swap the variant copy into the target element WITHOUT touching its
// markup. `el.textContent = copy` used to do this, and it deleted every child node -- which is
// exactly the styling the preview exists to show, because captureElements targets the innermost
// block element with its inline children folded in, so the selector usually points at something like
// `<h1>The <span class="gradient">fastest</span> way to ship</h1>`. Writing only into the existing
// text nodes means gradient spans, <br>, icons and their CSS survive by construction.
//
// The new words are spread across those text nodes in proportion to the fragment lengths they
// replace, so every styled fragment keeps a share of the copy and still renders. The split point
// follows the original fragment sizes, so a span may end up wrapping a different word than the
// designer chose; that is strictly better than the span disappearing.
function applyVariantCopy(options: {
  selector: string
  variantCopy: string
  controlCopy: string | null
}): ApplyOutcome {
  const el = document.querySelector(options.selector)
  if (!el) return 'not_found'

  // Must stay ahead of the mutation: once a single node is rewritten there is no original text left
  // to compare, and a stale selector would be reported as a successful swap of the wrong element.
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
    // Whitespace-only nodes are the layout gaps between inline fragments. Writing to them would glue
    // words together, so they are left exactly as the page wrote them.
    if (!(text.nodeValue || '').trim()) continue
    nodes.push(text)
  }

  const words = options.variantCopy.split(/\s+/).filter(Boolean)

  if (nodes.length === 0) {
    // Never textContent here either: the element may hold an <img> or an <svg> and nothing else.
    el.appendChild(document.createTextNode(options.variantCopy))
  } else {
    const weights = nodes.map((node) => (node.nodeValue || '').trim().length)
    const total = weights.reduce((sum, weight) => sum + weight, 0) || nodes.length
    let taken = 0
    let wrote = false

    nodes.forEach((node, index) => {
      const value = node.nodeValue || ''
      // Adjacent fragments with no whitespace between them are legitimate markup
      // (`<span>Ship</span><span>Faster</span>`), but the split point is ours, not the page's, so a
      // separator has to be added or the copy renders as one glued word.
      const lead = value.match(/^\s*/)?.[0] || (wrote ? ' ' : '')
      const trail = value.match(/\s*$/)?.[0] ?? ''

      // Hold one word back for each fragment still to come, so a span whose proportional share
      // rounds to zero keeps a word and keeps rendering. The last node takes whatever is left, so
      // rounding can never drop a word.
      const remaining = words.length - taken
      const reserve = Math.min(nodes.length - index - 1, remaining)
      const ceiling = remaining - reserve
      const share = Math.round((words.length * weights[index]) / total)
      const take =
        index === nodes.length - 1
          ? remaining
          : Math.min(ceiling, Math.max(ceiling > 0 ? 1 : 0, share))

      const chunk = words.slice(taken, taken + take).join(' ')
      taken += take
      wrote = wrote || chunk.length > 0
      node.nodeValue = chunk ? lead + chunk + trail : ''
    })
  }

  el.scrollIntoView({ block: 'center', inline: 'nearest' })
  return 'ok'
}

// settlePage answers "has the text stopped changing", which is the right question for reading copy
// and the wrong one for taking a picture: a page whose text is final can still be painting its
// webfonts and its lazy images. Bounded and fail-soft -- an asset that never resolves costs the
// preview SCRAPE_ASSET_READY_TIMEOUT_MS, never the screenshot.
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

// Runs in the browser context: collect each visible "text unit" with a stable CSS path. A text unit
// is the innermost block-level element -- one whose only element children are inline formatting
// (span, a, strong, ...) -- captured with its FULL text so inline styling spans inside a heading are
// folded back in, while real blocks (a badge vs the headline beside it) stay separate entries.
function captureElements(): PageElement[] {
  const SKIP = new Set(['script', 'style', 'noscript', 'svg', 'head', 'meta', 'link', 'title'])
  // Inline formatting tags fold into their parent's text. Any other child tag makes the parent a
  // container, so its block children are captured on their own instead of merged together.
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

  const seen = new Set<string>()
  const out: PageElement[] = []
  for (const el of Array.from(document.querySelectorAll('*'))) {
    const tag = el.tagName.toLowerCase()
    if (SKIP.has(tag)) continue
    // A text unit has no block child; capture it as the outermost inline-only element (skipping the
    // inner span fragments folded into it). Links and buttons are ALSO captured individually so a CTA
    // still resolves on its own even when a flex row folds several anchors into one merged entry.
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
    out.push({ text, selector: cssPath(el), tag })
  }
  return out
}

// Runs in the browser context: measure what the page already does, so the playbook never recommends
// adding something that is already there. Every signal is deliberately conservative -- a false
// negative costs one redundant suggestion, a false positive silently drops a real fix.
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

  // A provider name alone means nothing (a dev tool links to GitHub in its nav). The same control
  // has to also read as an auth action for this to be social sign in.
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

// Runs in the browser context: read how the page describes itself to machines. Takes no options --
// unlike captureStructure there is no vocabulary to match against, only tags that either exist or do
// not, which is what keeps every field here a fact rather than a judgement.
function captureSeo(): PageSeo {
  function attr(selector: string, name: string): string | null {
    const value = document.querySelector(selector)?.getAttribute(name)
    const trimmed = (value || '').trim()
    return trimmed.length > 0 ? trimmed : null
  }

  // Every @type in the document's JSON-LD, including the ones nested in an @graph, which is how most
  // real sites emit more than one. Malformed JSON is skipped rather than thrown: a broken block is a
  // finding for the audit, not a reason to lose the whole scrape.
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
      // Unparseable block: nothing to record.
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
    // A decorative image is correctly alt="", so only a MISSING attribute counts as missing.
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
    jsonLdTypes: Array.from(jsonLdTypes)
  }
}

// The clickable elements a conversion can be pinned to. `captureElements` already emits anchors and
// buttons individually with a stable selector, so this is a filter over that output rather than a
// second DOM pass. Ordered longest-lived-CTA-first: real CTAs read like actions, so the wordier nav
// links sink below them and the default goal lands on something worth measuring.
export function goalCandidates(elements: PageElement[]): GoalCandidate[] {
  return elements
    .filter((e) => e.tag === 'a' || e.tag === 'button')
    .filter((e) => wordCount(e.text) <= GOAL_CANDIDATE_MAX_WORDS)
    .sort((a, b) => wordCount(a.text) - wordCount(b.text))
    .map((e) => ({ text: e.text, selector: e.selector }))
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

// Resolves a hypothesis's current copy to a single captured element, and classifies how safely it
// can be applied. `auto` only when the copy maps to exactly one element of a compatible size (so a
// long merged string never snaps onto a tiny badge); otherwise `manual`, with a null selector, and
// the report/embed degrade honestly instead of swapping the wrong element.
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
  // Ambiguous when the two best candidates are equally close.
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
