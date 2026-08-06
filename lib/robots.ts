import {
  AI_CRAWLER_AGENTS,
  ROBOTS_FETCH_TIMEOUT_MS,
  ROBOTS_MAX_BYTES,
  ROBOTS_MAX_REDIRECTS
} from '@/lib/constants'
import { assertPublicUrl } from '@/lib/url-guard'

export interface CrawlerAccess {
  // Three states, not two. `unknown` is a network failure, a timeout, or a response we could not
  // read, and it must never be presented as a block or as an absence: "we could not check" and "they
  // block AI crawlers" are opposite findings, and only one of them is a reason to change anything.
  status: 'found' | 'absent' | 'unknown'
  // Which of AI_CRAWLER_AGENTS are disallowed from the whole site. The literal, verifiable answer to
  // "can an AI find my product".
  blockedAgents: string[]
  // `User-agent: *` with `Disallow: /`. Blocks search engines too, so it is a different order of
  // problem from an AI-specific block.
  blocksAll: boolean
  sitemaps: string[]
}

const UNKNOWN: CrawlerAccess = {
  status: 'unknown',
  blockedAgents: [],
  blocksAll: false,
  sitemaps: []
}

// Reads the analyzed site's robots.txt. Fail-soft by construction: every failure path resolves to
// `unknown` rather than rejecting, because a site without a reachable robots.txt is a site whose
// analysis should still be delivered.
//
// Runs alongside competitor research rather than before it, and uses fetch rather than a browser, so
// it costs no slot in the scrape pool and adds nothing to the critical path.
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

  // Redirects are followed by hand so every hop is re-validated. `redirect: 'follow'` would let a
  // 302 walk the fetch to a private address the pre-flight check never saw -- the same hole
  // openGuardedPage's request interception closes for the scrape. Refusing redirects outright would
  // be safe too, but it would answer `unknown` for every site whose apex redirects to www.
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

    // A 404 is a real answer: the site has no robots.txt, so nothing is disallowed.
    if (response.status === 404 || response.status === 410) return ''
    if (!response.ok) return null

    const body = await readCapped(response)
    if (body === null) return null
    // Some hosts answer 200 with an HTML error page. That is not a robots.txt, and reading it as one
    // would report "absent" for a site we simply failed to check.
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

// A deliberately small robots.txt reader: it answers "is this agent disallowed from the entire site",
// not "is this URL crawlable". Per-path rules are out of scope -- the finding we report is a total
// block, and anything narrower than that is not something a landing page audit should editorialize on.
function parseRobots(text: string): CrawlerAccess {
  const disallowedAll = new Set<string>()
  const sitemaps: string[] = []

  // A group is one or more consecutive User-agent lines followed by their rules. Tracking the group
  // rather than the last-seen agent is what makes stacked user-agent lines work, which is exactly how
  // most sites list several AI crawlers under one Disallow.
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

    // `Disallow: /` is a total block. `Allow` lines are not merged in: a group that disallows the
    // root and then allows a path is still blocking the landing page unless that path is the root,
    // and reporting a nuance the audit cannot act on would only weaken a finding that is otherwise
    // unambiguous.
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
