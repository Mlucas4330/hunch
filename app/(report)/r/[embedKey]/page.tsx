import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { Wordmark } from '@/components/wordmark'
import { SectionBadge } from '@/components/section-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { VariantPreview } from '@/components/variant-preview'
import { WaitlistWall } from '@/components/waitlist-wall'
import { hasPlaceholders } from '@/lib/utils'
import { REPORT_PREVIEW_LIMIT } from '@/lib/constants'

export default async function PublicReportPage({
  params
}: {
  params: Promise<{ embedKey: string }>
}) {
  const { embedKey } = await params

  const analysis = await db.query.analyses.findFirst({
    where: eq(analyses.embedKey, embedKey),
    with: { hypotheses: { with: { variants: { orderBy: (v, { asc }) => asc(v.position) } } } }
  })

  if (!analysis) notFound()

  const ranked = [...analysis.hypotheses].sort((a, b) => b.impactScore - a.impactScore)
  // Fill the preview slots with auto-applicable ideas first (they get a real in-context screenshot),
  // then the rest by impact -- so prospects see genuine previews up top, not manual fallbacks.
  const previewOrder = [
    ...ranked.filter((h) => h.target === 'auto'),
    ...ranked.filter((h) => h.target !== 'auto')
  ]
  const visible = previewOrder.slice(0, REPORT_PREVIEW_LIMIT)
  const hidden = previewOrder.slice(REPORT_PREVIEW_LIMIT)
  const topImpact = ranked[0]?.impactScore ?? 0

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4 border-b pb-4">
        <Wordmark />
        <div className="text-right">
          <p className="panel-label text-[0.65rem] text-muted-foreground">Conversion teardown</p>
          <p className="font-display text-sm font-medium">A/B test plan</p>
        </div>
      </header>

      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">Landing page analyzed</p>
        <h1 className="text-balance font-display text-3xl font-bold tracking-tight">
          {ranked.length} tests to lift your conversion, ranked by impact.
        </h1>
        <p className="break-all font-mono text-sm text-purple">{analysis.url}</p>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border">
        <SummaryCell label="Tests found" value={String(ranked.length)} />
        <SummaryCell label="Top impact" value={`${topImpact}/10`} />
      </div>

      {analysis.competitors && analysis.competitors.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="panel-label text-[0.65rem] text-muted-foreground">
            Benchmarked against
          </span>
          {analysis.competitors.map((competitor) => (
            <a
              key={competitor.url}
              href={competitor.url}
              className="rounded-full border px-2 py-0.5 font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              {competitor.name}
            </a>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {visible.map((hypothesis, index) => {
          const recommended = hypothesis.variants[0]
          return (
            <article key={hypothesis.id} className="space-y-4 rounded-lg border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <SectionBadge section={hypothesis.section} />
                  {index === 0 && (
                    <span className="panel-label text-[0.6rem] text-coral">Test this first</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <ScoreIndicator label="Impact" score={hypothesis.impactScore} kind="impact" />
                  <ScoreIndicator label="Effort" score={hypothesis.effortScore} kind="effort" />
                </div>
              </div>

              <div className="space-y-1">
                <p className="panel-label text-[0.6rem] text-muted-foreground">Problem</p>
                <p className="text-sm font-medium leading-snug text-foreground">
                  {hypothesis.problem}
                </p>
              </div>

              {recommended && (
                <div className="space-y-2">
                  <p className="panel-label text-[0.6rem] text-muted-foreground">Recommendation</p>
                  <div className="space-y-3 rounded-md border border-purple/40 bg-purple/10 p-3">
                    <div className="space-y-1">
                      <p className="panel-label text-[0.55rem] text-muted-foreground">Current</p>
                      <p className="text-sm text-muted-foreground line-through">
                        {hypothesis.currentCopy}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="panel-label text-[0.55rem] text-muted-foreground">Change to</p>
                      <p className="text-sm font-medium">{recommended.copy}</p>
                    </div>
                  </div>
                  {hasPlaceholders(recommended.copy) && (
                    <p className="font-mono text-xs text-amber">
                      Contains [placeholders]. Swap in your real details before launching.
                    </p>
                  )}
                </div>
              )}

              {hypothesis.target === 'auto' ? (
                <VariantPreview
                  embedKey={analysis.embedKey}
                  hypothesisId={hypothesis.id}
                  initialUrl={recommended?.screenshotUrl ?? null}
                />
              ) : (
                <div className="rounded-md border border-dashed bg-muted/40 p-3">
                  <p className="panel-label text-[0.6rem] text-muted-foreground">Manual setup</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This change touches a section that is not a single-line text swap, so an
                    in-context preview is not available. Apply the recommended copy by hand.
                  </p>
                </div>
              )}

              <details className="group">
                <summary className="panel-label flex cursor-pointer list-none items-center gap-1 text-[0.6rem] text-muted-foreground hover:text-foreground">
                  Why this works
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:inline">-</span>
                </summary>
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-muted-foreground">{hypothesis.rationale}</p>
                  {recommended?.evidence && (
                    <p className="text-sm text-muted-foreground">{recommended.evidence}</p>
                  )}
                </div>
              </details>
            </article>
          )
        })}
      </div>

      {hidden.length > 0 && (
        <div className="space-y-4">
          <WaitlistWall embedKey={analysis.embedKey} hiddenCount={hidden.length} />
          <div
            aria-hidden
            className="pointer-events-none select-none space-y-4 blur-sm"
          >
            {hidden.map((hypothesis, index) => (
              <article key={hypothesis.id} className="space-y-3 rounded-lg border bg-card p-5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {String(REPORT_PREVIEW_LIMIT + index + 1).padStart(2, '0')}
                  </span>
                  <SectionBadge section={hypothesis.section} />
                </div>
                <p className="font-display text-base font-semibold leading-snug">
                  {hypothesis.problem}
                </p>
                <div className="h-16 rounded-md border border-purple/40 bg-purple/10" />
              </article>
            ))}
          </div>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <p className="font-mono text-sm">Want these measured live on your page?</p>
        <p className="text-sm text-muted-foreground">Generated by Hunch</p>
      </footer>
    </div>
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
