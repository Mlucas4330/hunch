import {
  AI_CRAWLER_AGENTS,
  HTTP_STATUS,
  ROBOTS_ACCEPT,
  ROBOTS_ALL_AGENTS,
  ROBOTS_FETCH_TIMEOUT_MS,
  ROBOTS_MAX_BYTES,
  ROBOTS_MAX_REDIRECTS
} from '@/lib/constants'
import { guardedFetch } from '@/lib/guarded-fetch'

export interface CrawlerAccess {
  status: 'found' | 'absent' | 'unknown'
  blockedAgents: string[]
  blocksAll: boolean
  sitemaps: string[]
  // The `Disallow` paths of the `*` group, which the site crawl will not open. Absent on rows measured
  // before the crawl existed.
  disallowed?: string[]
}

const UNKNOWN: CrawlerAccess = {
  status: 'unknown',
  blockedAgents: [],
  blocksAll: false,
  sitemaps: [],
  disallowed: []
}

export async function fetchCrawlerAccess(pageUrl: string): Promise<CrawlerAccess> {
  const text = await fetchRobotsText(pageUrl)
  if (text === null) return UNKNOWN
  if (text === '') {
    return { status: 'absent', blockedAgents: [], blocksAll: false, sitemaps: [], disallowed: [] }
  }

  return parseRobots(text)
}

async function fetchRobotsText(pageUrl: string): Promise<string | null> {
  let target: string
  try {
    target = new URL('/robots.txt', pageUrl).href
  } catch {
    return null
  }

  const response = await guardedFetch(target, {
    timeoutMs: ROBOTS_FETCH_TIMEOUT_MS,
    maxBytes: ROBOTS_MAX_BYTES,
    maxRedirects: ROBOTS_MAX_REDIRECTS,
    headers: { accept: ROBOTS_ACCEPT }
  })

  if (!response) return null
  if ((HTTP_STATUS.missing as readonly number[]).includes(response.status)) return ''
  if (response.body === null) return null
  if (/^\s*</.test(response.body)) return null
  return response.body
}

export function parseRobots(text: string): CrawlerAccess {
  const disallowedAll = new Set<string>()
  const disallowed: string[] = []
  const sitemaps: string[] = []

  let group: string[] = []
  let readingAgents = false

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim()
    if (line.length === 0) continue

    const separator = line.indexOf(':')
    if (separator === -1) continue

    const field = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()

    if (field === 'sitemap') {
      if (value.length > 0) sitemaps.push(value)
      continue
    }

    if (field === 'user-agent') {
      if (!readingAgents) {
        group = []
        readingAgents = true
      }
      group.push(value.toLowerCase())
      continue
    }

    readingAgents = false

    if (field !== 'disallow') continue

    if (value === '/') group.forEach((agent) => disallowedAll.add(agent))
    if (value.length > 0 && group.includes(ROBOTS_ALL_AGENTS)) disallowed.push(value)
  }

  return {
    status: 'found',
    blockedAgents: AI_CRAWLER_AGENTS.filter((agent) => disallowedAll.has(agent.toLowerCase())),
    blocksAll: disallowedAll.has(ROBOTS_ALL_AGENTS),
    sitemaps,
    disallowed
  }
}

/**
 * Whether a path falls under one of the `Disallow` rules, with the two wildcards robots.txt allows:
 * `*` for any run of characters and a trailing `$` for the end of the path. `Allow` is not read, so
 * this errs towards opening fewer pages, never more.
 */
export function isDisallowed(path: string, rules: string[]): boolean {
  return rules.some((rule) => {
    const anchored = rule.endsWith('$')
    const body = (anchored ? rule.slice(0, -1) : rule)
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')

    return new RegExp(`^${body}${anchored ? '$' : ''}`).test(path)
  })
}
