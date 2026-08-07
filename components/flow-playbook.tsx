'use client'

import { DisclosureCard } from '@/components/disclosure-card'
import { FlowCategoryBadge } from '@/components/flow-category-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { WhyBlock } from '@/components/why-block'
import { useI18n } from '@/components/i18n-provider'
import type { FlowFix } from '@/db/schema'
import type { PlaybookSection } from '@/lib/enums'
import { cn } from '@/lib/utils'

// Every ranked list of fixes, rendered by one component because they are one shape: the flow
// playbook (structural conversion fixes) and the visibility audit (what a crawler and a model can
// reach, read, and cite). `section` selects the copy and the test id, and nothing else -- there is
// no branch on it below the heading, which is the point.
//
// `visibility` is the audit as one combined section, which the print report still renders; `seo` and
// `ai` are the two slices of those same rows that the tabbed surfaces render instead.
//
// There is no "Set up test" action in any of them by design: these change the page itself rather
// than one line of text, so the embed snippet has nothing to swap and there is nothing to A/B.
//
// `expandFrom` is the index past which fixes start closed. Omitting it opens everything, which is
// what the print report needs -- nothing may be hidden on paper. Every row can be closed either way.
export function FlowPlaybook({
  fixes,
  section = 'flow',
  expandFrom,
  className
}: {
  fixes: FlowFix[]
  section?: PlaybookSection
  expandFrom?: number
  className?: string
}) {
  const { dictionary } = useI18n()
  const copy = dictionary[section]

  if (fixes.length === 0) return null

  const ordered = [...fixes].sort((a, b) => a.position - b.position)

  return (
    <section className={cn('space-y-3', className)} data-testid={`${section}-playbook`}>
      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{copy.eyebrow}</p>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-bold tracking-tight">{copy.title}</h2>
          <span className="print:hidden">
            <InfoHint label={copy.hintLabel}>
              <RichText>{copy.hint}</RichText>
            </InfoHint>
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {ordered.map((fix, index) => (
          <DisclosureCard
            key={fix.id}
            rank={index + 1}
            title={fix.title}
            testId={`${section}-fix`}
            defaultOpen={expandFrom === undefined || index < expandFrom}
            badge={<FlowCategoryBadge category={fix.category} />}
            scores={
              <>
                <ScoreIndicator score={fix.impactScore} kind="impact" variant="compact" />
                <ScoreIndicator score={fix.effortScore} kind="effort" variant="compact" />
              </>
            }
            openScores={
              <>
                <ScoreIndicator score={fix.impactScore} kind="impact" />
                <ScoreIndicator score={fix.effortScore} kind="effort" />
              </>
            }
          >
            <FlowFixBody fix={fix} section={section} />
          </DisclosureCard>
        ))}
      </div>
    </section>
  )
}

function FlowFixBody({ fix, section }: { fix: FlowFix; section: PlaybookSection }) {
  const { dictionary } = useI18n()
  const copy = dictionary[section]

  return (
    <>
      <p className="text-sm text-muted-foreground">{fix.problem}</p>

      {/* The reasoning comes before the steps, not after them. Below the steps panel it was the last
          thing on the card and read as a footnote -- readers reported never noticing it existed. */}
      {fix.evidence && <WhyBlock label={copy.evidenceLabel}>{fix.evidence}</WhyBlock>}

      <div className="space-y-2 rounded-md bg-muted p-3">
        <p className="panel-label text-[0.6rem] text-muted-foreground">{copy.stepsLabel}</p>
        <ol className="space-y-2">
          {fix.steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm">
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </>
  )
}
