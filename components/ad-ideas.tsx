'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { useI18n } from '@/components/i18n-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AD_DESCRIPTION_MAX_CHARS, AD_HEADLINE_MAX_CHARS } from '@/lib/constants'
import { formatNumber } from '@/lib/i18n/format'
import type { AdIdeas as AdIdeasOutput } from '@/lib/ai/schema'
import type { Locale } from '@/lib/enums'

/**
 * Ad groups written off the terms counted in the table above this.
 *
 * **The terms are a measurement and everything here is generated, so the two are separated on
 * screen.** The table states what was counted; this states what somebody could write with it, and
 * nothing in it may carry a search volume, a cost, or a competition figure -- see
 * docs/invariants.md. The character counters are the one number that belongs here, and they are
 * arithmetic over text this code is holding: how much of Google's own ceiling each line uses.
 */
export function AdIdeas({
  analysisId,
  isOwner,
  ideas
}: {
  analysisId: string
  isOwner: boolean
  ideas: AdIdeasOutput | null
}) {
  const router = useRouter()
  const { dictionary, locale } = useI18n()
  const copy = dictionary.adIdeas
  const [written, setWritten] = useState(ideas)
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')

  async function write() {
    setState('loading')

    try {
      const res = await fetch(`/api/analyses/${analysisId}/ads`, { method: 'POST' })
      if (!res.ok) {
        setState('error')
        return
      }

      const body = (await res.json()) as { adIdeas: AdIdeasOutput }
      setWritten(body.adIdeas)
      setState('idle')
      router.refresh()
    } catch {
      setState('error')
    }
  }

  // Nothing written and nobody who can ask for it: a reader handed the link sees the measured terms
  // above and no affordance leading somewhere they cannot go.
  if (!written && !isOwner) return null

  return (
    <div className="space-y-4" data-testid="ad-ideas">
      <div className="space-y-1">
        <p className="panel-label text-[0.6rem] text-muted-foreground">{copy.eyebrow}</p>
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-bold tracking-tight">{copy.title}</h3>
          <span className="print:hidden">
            <InfoHint label={copy.hintLabel}>
              <RichText>{copy.hint}</RichText>
            </InfoHint>
          </span>
        </div>
      </div>

      {written ? (
        <div className="space-y-4">
          {written.groups.map((group) => (
            <Card key={group.theme} className="overflow-hidden break-inside-avoid">
              <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
                <p className="font-display text-sm font-semibold">{group.theme}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {group.terms.map((term) => (
                    <Badge key={term} className="bg-purple/10 text-purple">
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <Lines
                  label={copy.headlines}
                  lines={group.headlines}
                  ceiling={AD_HEADLINE_MAX_CHARS}
                  locale={locale}
                />
                <Lines
                  label={copy.descriptions}
                  lines={group.descriptions}
                  ceiling={AD_DESCRIPTION_MAX_CHARS}
                  locale={locale}
                />
              </div>
            </Card>
          ))}

          {written.negatives.length > 0 && (
            <div className="space-y-2 rounded-lg border border-dashed p-4">
              <p className="panel-label text-[0.6rem] text-muted-foreground">{copy.negatives}</p>
              <div className="flex flex-wrap gap-1.5">
                {written.negatives.map((negative) => (
                  <Badge key={negative} className="bg-muted text-muted-foreground">
                    {negative}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{copy.negativesHint}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-dashed p-4 print:hidden">
          <p className="text-sm text-muted-foreground">
            {state === 'error' ? copy.failed : copy.explain}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={write}
            disabled={state === 'loading'}
            aria-busy={state === 'loading'}
          >
            {state === 'loading' ? copy.loading : state === 'error' ? copy.retry : copy.cta}
          </Button>
        </div>
      )}
    </div>
  )
}

// The counter is what makes a headline usable rather than merely written: Google refuses a line over
// its ceiling at upload, so the reader needs to see how much room an edit has before they make one.
function Lines({
  label,
  lines,
  ceiling,
  locale
}: {
  label: string
  lines: string[]
  ceiling: number
  locale: Locale
}) {
  return (
    <div className="space-y-2">
      <p className="panel-label text-[0.6rem] text-muted-foreground">{label}</p>
      <ul className="space-y-1.5">
        {lines.map((line) => (
          <li key={line} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0">{line}</span>
            <span className="shrink-0 font-mono text-[0.7rem] tabular-nums text-muted-foreground">
              {formatNumber(line.length, locale)}/{formatNumber(ceiling, locale)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
