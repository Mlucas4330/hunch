
import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ReportCover } from '@/components/report-cover'
import { Wordmark } from '@/components/wordmark'
import { UnlockWall } from '@/components/unlock-wall'
import { GeneratingSections } from '@/components/generating-sections'
import { GenerationFailed } from '@/components/generation-failed'
import { WatchPageForm } from '@/components/watch-page-form'
import { HypothesisList } from '@/components/hypothesis-list'
import { FlowPlaybook } from '@/components/flow-playbook'
import { AnalysisSections } from '@/components/analysis-sections'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { CopyReportLink } from '@/components/copy-report-link'
import { Button } from '@/components/ui/button'
import { MeasuredReadout } from '@/components/measured-readout'
import { MeasurePage } from '@/components/measure-page'
import { PageTerms } from '@/components/page-terms'
import { ReportRail } from '@/components/report-rail'
import { StartHere } from '@/components/start-here'
import { getCurrentUser } from '@/lib/current-user'
import { analysisStateFor } from '@/lib/run-analysis'
import {
  competitorFor,
  fixesByFinding,
  loadReport,
  readoutFor,
  readoutHistory,
  splitFixes,
  splitVisibility
} from '@/lib/analyses'
import { EMPTY_HISTORY } from '@/lib/snapshots'
import { hasReadout, readout } from '@/lib/readout'
import { PLAYBOOK_EXPANDED_COUNT, SECTION_ANCHOR_CLASS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { FlowFix } from '@/db/schema'
import { REPORT_SECTION, type PlaybookSection } from '@/lib/enums'
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

  // Five shapes, and they are the free/paid cut made visible.
  //
  // - `measuring`: the job is still on the queue. The form waits for the readout before it navigates,
  //   so a reader only lands here by opening the link early or reloading mid-run.
  // - `locked`: nobody has spent a credit on it. Score and readout in full, then the wall.
  // - `generating`: where a paying reader now lands, about twenty seconds in. Score and readout in
  //   full, then the four sections as placeholders that fill themselves. See lib/run-analysis.ts for
  //   why the readout is committed before the generation starts.
  // - `failed`: the generation threw and the credit went back. **Never the wall**, which would ask
  //   somebody to buy a credit they have just had returned.
  // - `ready`: the whole document.
  //
  // **Three of those are the same row in Postgres**, which is why the decision does not live here.
  // `analysisStateFor` asks the job whether work is happening and the ledger whether it already
  // failed, in an order that lib/analysis-state.ts explains. The client polls the same helper through
  // `GET /api/analyses`, so the screen and the poll cannot come to different conclusions.
  //
  // The readout is never gated in any of them, for the reason in docs/readout.md.
  const measured = hasReadout(readout(readoutFor(analysis)))
  const generated = analysis.hypotheses.length > 0 || analysis.flowFixes.length > 0
  const state = await analysisStateFor({
    id: analysis.id,
    measured,
    generated,
    owned: analysis.userId !== null
  })

  const fixes = splitFixes(analysis.flowFixes)
  const visibility = splitVisibility(analysis.flowFixes)

  // Titles only, keyed by the finding each one answers, so a measured number can point at what was
  // written for it. Empty on every analysis with nothing generated, which is what keeps the readout
  // free of an affordance that would read as a paywall tease -- see docs/invariants.md.
  // Id as well as title now, so the pointer under a measured number is a link to the card that
  // answers it rather than a repetition of its name.
  const fixTitles = Object.fromEntries(
    [...fixesByFinding(analysis.flowFixes)].map(([finding, list]) => [
      finding,
      list.map((fix) => ({ id: fix.id, title: fix.title }))
    ])
  )
  const counts = {
    changes: analysis.hypotheses.length + analysis.flowFixes.length,
    ready: analysis.hypotheses.filter((hypothesis) => hypothesis.target === 'auto').length,
    structural: analysis.flowFixes.length
  }

  // One object, read by `AnalysisSections` to decide which panels exist and by the rail to decide
  // which entries it may offer. Two counts of the same four lists would be two answers to the same
  // question the first time one of them was touched.
  const sectionCounts = {
    flow: fixes.flow.length,
    copy: analysis.hypotheses.length,
    seo: visibility.seo.length,
    ai: visibility.ai.length
  }

  // The trend is two measurements of the same page subtracted, and re-measuring is what adds a
  // point to it. Both are the owner's: a prospect handed the link must not be able to spend the
  // owner's browser slots, so neither the button nor the history it feeds exists for them. Do not
  // "fix" the missing button here -- see docs/readout.md.
  const history = isOwner && measured ? await readoutHistory(analysis.id, analysis.market) : EMPTY_HISTORY
  const hasHistory = history.scores.length > 1

  function fixPanel(list: FlowFix[], section: PlaybookSection) {
    return (
      <FlowPlaybook
        fixes={list}
        section={section}
        expandFrom={PLAYBOOK_EXPANDED_COUNT}
        isOwner={isOwner}
      />
    )
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

  // What the rail may offer, decided by the same conditions that render each block below and in the
  // order REPORT_SECTION declares. Never the whole enum: a rail entry for a section this report does
  // not have is a link to nothing. See components/report-rail.tsx.
  const railSections = REPORT_SECTION.filter((section) => {
    if (section === 'start') return generated && analysis.flowFixes.length > 0
    if (section === 'readout') return true
    if (section === 'terms') return Boolean(analysis.keywords?.terms.length)
    return generated && sectionCounts[section] > 0
  })

  return (
    <div className="animate-fade-up space-y-8">
      <ReportHeader
        isOwner={isOwner}
        t={t}
        embedKey={analysis.embedKey}
        remeasure={isOwner ? <MeasurePage analysisId={analysis.id} variant="again" /> : null}
      />

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

      {/* **The rail is a sibling of the document, not a wrapper around it.** Everything below keeps
          the vertical rhythm it had; the rail takes a fixed column beside it above `lg` and does not
          exist below that. `min-w-0` on the content column is load-bearing rather than defensive: the
          keyword table and the `break-all` URLs will push a grid track past the viewport otherwise,
          which is the failure docs/components.md describes. */}
      <div className="grid gap-8 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <ReportRail sections={railSections} />

        <div className="min-w-0 space-y-8">
          {generated && <StartHere fixes={analysis.flowFixes} />}

          <div id="readout" className={cn(SECTION_ANCHOR_CLASS, 'space-y-4')}>
            <MeasuredReadout
              input={readoutFor(analysis)}
              previous={history.previous}
              {...competitorFor(analysis)}
              scores={history.scores}
              fixes={fixTitles}
            />
            {/* The button itself is in the header now, where the owner reaches it without scrolling
                the whole document first. What is left here is the panel for the owner who has never
                pressed it: below two snapshots there is no sparkline and no delta anywhere, so the
                history is built and invisible unless something names it. See docs/readout.md. */}
            {isOwner && !hasHistory && (
              <MeasurePage analysisId={analysis.id} variant="trend_start" />
            )}
          </div>

          {/* Below the readout, never above it, and never in front of it: the numbers are not behind
              this and must not become so -- see docs/invariants.md. Offered only to a reader who is
              not the owner, because an owner reaches this report from their dashboard and already
              has a durable way back to it. For an anonymous reader the link lives in one browser's
              localStorage and nowhere else, which is what makes the offer worth taking. */}
          {!isOwner && <WatchPageForm embedKey={embedKey} />}

          {generated ? (
            <AnalysisSections
              counts={sectionCounts}
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
          ) : state === 'generating' ? (
            <GeneratingSections embedKey={embedKey} />
          ) : state === 'failed' ? (
            <GenerationFailed />
          ) : (
            <UnlockWall embedKey={embedKey} />
          )}

          {/* **Last in the document, below the tabs, and below the wall on a report with nothing
              generated.** The terms are a measurement, so they are free like the rest of the readout
              and sitting under the wall does not gate them -- it shows a reader who has not paid
              that the counted half keeps going. What the owner can do here is ask for the ad groups;
              everyone else reads the table. See docs/readout.md. */}
          <PageTerms
            keywords={analysis.keywords}
            analysisId={analysis.id}
            isOwner={isOwner}
            adIdeas={analysis.adIdeas}
          />
        </div>
      </div>
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
//
// `remeasure` is the second one, passed in rather than built here because the unmeasured branch has
// nothing to measure again: that reader gets the whole `MeasurePage` section below the header, and a
// button offering the same thing above it would be the same action twice.
function ReportHeader({
  isOwner,
  t,
  embedKey,
  remeasure = null
}: {
  isOwner: boolean
  t: Dictionary
  embedKey: string
  remeasure?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
      {isOwner ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href="/dashboard">{t.analysis.backToDashboard}</Link>
          </Button>
          <CopyReportLink reportUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''} embedKey={embedKey} />
          {remeasure}
        </div>
      ) : (
        <Wordmark />
      )}
      <div className="text-right">
        <p className="panel-label text-micro text-muted-foreground">{t.report.teardown}</p>
        <p className="font-display text-sm font-medium">{t.report.plan}</p>
      </div>
    </header>
  )
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-4">
      <p className="panel-label text-nano text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function MeasuringNotice({ t, url }: { t: Dictionary; url: string }) {
  return (
    <div className="space-y-4" data-testid="measuring">
      <p className="panel-label text-micro text-muted-foreground">{t.report.teardown}</p>
      <h1 className="text-balance font-display text-2xl font-bold tracking-tight">
        {t.report.measuringHeading}
      </h1>
      <p className="break-all font-mono text-sm text-muted-foreground">{url}</p>
      <p className="max-w-xl text-sm text-muted-foreground">{t.report.measuringBody}</p>
      <div className="h-40 w-full animate-pulse rounded-md border bg-muted" aria-busy="true" />
    </div>
  )
}
