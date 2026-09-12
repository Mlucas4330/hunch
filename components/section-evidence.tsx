'use client'

import type { CSSProperties } from 'react'
import {
  Accessibility,
  Bot,
  Gauge,
  Globe,
  Link2,
  ListOrdered,
  Search,
  ShieldCheck,
  type LucideIcon
} from 'lucide-react'
import { DisclosureCard } from '@/components/disclosure-card'
import { SectionLink } from '@/components/section-link'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/components/i18n-provider'
import {
  CRAWL_CARD_URLS_MAX,
  DOMAIN_RANK_MAX,
  fixAnchor,
  RANKED_KEYWORDS_TABLE_MAX,
  READOUT_SEVERITY_CLASS
} from '@/lib/constants'
import type { SiteCrawl } from '@/lib/crawl'
import type { BacklinkSummary, RankedKeywords } from '@/lib/seranking'
import type { Market, PageSpeedCategory } from '@/lib/enums'
import { formatNumber, t } from '@/lib/i18n/format'
import type { PageSpeed } from '@/lib/pagespeed'
import { readoutUnit, readoutValue } from '@/lib/readout-format'
import type { Evidence, MeasuredFinding } from '@/lib/readout'
import { readoutScore, scoreSeverity } from '@/lib/score'
import { deltas } from '@/lib/snapshots'
import { cn } from '@/lib/utils'

// Beside the only thing that renders them: lib/constants.ts is imported by pure modules, and a React
// component there would drag lucide into them.
const CATEGORY_ICON: Record<PageSpeedCategory, LucideIcon> = {
  performance: Gauge,
  accessibility: Accessibility,
  'best-practices': ShieldCheck,
  seo: Search
}

type Fixes = Record<string, { id: string; title: string }[]>

type IndexCompetitor = {
  host: string
  backlinks: BacklinkSummary | null
  rankedKeywords: RankedKeywords | null
}

export type SeoIndexEvidence = {
  backlinks: BacklinkSummary | null
  rankedKeywords: RankedKeywords | null
  market: Market
  competitor: IndexCompetitor | null
}

/**
 * What was measured on one section's theme, above the errors written from it. See docs/readout.md.
 *
 * `previous` is this page's last measurement and renders as a signed delta; `competitor` is a
 * different page and renders as its own labelled value. They are separate props so the report can
 * never show one in the place of the other.
 */
export function SectionEvidence({
  evidence,
  pagespeed,
  previous = null,
  competitor = null,
  competitorHost = null,
  site = null,
  seoIndex = null,
  fixes
}: {
  evidence: Evidence
  pagespeed: PageSpeed | null
  previous?: PageSpeed | null
  competitor?: PageSpeed | null
  competitorHost?: string | null
  site?: { crawl: SiteCrawl; readable: boolean } | null
  seoIndex?: SeoIndexEvidence | null
  fixes: Fixes
}) {
  const moved = deltas(pagespeed, previous)

  return (
    <div className="grid gap-4">
      {pagespeed &&
        evidence.categories.map((category, index) => (
          <CategoryCard
            key={category}
            category={category}
            index={index}
            pagespeed={pagespeed}
            delta={moved.get(category)}
            competitorValue={competitor?.categories[category] ?? null}
            competitorHost={competitorHost}
            fixes={fixes}
          />
        ))}

      {evidence.crawler.length > 0 && (
        <CrawlerCard findings={evidence.crawler} fixes={fixes} index={evidence.categories.length} />
      )}

      {site && evidence.site.length > 0 && (
        <SiteCard
          findings={evidence.site}
          crawl={site.crawl}
          readable={site.readable}
          fixes={fixes}
          index={evidence.categories.length}
        />
      )}

      {seoIndex?.backlinks && evidence.searchIndex.length > 0 && (
        <BacklinksCard
          backlinks={seoIndex.backlinks}
          competitor={seoIndex.competitor}
          findings={evidence.searchIndex.filter((finding) => finding.id !== 'ranked_keywords')}
          fixes={fixes}
          index={evidence.categories.length + 1}
        />
      )}

      {seoIndex?.rankedKeywords && evidence.searchIndex.length > 0 && (
        <RankedKeywordsCard
          ranked={seoIndex.rankedKeywords}
          market={seoIndex.market}
          competitor={seoIndex.competitor}
          findings={evidence.searchIndex.filter((finding) => finding.id === 'ranked_keywords')}
          fixes={fixes}
          index={evidence.categories.length + 2}
        />
      )}
    </div>
  )
}

function BacklinksCard({
  backlinks,
  competitor,
  findings,
  fixes,
  index
}: {
  backlinks: BacklinkSummary
  competitor: IndexCompetitor | null
  findings: MeasuredFinding[]
  fixes: Fixes
  index: number
}) {
  const { dictionary, locale } = useI18n()
  const copy = dictionary.readout
  const theirs = competitor?.backlinks ?? null

  const show = (value: number | null, scale = false) =>
    value === null
      ? copy.index.noValue
      : scale
        ? t(copy.index.backlinks.rankValue, { value: formatNumber(value, locale), max: DOMAIN_RANK_MAX })
        : formatNumber(value, locale)

  const metrics: { key: string; label: string; value: number | null; theirs: number | null; scale?: boolean }[] = [
    {
      key: 'referring',
      label: copy.index.backlinks.referringDomains,
      value: backlinks.referringDomains,
      theirs: theirs?.referringDomains ?? null
    },
    {
      key: 'dofollow',
      label: copy.index.backlinks.dofollow,
      value: backlinks.dofollowReferringDomains,
      theirs: theirs?.dofollowReferringDomains ?? null
    },
    { key: 'backlinks', label: copy.index.backlinks.backlinks, value: backlinks.backlinks, theirs: theirs?.backlinks ?? null },
    { key: 'rank', label: copy.index.backlinks.rank, value: backlinks.rank, theirs: theirs?.rank ?? null, scale: true }
  ]

  return (
    <DisclosureCard
      title={copy.index.backlinks.title}
      defaultOpen={false}
      testId="backlinks"
      className="animate-stagger-in"
      style={{ '--index': index } as CSSProperties}
      badge={
        <>
          <Link2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="font-mono text-micro tabular-nums text-muted-foreground">
            {t(copy.index.backlinks.summary, { count: formatNumber(backlinks.referringDomains, locale) })}
          </span>
          {competitor && theirs && (
            <span className="truncate font-mono text-micro tabular-nums text-muted-foreground">
              {t(copy.index.competitor, { host: competitor.host, value: formatNumber(theirs.referringDomains, locale) })}
            </span>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.key} className="space-y-1 bg-card p-3">
              <dt className="panel-label text-nano text-muted-foreground">{metric.label}</dt>
              <dd className="font-display text-lg font-semibold tabular-nums">{show(metric.value, metric.scale)}</dd>
              {competitor && theirs && (
                <dd className="truncate font-mono text-micro tabular-nums text-muted-foreground">
                  {t(copy.index.competitor, { host: competitor.host, value: show(metric.theirs, metric.scale) })}
                </dd>
              )}
            </div>
          ))}
        </dl>

        {backlinks.topReferringDomains && backlinks.topReferringDomains.length > 0 && (
          <details className="text-micro">
            <summary className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground">
              {t(copy.index.backlinks.topDomains, {
                count: formatNumber(backlinks.topReferringDomains.length, locale)
              })}
            </summary>
            <ul className="mt-1.5 space-y-1 font-mono text-muted-foreground">
              {backlinks.topReferringDomains.map((domain) => (
                <li key={domain.domain} className="flex justify-between gap-3">
                  <span className="truncate">{domain.domain}</span>
                  {domain.rank !== null && <span className="shrink-0 tabular-nums">{show(domain.rank, true)}</span>}
                </li>
              ))}
            </ul>
          </details>
        )}

        {findings.map((finding) => (
          <FixPointer key={finding.id} id={finding.id} fixes={fixes} label={copy.fixLabel} />
        ))}
        <p className="text-micro leading-snug text-muted-foreground">{copy.index.source}</p>
      </div>
    </DisclosureCard>
  )
}

function RankedKeywordsCard({
  ranked,
  market,
  competitor,
  findings,
  fixes,
  index
}: {
  ranked: RankedKeywords
  market: Market
  competitor: IndexCompetitor | null
  findings: MeasuredFinding[]
  fixes: Fixes
  index: number
}) {
  const { dictionary, locale } = useI18n()
  const readout = dictionary.readout
  const copy = readout.index.keywords
  const marketName = dictionary.labels.market[market]
  const shown = ranked.keywords.slice(0, RANKED_KEYWORDS_TABLE_MAX)
  const theirs = competitor?.rankedKeywords ?? null
  const show = (value: number | null) => (value === null ? readout.index.noValue : formatNumber(value, locale))

  return (
    <DisclosureCard
      title={copy.title}
      defaultOpen={false}
      testId="ranked-keywords"
      className="animate-stagger-in"
      style={{ '--index': index } as CSSProperties}
      badge={
        <>
          <ListOrdered className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="font-mono text-micro tabular-nums text-muted-foreground">
            {t(copy.total, { count: show(ranked.total), market: marketName })}
          </span>
          {competitor && theirs && (
            <span className="truncate font-mono text-micro tabular-nums text-muted-foreground">
              {t(readout.index.competitor, { host: competitor.host, value: show(theirs.total) })}
            </span>
          )}
        </>
      }
    >
      <div className="space-y-3">
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(copy.empty, { market: marketName })}</p>
        ) : (
          <>
            <p className="text-xs leading-snug text-muted-foreground">
              {t(copy.shown, { count: formatNumber(shown.length, locale) })}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-sm border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3 font-display font-semibold">{copy.keyword}</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">{copy.position}</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">{copy.volume}</th>
                    <th className="py-2 pl-3 font-medium text-muted-foreground">{copy.page}</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((keyword) => (
                    <tr key={`${keyword.keyword}-${keyword.url}`} className="border-b last:border-0" data-testid="ranked-keyword">
                      <td className="py-2 pr-3">{keyword.keyword}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{show(keyword.position)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                        {show(keyword.searchVolume)}
                      </td>
                      <td
                        className="max-w-48 truncate py-2 pl-3 font-mono text-micro text-muted-foreground"
                        title={keyword.url ?? undefined}
                      >
                        {keyword.url ? pathOf(keyword.url) : readout.index.noValue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {findings.map((finding) => (
          <FixPointer key={finding.id} id={finding.id} fixes={fixes} label={readout.fixLabel} />
        ))}
        <p className="text-micro leading-snug text-muted-foreground">{readout.index.source}</p>
      </div>
    </DisclosureCard>
  )
}

function ScoreRail({ value, label }: { value: number; label: string }) {
  return (
    <span
      className={cn(
        'flex w-14 shrink-0 flex-col items-center justify-center border-r font-mono tabular-nums',
        READOUT_SEVERITY_CLASS[scoreSeverity(value)]
      )}
      aria-label={label}
    >
      <span className="text-xl font-semibold leading-none">{value}</span>
      <span className="text-micro leading-none opacity-70" aria-hidden>
        /100
      </span>
    </span>
  )
}

function FixPointer({ id, fixes, label }: { id: string; fixes: Fixes; label: string }) {
  const answering = fixes[id]
  if (!answering?.length) return null

  return (
    <p className="text-micro leading-snug text-purple" data-testid="finding-fix">
      {label}{' '}
      {answering.map((fix, index) => (
        <span key={fix.id}>
          {index > 0 && <span aria-hidden> / </span>}
          <SectionLink
            target={fixAnchor(fix.id)}
            className="underline decoration-purple/40 underline-offset-2 hover:decoration-purple"
          >
            {fix.title}
          </SectionLink>
        </span>
      ))}
    </p>
  )
}

function CategoryCard({
  category,
  index,
  pagespeed,
  delta,
  competitorValue,
  competitorHost,
  fixes
}: {
  category: PageSpeedCategory
  index: number
  pagespeed: PageSpeed
  delta: number | undefined
  competitorValue: number | null
  competitorHost: string | null
  fixes: Fixes
}) {
  const { dictionary } = useI18n()
  const copy = dictionary.readout
  const value = pagespeed.categories[category]
  const audits = pagespeed.audits.filter((audit) => audit.category === category)
  const Icon = CATEGORY_ICON[category]

  return (
    <DisclosureCard
      title={copy.categories[category]}
      defaultOpen={audits.length > 0}
      testId="pagespeed-category"
      className="animate-stagger-in"
      style={{ '--index': index } as CSSProperties}
      score={value === null ? undefined : <ScoreRail value={value} label={t(copy.score.railAria, { score: value })} />}
      badge={
        <>
          <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          {value !== null && (
            <Badge className={READOUT_SEVERITY_CLASS[scoreSeverity(value)]}>
              {copy.score.severity[scoreSeverity(value)]}
            </Badge>
          )}
          <span className="font-mono text-micro tabular-nums text-muted-foreground">
            {audits.length > 0 ? t(copy.auditsFailed, { count: audits.length }) : copy.auditsPassed}
          </span>
          {delta !== undefined && (
            <span className="font-mono text-micro tabular-nums text-muted-foreground">
              {t(delta > 0 ? copy.delta.up : copy.delta.down, { value: Math.abs(delta) })}
            </span>
          )}
          {competitorValue !== null && competitorHost && (
            <span className="truncate font-mono text-micro tabular-nums text-muted-foreground">
              {t(copy.score.competitor, { host: competitorHost, score: competitorValue })}
            </span>
          )}
        </>
      }
    >
      {audits.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.auditsPassed}</p>
      ) : (
        <div className="divide-y">
          {audits.map((audit) => (
            <div key={audit.id} className="space-y-1 py-2.5 first:pt-0 last:pb-0" data-testid="pagespeed-audit">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 text-sm leading-snug">{audit.title}</p>
                {audit.displayValue && (
                  <p className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {audit.displayValue}
                  </p>
                )}
              </div>
              <FixPointer id={audit.id} fixes={fixes} label={copy.fixLabel} />
            </div>
          ))}
        </div>
      )}
    </DisclosureCard>
  )
}

function pathOf(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return url
  }
}

function AffectedPages({ urls }: { urls: string[] }) {
  const { dictionary, locale } = useI18n()
  const copy = dictionary.readout.site
  const shown = urls.slice(0, CRAWL_CARD_URLS_MAX)

  return (
    <details className="text-micro">
      <summary className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground">
        {t(copy.urls, { count: formatNumber(urls.length, locale) })}
      </summary>
      <ul className="mt-1.5 space-y-1 font-mono text-muted-foreground">
        {shown.map((url) => (
          <li key={url} className="truncate" title={url}>
            {pathOf(url)}
          </li>
        ))}
        {urls.length > shown.length && (
          <li>{t(copy.morePages, { count: formatNumber(urls.length - shown.length, locale) })}</li>
        )}
      </ul>
    </details>
  )
}

function SiteCard({
  findings,
  crawl,
  readable,
  fixes,
  index
}: {
  findings: MeasuredFinding[]
  crawl: SiteCrawl
  readable: boolean
  fixes: Fixes
  index: number
}) {
  const { dictionary, locale } = useI18n()
  const copy = dictionary.readout
  const value = readoutScore(findings).groups.site
  const wrong = findings.filter((finding) => finding.severity !== 'ok').length

  return (
    <DisclosureCard
      title={copy.groups.site}
      defaultOpen={wrong > 0}
      testId="site-crawl"
      className="animate-stagger-in"
      style={{ '--index': index } as CSSProperties}
      score={value === null ? undefined : <ScoreRail value={value} label={t(copy.score.railAria, { score: value })} />}
      badge={
        <>
          <Globe className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="font-mono text-micro tabular-nums text-muted-foreground">
            {t(copy.site.pagesRead, { count: formatNumber(crawl.pages.length, locale) })}
          </span>
          <span className="font-mono text-micro tabular-nums text-muted-foreground">
            {wrong > 0
              ? t(copy.groupWrong, { wrong, total: findings.length })
              : t(copy.groupOk, { total: findings.length })}
          </span>
        </>
      }
    >
      <div className="space-y-3">
        <p className="max-w-prose text-xs leading-snug text-muted-foreground">
          {copy.site.source[crawl.source]}{' '}
          {crawl.truncated && `${t(copy.site.truncated, { count: formatNumber(crawl.pages.length, locale) })} `}
          {copy.site.noJavaScript}
        </p>
        {!readable && (
          <p className="max-w-prose text-xs leading-snug text-muted-foreground">{copy.site.contentSkipped}</p>
        )}

        <div className="divide-y">
          {findings.map((finding) => (
            <div key={finding.id} className="space-y-1.5 py-2.5 first:pt-0 last:pb-0" data-testid="site-finding">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 text-xs leading-snug text-muted-foreground">
                  {copy.findings[finding.id as keyof typeof copy.findings]}
                </p>
                <p
                  className={cn(
                    'inline-block shrink-0 rounded px-1.5 py-0.5 font-display text-base font-semibold tabular-nums',
                    READOUT_SEVERITY_CLASS[finding.severity]
                  )}
                >
                  {readoutValue(finding, copy, locale)}
                </p>
              </div>
              {finding.urls && finding.urls.length > 0 && <AffectedPages urls={finding.urls} />}
              <FixPointer id={finding.id} fixes={fixes} label={copy.fixLabel} />
            </div>
          ))}
        </div>
      </div>
    </DisclosureCard>
  )
}

function CrawlerCard({
  findings,
  fixes,
  index
}: {
  findings: MeasuredFinding[]
  fixes: Fixes
  index: number
}) {
  const { dictionary, locale } = useI18n()
  const copy = dictionary.readout
  const value = readoutScore(findings).groups.crawler_access
  const wrong = findings.filter((finding) => finding.severity !== 'ok').length

  return (
    <DisclosureCard
      title={copy.groups.crawler_access}
      defaultOpen={wrong > 0}
      testId="readout-group"
      className="animate-stagger-in"
      style={{ '--index': index } as CSSProperties}
      score={value === null ? undefined : <ScoreRail value={value} label={t(copy.score.railAria, { score: value })} />}
      badge={
        <>
          <Bot className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="font-mono text-micro tabular-nums text-muted-foreground">
            {wrong > 0
              ? t(copy.groupWrong, { wrong, total: findings.length })
              : t(copy.groupOk, { total: findings.length })}
          </span>
        </>
      }
    >
      <div className="divide-y">
        {findings.map((finding) => (
          <div key={finding.id} className="space-y-1 py-2.5 first:pt-0 last:pb-0" data-testid="readout-finding">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs leading-snug text-muted-foreground">
                  {copy.findings[finding.id as keyof typeof copy.findings]}
                </p>
                {finding.criterion && (
                  <p className="font-mono text-micro leading-snug text-muted-foreground/70">
                    {t(copy.criterion[finding.criterion.kind], {
                      value: readoutUnit(finding.criterion.threshold, finding.unit, copy, locale)
                    })}
                  </p>
                )}
              </div>
              <p
                className={cn(
                  'inline-block shrink-0 rounded px-1.5 py-0.5 font-display text-base font-semibold tabular-nums',
                  READOUT_SEVERITY_CLASS[finding.severity]
                )}
              >
                {readoutValue(finding, copy, locale)}
              </p>
            </div>
            <FixPointer id={finding.id} fixes={fixes} label={copy.fixLabel} />
          </div>
        ))}
      </div>
    </DisclosureCard>
  )
}
