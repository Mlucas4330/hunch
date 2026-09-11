'use client'

import type { CSSProperties } from 'react'
import { Accessibility, Bot, Gauge, Search, ShieldCheck, type LucideIcon } from 'lucide-react'
import { DisclosureCard } from '@/components/disclosure-card'
import { SectionLink } from '@/components/section-link'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/components/i18n-provider'
import { fixAnchor, READOUT_SEVERITY_CLASS } from '@/lib/constants'
import type { PageSpeedCategory } from '@/lib/enums'
import { t } from '@/lib/i18n/format'
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
  fixes
}: {
  evidence: Evidence
  pagespeed: PageSpeed | null
  previous?: PageSpeed | null
  competitor?: PageSpeed | null
  competitorHost?: string | null
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
    </div>
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
