import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ReportCover } from '@/components/report-cover'
import { ReportBrandMark } from '@/components/report-brand-mark'
import { GeneratingNotice, PendingList } from '@/components/generating-notice'
import { GenerationFailed } from '@/components/generation-failed'
import { HypothesisList } from '@/components/hypothesis-list'
import { FlowPlaybook } from '@/components/flow-playbook'
import { AnalysisSections } from '@/components/analysis-sections'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { CopyReportLink } from '@/components/copy-report-link'
import { Button } from '@/components/ui/button'
import { MeasuredReadout } from '@/components/measured-readout'
import { RunAgain, RunInProgress } from '@/components/run-again'
import { ReportRail } from '@/components/report-rail'
import { SectionEvidence } from '@/components/section-evidence'
import { StartHere } from '@/components/start-here'
import { brandFor, type ReportBrand } from '@/lib/brand'
import { getCurrentUser } from '@/lib/current-user'
import { analysisStateFor, lastFinishedAt, latestRun } from '@/lib/run-analysis'
import { quotaFor, quotaLeft } from '@/lib/quota'
import {
  competitorFor,
  fixesByFinding,
  loadReport,
  readoutFor,
  readoutHistory,
  splitFixes,
  splitVisibility
} from '@/lib/analyses'
import { hasEvidence, sectionEvidence, type Evidence } from '@/lib/readout'
import { EMPTY_HISTORY } from '@/lib/snapshots'
import { PLAYBOOK_EXPANDED_COUNT, SECTION_ANCHOR_CLASS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { FlowFix } from '@/db/schema'
import {
  ANALYSIS_TAB,
  REPORT_SECTION,
  type AnalysisTab,
  type PlaybookSection
} from '@/lib/enums'
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
    count: analysis ? analysis.hypotheses.length + analysis.flowFixes.length : 0
  }

  return pageMetadata({
    title: fill(metadata.pages.report.title, vars),
    description: fill(metadata.pages.report.description, vars),
    path: `/r/${embedKey}`,
    index: false,
    ownImage: true,
    brand: brandFor(analysis?.user ?? null)
  })
}

/**
 * The one analysis surface, keyed on the embed key and public, so an agency can hand the link to its
 * client. `isOwner` decides what the reader may *do* (run again, copy the link) and nothing about
 * what the document *says*. See docs/report.md.
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

  const brand = brandFor(analysis.user)

  const user = await getCurrentUser()
  const isOwner = user !== null && analysis.userId === user.id

  const measured = analysis.structure !== null
  const generated = analysis.hypotheses.length > 0 || analysis.flowFixes.length > 0

  const [run, finishedAt] = await Promise.all([latestRun(analysis.id), lastFinishedAt(analysis.id)])

  const state = await analysisStateFor({
    measured,
    generated,
    owned: analysis.userId !== null,
    run
  })

  const fixes = splitFixes(analysis.flowFixes)
  const visibility = splitVisibility(analysis.flowFixes)

  // Titles keyed by the audit or finding each error answers, so a measured number can link to the
  // card written about it.
  const fixTitles = Object.fromEntries(
    [...fixesByFinding(analysis.flowFixes)].map(([finding, list]) => [
      finding,
      list.map((fix) => ({ id: fix.id, title: fix.title }))
    ])
  )
  const counts = {
    changes: analysis.hypotheses.length + analysis.flowFixes.length,
    copy: analysis.hypotheses.length,
    structural: analysis.flowFixes.length
  }

  const sectionCounts: Record<AnalysisTab, number> = {
    ai: visibility.ai.length,
    seo: visibility.seo.length,
    flow: fixes.flow.length,
    copy: analysis.hypotheses.length
  }

  // The trend is the owner's record of the page, and a run spends the owner's quota, so neither exists
  // for a reader who was handed the link. See docs/readout.md.
  const history = isOwner && measured ? await readoutHistory(analysis.id) : EMPTY_HISTORY
  const hasHistory = history.scores.length > 1
  const blocked = isOwner && user ? quotaLeft(await quotaFor(user.id)) === 0 : false
  const lastRunFailed = isOwner && generated && run?.failedAt != null

  function fixPanel(list: FlowFix[], section: PlaybookSection) {
    return <FlowPlaybook fixes={list} section={section} expandFrom={PLAYBOOK_EXPANDED_COUNT} />
  }

  if (!measured) {
    return state === 'failed' ? (
      <div className="animate-fade-up space-y-6">
        <ReportHeader
          isOwner={isOwner}
          t={t}
          embedKey={analysis.embedKey}
          brand={brand}
        />
        <GenerationFailed measured={false} />
      </div>
    ) : (
      <MeasuringNotice t={t} url={analysis.url} />
    )
  }

  const crawler = readoutFor(analysis)
  const competitor = competitorFor(analysis)

  const evidenceByTab = Object.fromEntries(
    ANALYSIS_TAB.map((tab) => [tab, sectionEvidence(tab, analysis.pagespeed, crawler)])
  ) as Record<AnalysisTab, Evidence>

  const sections = ANALYSIS_TAB.filter(
    (tab) =>
      state === 'generating' ||
      (generated && sectionCounts[tab] > 0) ||
      hasEvidence(evidenceByTab[tab])
  )

  const evidence = Object.fromEntries(
    ANALYSIS_TAB.map((tab) => [
      tab,
      hasEvidence(evidenceByTab[tab]) ? (
        <SectionEvidence
          evidence={evidenceByTab[tab]}
          pagespeed={analysis.pagespeed}
          previous={history.previous}
          {...competitor}
          fixes={fixTitles}
        />
      ) : null
    ])
  ) as Record<AnalysisTab, ReactNode>

  const lists: Record<AnalysisTab, ReactNode> = {
    ai: fixPanel(visibility.ai, 'ai'),
    seo: fixPanel(visibility.seo, 'seo'),
    flow: fixPanel(fixes.flow, 'flow'),
    copy: <HypothesisList hypotheses={analysis.hypotheses} />
  }

  const panels = Object.fromEntries(
    ANALYSIS_TAB.map((tab) => [
      tab,
      state === 'generating' ? <PendingList /> : generated ? lists[tab] : null
    ])
  ) as Record<AnalysisTab, ReactNode>

  // What the rail may offer, decided by the same conditions that render each block below.
  const railSections = REPORT_SECTION.filter((section) => {
    if (section === 'start') return generated && analysis.flowFixes.length > 0
    if (section === 'readout') return true
    return sections.includes(section)
  })

  const runControl = !isOwner ? null : state === 'rerunning' ? (
    <RunInProgress embedKey={embedKey} />
  ) : (
    <RunAgain analysisId={analysis.id} blocked={blocked} />
  )

  return (
    <div className="animate-fade-up space-y-8">
      <ReportHeader
        isOwner={isOwner}
        t={t}
        embedKey={analysis.embedKey}
        brand={brand}
        runControl={runControl}
      />

      <ReportCover
        t={t}
        url={analysis.url}
        generated={formatDate(finishedAt ?? analysis.createdAt, locale)}
        counts={generated ? counts : null}
        hint={
          <InfoHint label={t.analysis.hintLabel}>
            <RichText>{t.analysis.hint}</RichText>
          </InfoHint>
        }
      />

      {lastRunFailed && (
        <p className="text-sm text-coral print:hidden" data-testid="last-run-failed">
          {t.readout.run.lastRunFailed}
        </p>
      )}

      {generated && (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border">
          <SummaryCell label={t.report.changesFound} value={String(counts.changes)} />
          <SummaryCell label={t.report.copyErrors} value={String(counts.copy)} />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <ReportRail sections={railSections} />

        <div className="min-w-0 space-y-8">
          {generated && <StartHere fixes={analysis.flowFixes} />}

          <div id="readout" className={cn(SECTION_ANCHOR_CLASS, 'space-y-4')}>
            <MeasuredReadout pagespeed={analysis.pagespeed} {...competitor} scores={history.scores} />
            {isOwner && !hasHistory && state === 'ready' && (
              <RunAgain analysisId={analysis.id} variant="trend_start" blocked={blocked} />
            )}
          </div>

          {state === 'generating' && <GeneratingNotice embedKey={embedKey} />}
          {!generated && state === 'failed' && <GenerationFailed />}

          <AnalysisSections
            sections={sections}
            counts={generated ? sectionCounts : null}
            evidence={evidence}
            panels={panels}
          />
        </div>
      </div>
    </div>
  )
}

// A signed-in reader already has the navbar the layout renders; a signed-out one has no navbar at all,
// and the report has to say whose document it is: the agency's, when it set a brand.
function ReportHeader({
  isOwner,
  t,
  embedKey,
  brand,
  runControl = null
}: {
  isOwner: boolean
  t: Dictionary
  embedKey: string
  brand: ReportBrand
  runControl?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
      {isOwner ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href="/dashboard">{t.analysis.backToDashboard}</Link>
          </Button>
          <CopyReportLink reportUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''} embedKey={embedKey} />
          {runControl}
        </div>
      ) : (
        <ReportBrandMark brand={brand} />
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
