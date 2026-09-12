import {
  HTTP_STATUS,
  PAGESPEED_API_URL,
  PAGESPEED_RETRIES,
  PAGESPEED_STRATEGY,
  PAGESPEED_TIMEOUT_MS
} from '@/lib/constants'
import {
  PAGESPEED_CATEGORY,
  PAGESPEED_FIELD_CATEGORY,
  PAGESPEED_FIELD_METRIC,
  type Locale,
  type PageSpeedCategory,
  type PageSpeedFieldCategory,
  type PageSpeedFieldMetric,
  type PageSpeedFieldScope
} from '@/lib/enums'
import { log } from '@/lib/log'

export type PageSpeedAudit = {
  id: string
  category: PageSpeedCategory
  title: string
  displayValue: string | null
  score: number
}

export type PageSpeedFieldValue = { percentile: number; category: PageSpeedFieldCategory }

export type PageSpeed = {
  // 0 to 100, or null when Lighthouse could not score the category.
  categories: Record<PageSpeedCategory, number | null>
  field: {
    scope: PageSpeedFieldScope
    metrics: Partial<Record<PageSpeedFieldMetric, PageSpeedFieldValue>>
  } | null
  audits: PageSpeedAudit[]
}

// Audits that carry a pass or fail. `informative`, `manual` and `notApplicable` have no verdict to
// report, so they never reach the report or a prompt.
const SCORED_DISPLAY_MODES = ['numeric', 'binary', 'metricSavings']

type RawExperience = {
  metrics?: Record<string, { percentile?: number; category?: string }>
}

type RawResponse = {
  lighthouseResult?: {
    categories?: Record<string, { score?: number | null; auditRefs?: { id: string }[] }>
    audits?: Record<
      string,
      { id?: string; title?: string; score?: number | null; displayValue?: string; scoreDisplayMode?: string }
    >
  }
  loadingExperience?: RawExperience
  originLoadingExperience?: RawExperience
}

function fieldOf(experience: RawExperience | undefined): PageSpeed['field'] extends infer F
  ? F extends { metrics: infer M } ? M | null : never
  : never {
  const metrics: Partial<Record<PageSpeedFieldMetric, PageSpeedFieldValue>> = {}

  for (const metric of PAGESPEED_FIELD_METRIC) {
    const raw = experience?.metrics?.[metric]
    const category = PAGESPEED_FIELD_CATEGORY.find((value) => value === raw?.category)
    if (typeof raw?.percentile === 'number' && category) {
      metrics[metric] = { percentile: raw.percentile, category }
    }
  }

  return Object.keys(metrics).length > 0 ? metrics : null
}

/**
 * The parts of a PageSpeed Insights response the product uses. Pure, so it is tested against a stored
 * response rather than against Google.
 *
 * Field data prefers the URL's own and falls back to the origin's, and says which: a small page often
 * has too little traffic for its own. See docs/readout.md.
 */
export function parsePageSpeed(json: unknown): PageSpeed | null {
  const response = json as RawResponse
  const lighthouse = response?.lighthouseResult
  if (!lighthouse?.categories) return null

  const categories = Object.fromEntries(
    PAGESPEED_CATEGORY.map((category) => {
      const score = lighthouse.categories?.[category]?.score
      return [category, typeof score === 'number' ? Math.round(score * 100) : null]
    })
  ) as Record<PageSpeedCategory, number | null>

  const pageField = fieldOf(response.loadingExperience)
  const originField = pageField ? null : fieldOf(response.originLoadingExperience)
  const field = pageField
    ? { scope: 'page' as const, metrics: pageField }
    : originField
      ? { scope: 'origin' as const, metrics: originField }
      : null

  const audits: PageSpeedAudit[] = []
  const seen = new Set<string>()

  for (const category of PAGESPEED_CATEGORY) {
    for (const ref of lighthouse.categories[category]?.auditRefs ?? []) {
      const audit = lighthouse.audits?.[ref.id]
      if (!audit || seen.has(ref.id)) continue
      if (!SCORED_DISPLAY_MODES.includes(audit.scoreDisplayMode ?? '')) continue
      if (typeof audit.score !== 'number' || audit.score >= 1) continue

      seen.add(ref.id)
      audits.push({
        id: ref.id,
        category,
        title: audit.title ?? ref.id,
        displayValue: audit.displayValue ?? null,
        score: audit.score
      })
    }
  }

  return { categories, field, audits }
}

// The average of the categories Lighthouse scored. Null when it scored none.
export function pageSpeedScore(pagespeed: PageSpeed | null): number | null {
  if (!pagespeed) return null

  const scored = PAGESPEED_CATEGORY.map((category) => pagespeed.categories[category]).filter(
    (score): score is number => score !== null
  )

  if (scored.length === 0) return null
  return Math.round(scored.reduce((total, score) => total + score, 0) / scored.length)
}

/**
 * One PageSpeed Insights run, mobile, all four categories.
 *
 * **Fail-soft.** No key, a timeout or an error answer all resolve to null and log, and the analysis
 * continues without a PageSpeed section. A null is never shown as a zero. See docs/invariants.md.
 *
 * A 5xx is retried PAGESPEED_RETRIES times inside the same PAGESPEED_TIMEOUT_MS.
 *
 * It is Google's servers that load the page, not ours, so the URL guard that protects the browser
 * does not apply here; the URL has already been through `assertPublicUrl` at creation.
 */
export async function fetchPageSpeed(url: string, locale: Locale): Promise<PageSpeed | null> {
  const key = process.env.PAGESPEED_API_KEY
  if (!key) {
    log.warn('pagespeed.failed', { url, reason: 'no_key' })
    return null
  }

  const params = new URLSearchParams({ url, key, strategy: PAGESPEED_STRATEGY, locale })
  for (const category of PAGESPEED_CATEGORY) params.append('category', category)

  const signal = AbortSignal.timeout(PAGESPEED_TIMEOUT_MS)

  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(`${PAGESPEED_API_URL}?${params}`, { signal })

      if (response.status >= HTTP_STATUS.serverErrorMin && attempt < PAGESPEED_RETRIES) {
        await response.body?.cancel()
        log.warn('pagespeed.failed', { url, status: response.status, retrying: true })
        continue
      }

      if (!response.ok) {
        log.warn('pagespeed.failed', { url, status: response.status })
        return null
      }

      return parsePageSpeed(await response.json())
    } catch (error) {
      log.warn('pagespeed.failed', { url, error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }
}
