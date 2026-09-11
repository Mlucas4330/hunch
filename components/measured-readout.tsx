'use client'

import { Activity } from 'lucide-react'
import { DisclosureCard } from '@/components/disclosure-card'
import { InfoHint } from '@/components/info-hint'
import { ReadoutScore } from '@/components/readout-score'
import { ReadoutTrend } from '@/components/readout-trend'
import { RichText } from '@/components/rich-text'
import { useI18n } from '@/components/i18n-provider'
import {
  PAGESPEED_CLS_SCALE,
  PAGESPEED_FIELD_SEVERITY,
  PAGESPEED_FIELD_UNIT_BY_METRIC,
  READOUT_SEVERITY_CLASS
} from '@/lib/constants'
import { PAGESPEED_FIELD_METRIC, type Locale, type PageSpeedFieldMetric } from '@/lib/enums'
import { formatDecimal, formatNumber, t } from '@/lib/i18n/format'
import { pageSpeedScore, type PageSpeed } from '@/lib/pagespeed'
import { readoutUnit, type ReadoutCopy } from '@/lib/readout-format'
import type { ScorePoint } from '@/lib/snapshots'
import { cn } from '@/lib/utils'

/**
 * The page's overall PageSpeed Insights score, its trend and the real-visitor data. Each Lighthouse
 * category renders inside the section of its theme, through `SectionEvidence`. See docs/readout.md.
 */
export function MeasuredReadout({
  pagespeed,
  competitor = null,
  competitorHost = null,
  scores = [],
  className
}: {
  pagespeed: PageSpeed | null
  competitor?: PageSpeed | null
  competitorHost?: string | null
  scores?: ScorePoint[]
  className?: string
}) {
  const { dictionary } = useI18n()
  const copy = dictionary.readout

  return (
    <section className={cn('space-y-4', className)} data-testid="measured-readout">
      <div className="space-y-1">
        <p className="panel-label text-micro text-muted-foreground">{copy.eyebrow}</p>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-bold tracking-tight">{copy.title}</h2>
          <span className="print:hidden">
            <InfoHint label={copy.hintLabel}>
              <RichText>{copy.hint}</RichText>
            </InfoHint>
          </span>
        </div>
      </div>

      {pagespeed ? (
        <ReadoutScore
          score={pageSpeedScore(pagespeed)}
          competitorScore={pageSpeedScore(competitor)}
          competitorHost={competitorHost}
        />
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          {copy.unavailable}
        </p>
      )}

      <ReadoutTrend points={scores} />

      {pagespeed?.field && <FieldCard field={pagespeed.field} />}
    </section>
  )
}

function FieldCard({ field }: { field: NonNullable<PageSpeed['field']> }) {
  const { dictionary, locale } = useI18n()
  const copy = dictionary.readout
  const metrics = PAGESPEED_FIELD_METRIC.filter((metric) => field.metrics[metric])
  const slow = metrics.some((metric) => field.metrics[metric]?.category !== 'FAST')

  return (
    <DisclosureCard
      title={copy.field.title}
      defaultOpen={slow}
      testId="pagespeed-field"
      badge={
        <>
          <Activity className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="font-mono text-micro text-muted-foreground">
            {copy.field.scope[field.scope]}
          </span>
        </>
      }
    >
      <div className="divide-y">
        {metrics.map((metric) => {
          const measured = field.metrics[metric]!
          const severity = PAGESPEED_FIELD_SEVERITY[measured.category]

          return (
            <div key={metric} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <p className="min-w-0 text-xs leading-snug text-muted-foreground">
                {copy.field.metrics[metric]}
              </p>
              <div className="flex shrink-0 items-baseline gap-2">
                <p
                  className={cn(
                    'inline-block rounded px-1.5 py-0.5 font-display text-base font-semibold tabular-nums',
                    READOUT_SEVERITY_CLASS[severity]
                  )}
                >
                  {fieldValue(metric, measured.percentile, copy, locale)}
                </p>
                <span className="font-mono text-micro text-muted-foreground">
                  {copy.field.category[measured.category]}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </DisclosureCard>
  )
}

function fieldValue(
  metric: PageSpeedFieldMetric,
  percentile: number,
  copy: ReadoutCopy,
  locale: Locale
): string {
  switch (PAGESPEED_FIELD_UNIT_BY_METRIC[metric]) {
    case 'seconds':
      return readoutUnit(percentile, 'seconds', copy, locale)
    case 'milliseconds':
      return t(copy.units.milliseconds, { value: formatNumber(percentile, locale) })
    default:
      return formatDecimal(percentile / PAGESPEED_CLS_SCALE, locale, 2)
  }
}
