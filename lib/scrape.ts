import { lookup } from 'node:dns/promises'
import puppeteer, { type Browser, type Page } from 'puppeteer'
import {
  BROWSER_CONNECT_RETRY_DELAY_MS,
  GOAL_CANDIDATE_MAX_WORDS,
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
  TARGET_MATCH_MAX_WORD_RATIO
} from '@/lib/constants'
import { assertPublicUrl, isPublicUrl } from '@/lib/url-guard'
import { wordCount } from '@/lib/text'

export interface PageElement {
  text: string
  selector: string
  tag: string
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

export interface CompetitorStructure {
  name: string
  url: string
  structure: PageStructure
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
      const elements = await page.evaluate(captureElements)
      const structure = await page.evaluate(captureStructure, {
        oauthProviders: OAUTH_PROVIDER_PATTERNS,
        patterns: STRUCTURE_PATTERNS,
        ctaMaxWords: GOAL_CANDIDATE_MAX_WORDS
      })
      const seo = await page.evaluate(captureSeo)
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

export function applyVariantCopy(options: {
  selector: string
  variantCopy: string
  controlCopy: string | null
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

  if (nodes.length === 0) {
    el.appendChild(document.createTextNode(options.variantCopy))
  } else {
    const weights = nodes.map((node) => (node.nodeValue || '').trim().length)
    const total = weights.reduce((sum, weight) => sum + weight, 0) || nodes.length
    let taken = 0
    let wrote = false

    nodes.forEach((node, index) => {
      const value = node.nodeValue || ''
      const lead = value.match(/^\s*/)?.[0] || (wrote ? ' ' : '')
      const trail = value.match(/\s*$/)?.[0] ?? ''

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

function captureElements(): PageElement[] {
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
    out.push({ text, selector: cssPath(el), tag })
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

function captureSeo(): PageSeo {
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
    jsonLdTypes: Array.from(jsonLdTypes)
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
