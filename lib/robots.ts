import {
  AI_CRAWLER_AGENTS,
  ROBOTS_FETCH_TIMEOUT_MS,
  ROBOTS_MAX_BYTES,
  ROBOTS_MAX_REDIRECTS
} from '@/lib/constants'
import { assertPublicUrl } from '@/lib/url-guard'

export interface CrawlerAccess {
  status: 'found' | 'absent' | 'unknown'
  blockedAgents: string[]
  blocksAll: boolean
  sitemaps: string[]
}

const UNKNOWN: CrawlerAccess = {
  status: 'unknown',
  blockedAgents: [],
  blocksAll: false,
  sitemaps: []
}

export async function fetchCrawlerAccess(pageUrl: string): Promise<CrawlerAccess> {
  const text = await fetchRobotsText(pageUrl)
  if (text === null) return UNKNOWN
  if (text === '') return { status: 'absent', blockedAgents: [], blocksAll: false, sitemaps: [] }

  return parseRobots(text)
}

async function fetchRobotsText(pageUrl: string): Promise<string | null> {
  let target: string
  try {
    target = new URL('/robots.txt', pageUrl).href
  } catch {
    return null
  }

  for (let hop = 0; hop <= ROBOTS_MAX_REDIRECTS; hop++) {
    let response: Response
    try {
      const safe = await assertPublicUrl(target)
      response = await fetch(safe.href, {
        redirect: 'manual',
        signal: AbortSignal.timeout(ROBOTS_FETCH_TIMEOUT_MS),
        headers: { accept: 'text/plain' }
      })
    } catch {
      return null
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) return null
      try {
        target = new URL(location, target).href
      } catch {
        return null
      }
      continue
    }

    if (response.status === 404 || response.status === 410) return ''
    if (!response.ok) return null

    const body = await readCapped(response)
    if (body === null) return null
    if (/^\s*</.test(body)) return null
    return body
  }

  return null
}

async function readCapped(response: Response): Promise<string | null> {
  try {
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > ROBOTS_MAX_BYTES) return null
    return new TextDecoder().decode(buffer)
  } catch {
    return null
  }
}

function parseRobots(text: string): CrawlerAccess {
  const disallowedAll = new Set<string>()
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

    if (field === 'disallow' && value === '/') {
      group.forEach((agent) => disallowedAll.add(agent))
    }
  }

  return {
    status: 'found',
    blockedAgents: AI_CRAWLER_AGENTS.filter((agent) => disallowedAll.has(agent.toLowerCase())),
    blocksAll: disallowedAll.has('*'),
    sitemaps
  }
}
