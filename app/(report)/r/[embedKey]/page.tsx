
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ReportCover } from '@/components/report-cover'
import { Wordmark } from '@/components/wordmark'
import { UnlockWall } from '@/components/unlock-wall'
import { HypothesisList } from '@/components/hypothesis-list'
import { FlowPlaybook } from '@/components/flow-playbook'
import { AnalysisTabs } from '@/components/analysis-tabs'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { CopyReportLink } from '@/components/copy-report-link'
import { Button } from '@/components/ui/button'
import { MeasuredReadout } from '@/components/measured-readout'
import { MeasurePage } from '@/components/measure-page'
import { getCurrentUser } from '@/lib/current-user'
import {
  competitorFor,
  loadReport,
  readoutFor,
  readoutHistory,
  splitFixes,
  splitVisibility
} from '@/lib/analyses'
import { EMPTY_HISTORY } from '@/lib/snapshots'
import { hasReadout, readout } from '@/lib/readout'
import { PLAYBOOK_EXPANDED_COUNT } from '@/lib/constants'
import type { FlowFix } from '@/db/schema'
import type { PlaybookSection } from '@/lib/enums'
import { dictionaryFor, getDictionary, getLocale, type Dictionary } from '@/lib/i18n'
import { formatDate, t as fill } from '@/lib/i18n/format'
import { displayHost } from '@/lib/host'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ embedKey: string }> }) {
  const { embedKey } = await params
  const { metadata } = await getDictionary()
  const analysis = await loadReport(embedKey)

  const vars = {
    host: analysis ? displayHost(analysis.url) : metadata.title,
    count: analysis?.hypotheses.length ?? 0
  }

  return pageMetadata({
    title: fill(metadata.pages.report.title, vars),
    description: fill(metadata.pages.report.description, vars),
    path: `/r/${embedKey}`,
    index: false,
    ownImage: true
  })
}

/**
 * The one analysis surface, keyed on the embed key and public.
 *
 * **`embedKey` is the only key that works for every row.** An analysis nobody has claimed has no
 * `user_id`, so it could never be addressed by owner -- which is why this used to be two routes,
 * `/analyses/[id]` for a row with an owner and this one for a row without. Two routes rendering the
 * same document is two copies that drift, and they did: the copy panel was written twice, the
 * `generated` predicate disagreed with itself, and the two disagreed on which cards start open.
 *
 * So there is one document and one axis through it. `isOwner` decides what the reader may *do* --
 * spend a browser slot, buy two more variants, copy the share link -- and decides nothing at all
 * about what the document *says*. See docs/report.md.
 */
export default async function ReportPage({
  params
}: {
  params: Promise<{ embedKey: string }>
}) {
  const { embedKey } = await params

  const locale = await getLocale()
  const t = dictionaryFor(locale)

  const analysis = await loadReport(embedKey)
  if (!analysis) notFound()

  const user = await getCurrentUser()
  const isOwner = user !== null && analysis.userId === user.id

  // Three shapes, and they are the free/paid cut made visible.
  //
  // 1. Nothing measured yet: the job is still on the queue. The form waits for this before it
  //    navigates, so a reader only lands here by opening the link early or reloading mid-run.
  // 2. Measured, nothing generated: nobody has spent a credit on it. Score and readout in full,
  //    then the wall.
  // 3. Generated: the whole document.
  //
  // The readout is never gated in any of them, for the reason in docs/readout.md.
  const measured = hasReadout(readout(readoutFor(analysis)))
  const generated = analysis.hypotheses.length > 0 || analysis.flowFixes.length > 0

  const fixes = splitFixes(analysis.flowFixes)
  const visibility = splitVisibility(analysis.flowFixes)
  const counts = {
    changes: analysis.hypotheses.length + analysis.flowFixes.length,
    ready: analysis.hypotheses.filter((hypothesis) => hypothesis.target === 'auto').length,
    structural: analysis.flowFixes.length
  }

  // The trend is two measurements of the same page subtracted, and re-measuring is what adds a
  // point to it. Both are the owner's: a prospect handed the link must not be able to spend the
  // owner's browser slots, so neither the button nor the history it feeds exists for them. Do not
  // "fix" the missing button here -- see docs/readout.md.
  const history = isOwner && measured ? await readoutHistory(analysis.id, analysis.market) : EMPTY_HISTORY

  function fixPanel(list: FlowFix[], section: PlaybookSection) {
    return <FlowPlaybook fixes={list} section={section} expandFrom={PLAYBOOK_EXPANDED_COUNT} />
  }

  if (!measured) {
    return isOwner ? (
      <div className="animate-fade-up space-y-6">
        <ReportHeader isOwner={isOwner} t={t} embedKey={analysis.embedKey} />
        <MeasurePage analysisId={analysis.id} />
      </div>
    ) : (
      <MeasuringNotice t={t} url={analysis.url} />
    )
  }

  return (
    <div className="animate-fade-up space-y-8">
      <ReportHeader isOwner={isOwner} t={t} embedKey={analysis.embedKey} />

      <ReportCover
        t={t}
        url={analysis.url}
        generated={formatDate(analysis.createdAt, locale)}
        counts={generated ? counts : null}
        hint={
          <InfoHint label={t.analysis.hintLabel}>
            <RichText>{t.analysis.hint}</RichText>
          </InfoHint>
        }
      />

      {/* Both cells count generated work, so on a measured-only report both would read 0 -- a page
          scored 47 sitting under "Changes recommended: 0". The strip is left out entirely rather
          than shown empty; the score and the readout below are the whole of what was measured. */}
      {generated && (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border">
          <SummaryCell label={t.report.changesFound} value={String(counts.changes)} />
          <SummaryCell label={t.report.copyWritten} value={String(counts.ready)} />
        </div>
      )}

      <div className="space-y-4">
        <MeasuredReadout
          input={readoutFor(analysis)}
          previous={history.previous}
          {...competitorFor(analysis)}
          scores={history.scores}
        />
        {isOwner && <MeasurePage analysisId={analysis.id} variant="again" />}
      </div>

      {generated ? (
        <AnalysisTabs
          counts={{
            flow: fixes.flow.length,
            copy: analysis.hypotheses.length,
            seo: visibility.seo.length,
            ai: visibility.ai.length
          }}
          panels={{
            flow: fixPanel(fixes.flow, 'flow'),
            seo: fixPanel(visibility.seo, 'seo'),
            ai: fixPanel(visibility.ai, 'ai'),
            copy: (
              <HypothesisList
                hypotheses={analysis.hypotheses}
                embedKey={analysis.embedKey}
                isOwner={isOwner}
              />
            )
          }}
        />
      ) : (
        <UnlockWall embedKey={embedKey} />
      )}

    </div>
  )
}

// A signed-in reader already has the wordmark in the navbar the layout renders, so printing it
// again here would be it twice. A signed-out one has no navbar at all, and the report has to say
// whose document it is.
//
// **Copying the link is the owner's one control here, and it is a button rather than a card.** It
// used to be a named "Interactive report" card with an `Open` button, which made sense while the
// owner read this document on a different route. There is nothing to open now -- the link points at
// the page it is sitting on -- so what is left is putting the URL on the clipboard.
function ReportHeader({
  isOwner,
  t,
  embedKey
}: {
  isOwner: boolean
  t: Dictionary
  embedKey: string
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
      {isOwner ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href="/dashboard">{t.analysis.backToDashboard}</Link>
          </Button>
          <CopyReportLink reportUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''} embedKey={embedKey} />
        </div>
      ) : (
        <Wordmark />
      )}
      <div className="text-right">
        <p className="panel-label text-[0.65rem] text-muted-foreground">{t.report.teardown}</p>
        <p className="font-display text-sm font-medium">{t.report.plan}</p>
      </div>
    </header>
  )
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-4">
      <p className="panel-label text-[0.6rem] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function MeasuringNotice({ t, url }: { t: Dictionary; url: string }) {
  return (
    <div className="space-y-4" data-testid="measuring">
      <p className="panel-label text-[0.7rem] text-muted-foreground">{t.report.teardown}</p>
      <h1 className="text-balance font-display text-2xl font-bold tracking-tight">
        {t.report.measuringHeading}
      </h1>
      <p className="break-all font-mono text-sm text-muted-foreground">{url}</p>
      <p className="max-w-xl text-sm text-muted-foreground">{t.report.measuringBody}</p>
      <div className="h-40 w-full animate-pulse rounded-md border bg-muted" aria-busy="true" />
    </div>
  )
}
