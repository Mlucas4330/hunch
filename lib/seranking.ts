import {
  BACKLINK_REFERRING_DOMAINS_MAX,
  HTTP_STATUS,
  RANKED_KEYWORDS_MAX,
  RANKED_KEYWORDS_ORDER_FIELD,
  REFERRING_DOMAINS_ORDER,
  SE_RANKING_API_URL,
  SE_RANKING_BACKLINK_MODE,
  SE_RANKING_ENDPOINT,
  SE_RANKING_KEYWORD_TYPE,
  SE_RANKING_RETRIES,
  SE_RANKING_RETRY_DELAY_MS,
  SE_RANKING_SOURCE,
  SE_RANKING_TIMEOUT_MS,
  SE_RANKING_WITH_SUBDOMAINS,
  SORT_DESC
} from '@/lib/constants'
import type { Market } from '@/lib/enums'
import { displayHost } from '@/lib/host'
import { log } from '@/lib/log'

export type ReferringDomain = { domain: string; rank: number | null; backlinks: number | null }

export type BacklinkSummary = {
  // 0 to DOMAIN_RANK_MAX, SE Ranking's own domain authority.
  rank: number | null
  backlinks: number
  referringDomains: number
  dofollowReferringDomains: number | null
  // Null when the list call failed while the summary answered, which is not an empty list.
  topReferringDomains: ReferringDomain[] | null
}

export type RankedKeyword = {
  keyword: string
  position: number | null
  searchVolume: number | null
  url: string | null
  traffic: number | null
  difficulty: number | null
}

// `total` is every keyword the domain ranks for in the market, read from a separate overview call, and
// null when that call failed.
export type RankedKeywords = { total: number | null; keywords: RankedKeyword[] }

export type SeoIndex = { backlinks: BacklinkSummary | null; rankedKeywords: RankedKeywords | null }

type Json = Record<string, unknown>

const NOTHING: SeoIndex = { backlinks: null, rankedKeywords: null }

function asObject(value: unknown): Json | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : null
}

function numberOr(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function parseReferringDomains(json: unknown): ReferringDomain[] {
  return list(asObject(json)?.refdomains).flatMap((item) => {
    const row = asObject(item)
    if (typeof row?.refdomain !== 'string') return []
    return [{ domain: row.refdomain, rank: numberOr(row.domain_inlink_rank), backlinks: numberOr(row.backlinks) }]
  })
}

/**
 * A summary that answered with no row is a domain the index knows nothing about, so its counts are
 * zero. A call that failed is `null`, and is never shown as a zero. See docs/invariants.md.
 */
export function parseBacklinkSummary(summary: unknown, refdomains: unknown): BacklinkSummary | null {
  if (summary === null) return null
  const row = asObject(list(asObject(summary)?.summary)[0])

  return {
    rank: numberOr(row?.domain_inlink_rank),
    backlinks: numberOr(row?.backlinks) ?? 0,
    referringDomains: numberOr(row?.refdomains) ?? 0,
    dofollowReferringDomains: numberOr(row?.dofollow_refdomains),
    topReferringDomains: refdomains === null ? null : parseReferringDomains(refdomains)
  }
}

export function parseRankedKeywords(keywords: unknown, overview: unknown): RankedKeywords | null {
  if (keywords === null) return null

  const rows = list(keywords).flatMap((item): RankedKeyword[] => {
    const row = asObject(item)
    if (typeof row?.keyword !== 'string') return []

    return [
      {
        keyword: row.keyword,
        position: numberOr(row.position),
        searchVolume: numberOr(row.volume),
        url: typeof row.url === 'string' ? row.url : null,
        traffic: numberOr(row.traffic),
        difficulty: numberOr(row.difficulty)
      }
    ]
  })

  return { total: numberOr(asObject(asObject(overview)?.organic)?.keywords_count), keywords: rows }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// The parsed body, or null on anything that is not an answer. A 429 is retried SE_RANKING_RETRIES times.
async function request(path: string, params: Record<string, string>, authorization: string): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    let response: Response
    try {
      response = await fetch(`${SE_RANKING_API_URL}${path}?${new URLSearchParams(params)}`, {
        headers: { authorization },
        signal: AbortSignal.timeout(SE_RANKING_TIMEOUT_MS)
      })
    } catch (error) {
      log.warn('seranking.failed', { path, error: error instanceof Error ? error.message : String(error) })
      return null
    }

    if (response.status === HTTP_STATUS.tooManyRequests && attempt < SE_RANKING_RETRIES) {
      await response.body?.cancel()
      await sleep(SE_RANKING_RETRY_DELAY_MS)
      continue
    }

    if (!response.ok) {
      await response.body?.cancel()
      log.warn('seranking.failed', { path, status: response.status })
      return null
    }

    try {
      return await response.json()
    } catch {
      log.warn('seranking.failed', { path, reason: 'invalid_json' })
      return null
    }
  }
}

/**
 * What SE Ranking's index holds about a domain: its backlinks, and what it ranks for on Google in the
 * given market. Four calls, **one after another**, because a trial account is held to one request a
 * second. The list calls are skipped when the call they depend on failed.
 *
 * **Fail-soft, per half.** No key, a timeout or an error answer leave that half `null`, and the
 * analysis continues without its card.
 */
export async function fetchSeoIndex(url: string, market: Market): Promise<SeoIndex> {
  const key = process.env.SE_RANKING_API_KEY
  if (!key) {
    log.warn('seranking.failed', { url, reason: 'no_key' })
    return NOTHING
  }

  const authorization = `Token ${key}`
  const target = displayHost(url)
  const source = SE_RANKING_SOURCE[market]

  const summary = await request(
    SE_RANKING_ENDPOINT.backlinksSummary,
    { target, mode: SE_RANKING_BACKLINK_MODE },
    authorization
  )
  const refdomains =
    summary === null
      ? null
      : await request(
          SE_RANKING_ENDPOINT.referringDomains,
          {
            target,
            mode: SE_RANKING_BACKLINK_MODE,
            order_by: REFERRING_DOMAINS_ORDER,
            limit: String(BACKLINK_REFERRING_DOMAINS_MAX)
          },
          authorization
        )

  const keywords = await request(
    SE_RANKING_ENDPOINT.domainKeywords,
    {
      source,
      domain: target,
      type: SE_RANKING_KEYWORD_TYPE,
      limit: String(RANKED_KEYWORDS_MAX),
      order_field: RANKED_KEYWORDS_ORDER_FIELD,
      order_type: SORT_DESC
    },
    authorization
  )
  const overview =
    keywords === null
      ? null
      : await request(
          SE_RANKING_ENDPOINT.domainOverview,
          { source, domain: target, with_subdomains: SE_RANKING_WITH_SUBDOMAINS },
          authorization
        )

  return {
    backlinks: parseBacklinkSummary(summary, refdomains),
    rankedKeywords: parseRankedKeywords(keywords, overview)
  }
}
