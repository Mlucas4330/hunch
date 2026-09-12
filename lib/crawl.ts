import {
  CRAWL_ACCEPT_HTML,
  CRAWL_ACCEPT_XML,
  CRAWL_BUDGET_MS,
  CRAWL_CONCURRENCY,
  CRAWL_HTML_CONTENT_TYPE,
  CRAWL_MAX_REDIRECTS,
  CRAWL_NOINDEX_DIRECTIVE,
  CRAWL_PAGE_MAX,
  CRAWL_PAGE_MAX_BYTES,
  CRAWL_PAGE_TIMEOUT_MS,
  CRAWL_ROBOTS_META_NAMES,
  CRAWL_SITEMAP_DEFAULT_PATH,
  CRAWL_SITEMAP_FILES_MAX,
  CRAWL_SITEMAP_MAX_BYTES,
  CRAWL_SKIP_EXTENSIONS,
  CRAWL_USER_AGENT,
  HTTP_STATUS
} from '@/lib/constants'
import type { CrawlSource, CrawlStatus } from '@/lib/enums'
import { guardedFetch, type GuardedFetchOptions } from '@/lib/guarded-fetch'
import { countWords } from '@/lib/keywords'
import { log } from '@/lib/log'
import { isDisallowed, type CrawlerAccess } from '@/lib/robots'
import { preprocessHtml } from '@/lib/scrape'

export type CrawledPage = {
  url: string
  // Null when the page never answered: a timeout, a refused URL, too many redirects.
  status: number | null
  redirectedTo: string | null
  // False when there was no HTML to read: an error status, another content type, a body past the cap,
  // or a redirect that left the origin. Every field below is empty then, and never judged.
  parsed: boolean
  title: string | null
  metaDescription: string | null
  canonicalElsewhere: boolean
  noindex: boolean
  h1Count: number
  wordCount: number
  inSitemap: boolean
}

export type SiteCrawl = {
  status: CrawlStatus
  source: CrawlSource
  // The URL the analysis was run on, always the first page read.
  entry: string
  truncated: boolean
  pages: CrawledPage[]
}

export type ParsedPage = Pick<
  CrawledPage,
  'title' | 'metaDescription' | 'canonicalElsewhere' | 'noindex' | 'h1Count' | 'wordCount'
> & { links: string[] }

const TAG_ATTRIBUTE = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g

const PAGE_FETCH: GuardedFetchOptions = {
  timeoutMs: CRAWL_PAGE_TIMEOUT_MS,
  maxBytes: CRAWL_PAGE_MAX_BYTES,
  maxRedirects: CRAWL_MAX_REDIRECTS,
  headers: { accept: CRAWL_ACCEPT_HTML, 'user-agent': CRAWL_USER_AGENT }
}

const SITEMAP_FETCH: GuardedFetchOptions = {
  timeoutMs: CRAWL_PAGE_TIMEOUT_MS,
  maxBytes: CRAWL_SITEMAP_MAX_BYTES,
  maxRedirects: CRAWL_MAX_REDIRECTS,
  headers: { accept: CRAWL_ACCEPT_XML, 'user-agent': CRAWL_USER_AGENT }
}

function attributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const match of tag.matchAll(TAG_ATTRIBUTE)) {
    out[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? ''
  }
  return out
}

function textOf(raw: string): string {
  return preprocessHtml(raw).replace(/\s+/g, ' ').trim()
}

/**
 * One key per page, so `/about`, `/about/` and `/about#team` are read once. The query string stays:
 * `?page=2` is a different page.
 */
export function urlKey(href: string): string {
  try {
    const url = new URL(href)
    const path = url.pathname.replace(/\/+$/, '') || '/'
    return `${url.origin}${path}${url.search}`
  } catch {
    return href
  }
}

function sameOriginPage(href: string, base: string, origin: string): string | null {
  let url: URL
  try {
    url = new URL(href, base)
  } catch {
    return null
  }

  if (url.origin !== origin) return null
  const path = url.pathname.toLowerCase()
  if (CRAWL_SKIP_EXTENSIONS.some((extension) => path.endsWith(extension))) return null

  url.hash = ''
  return url.href
}

/**
 * What one page's HTML says about itself, read without a browser. Pure, so it is tested against stored
 * HTML rather than against a site.
 */
export function parseCrawledPage(html: string, pageUrl: string, xRobotsTag: string | null): ParsedPage {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? textOf(titleMatch[1]) || null : null

  let metaDescription: string | null = null
  let noindex = (xRobotsTag ?? '').toLowerCase().includes(CRAWL_NOINDEX_DIRECTIVE)

  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag)
    const name = (attrs.name ?? '').toLowerCase()

    if (name === 'description' && metaDescription === null) {
      metaDescription = textOf(attrs.content ?? '') || null
    }
    if (CRAWL_ROBOTS_META_NAMES.includes(name) && (attrs.content ?? '').toLowerCase().includes(CRAWL_NOINDEX_DIRECTIVE)) {
      noindex = true
    }
  }

  let canonicalElsewhere = false
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag)
    if (!(attrs.rel ?? '').toLowerCase().split(/\s+/).includes('canonical') || !attrs.href) continue

    try {
      canonicalElsewhere = urlKey(new URL(attrs.href, pageUrl).href) !== urlKey(pageUrl)
    } catch {
      canonicalElsewhere = false
    }
    break
  }

  const origin = new URL(pageUrl).origin
  const links = new Set<string>()
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = attributes(tag).href
    if (!href) continue
    const page = sameOriginPage(href, pageUrl, origin)
    if (page) links.add(page)
  }

  return {
    title,
    metaDescription,
    canonicalElsewhere,
    noindex,
    h1Count: (html.match(/<h1[\s>]/gi) ?? []).length,
    wordCount: countWords(preprocessHtml(html)),
    links: [...links]
  }
}

/** The `<loc>` entries of a sitemap, and whether it is an index of other sitemaps. */
export function sitemapLocs(xml: string): { index: boolean; locs: string[] } {
  const locs = [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([\s\S]*?)\s*(?:\]\]>)?\s*<\/loc>/gi)]
    .map((match) => textOf(match[1]))
    .filter((loc) => loc.length > 0)

  return { index: /<sitemapindex[\s>]/i.test(xml), locs }
}

async function readSitemap(url: string): Promise<{ index: boolean; locs: string[] }> {
  const response = await guardedFetch(url, SITEMAP_FETCH)
  if (!response?.body) return { index: false, locs: [] }
  return sitemapLocs(response.body)
}

// One level of sitemap index, and never more files than CRAWL_SITEMAP_FILES_MAX.
async function sitemapPages(origin: string, access: CrawlerAccess): Promise<string[]> {
  const roots = access.sitemaps.length > 0
    ? access.sitemaps
    : [new URL(CRAWL_SITEMAP_DEFAULT_PATH, origin).href]

  const found: string[] = []
  let files = 0

  for (const root of roots) {
    if (files >= CRAWL_SITEMAP_FILES_MAX || found.length >= CRAWL_PAGE_MAX) break
    files++

    const { index, locs } = await readSitemap(root)
    if (!index) {
      found.push(...locs)
      continue
    }

    for (const child of locs) {
      if (files >= CRAWL_SITEMAP_FILES_MAX || found.length >= CRAWL_PAGE_MAX) break
      files++
      found.push(...(await readSitemap(child)).locs)
    }
  }

  return found.flatMap((loc) => sameOriginPage(loc, origin, origin) ?? [])
}

function unparsed(url: string, status: number | null, redirectedTo: string | null): CrawledPage {
  return {
    url,
    status,
    redirectedTo,
    parsed: false,
    title: null,
    metaDescription: null,
    canonicalElsewhere: false,
    noindex: false,
    h1Count: 0,
    wordCount: 0,
    inSitemap: false
  }
}

async function readPage(url: string, origin: string): Promise<{ page: CrawledPage; links: string[] }> {
  const response = await guardedFetch(url, PAGE_FETCH)
  if (!response) return { page: unparsed(url, null, null), links: [] }

  const redirectedTo = response.redirected ? response.url : null
  const html = (response.headers.get('content-type') ?? '').includes(CRAWL_HTML_CONTENT_TYPE)

  if (response.body === null || !html || new URL(response.url).origin !== origin) {
    return { page: unparsed(url, response.status, redirectedTo), links: [] }
  }

  const { links, ...parsed } = parseCrawledPage(response.body, response.url, response.headers.get('x-robots-tag'))
  return { page: { ...unparsed(url, response.status, redirectedTo), ...parsed, parsed: true }, links }
}

function answered(page: CrawledPage | undefined): boolean {
  return (
    page?.status != null &&
    page.status >= HTTP_STATUS.successMin &&
    page.status < HTTP_STATUS.redirectMin
  )
}

/**
 * Up to CRAWL_PAGE_MAX pages of the reader's site, read by plain fetch. See docs/scraping.md.
 *
 * **The entry page decides whether anything here is true.** The browser already loaded it, so a fetch
 * that cannot is a site refusing clients that are not browsers, and every status it answers the
 * crawl with is that refusal rather than a fact about a page. The whole crawl is `unknown` then. See
 * docs/invariants.md.
 */
export async function crawlSite(pageUrl: string, access: CrawlerAccess): Promise<SiteCrawl> {
  const startedAt = Date.now()
  const entry = new URL(pageUrl)
  entry.hash = ''

  const first = await readPage(entry.href, entry.origin)
  const origin = new URL(first.page.redirectedTo ?? entry.href).origin
  const disallowed = access.disallowed ?? []

  const sitemap = await sitemapPages(origin, access)
  const inSitemap = new Set(sitemap.map(urlKey))

  const pages: CrawledPage[] = []
  const queue: string[] = []
  const seen = new Set<string>()

  const record = ({ page, links }: { page: CrawledPage; links: string[] }) => {
    pages.push({ ...page, inSitemap: inSitemap.has(urlKey(page.url)) })
    links.forEach(enqueue)
  }

  function enqueue(href: string) {
    const key = urlKey(href)
    if (seen.has(key)) return
    seen.add(key)

    const url = new URL(href)
    if (isDisallowed(`${url.pathname}${url.search}`, disallowed)) return
    queue.push(href)
  }

  seen.add(urlKey(entry.href))
  if (first.page.redirectedTo) seen.add(urlKey(first.page.redirectedTo))
  record(first)
  sitemap.forEach(enqueue)

  let next = 0
  while (next < queue.length && pages.length < CRAWL_PAGE_MAX && Date.now() - startedAt < CRAWL_BUDGET_MS) {
    const batch = queue.slice(next, next + Math.min(CRAWL_CONCURRENCY, CRAWL_PAGE_MAX - pages.length))
    next += batch.length
    ;(await Promise.all(batch.map((url) => readPage(url, origin)))).forEach(record)
  }

  const crawl: SiteCrawl = {
    status: answered(pages[0]) ? 'crawled' : 'unknown',
    source: sitemap.length > 0 ? 'sitemap' : 'links',
    entry: entry.href,
    truncated: next < queue.length,
    pages
  }

  log.info('crawl.finished', {
    url: entry.href,
    status: crawl.status,
    source: crawl.source,
    pages: pages.length,
    truncated: crawl.truncated,
    ms: Date.now() - startedAt
  })

  return crawl
}
