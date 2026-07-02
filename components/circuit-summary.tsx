'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionBadge } from '@/components/section-badge'
import { buildPlanMarkdown, type PlanCompetitor, type PlanStep } from '@/lib/export'

export function CircuitSummary({
  url,
  steps,
  competitors
}: {
  url: string
  steps: PlanStep[]
  competitors: PlanCompetitor[]
}) {
  const [copied, setCopied] = useState(false)

  const markdown = buildPlanMarkdown(url, steps, competitors)

  async function copy() {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function download() {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = 'ab-test-plan.md'
    anchor.click()
    URL.revokeObjectURL(href)
  }

  return (
    <div className="animate-fade-up space-y-6" data-testid="summary">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Your A/B test plan</h2>
          <p className="text-sm text-muted-foreground">
            The copy you picked for each section, ready to ship.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copy} data-testid="summary-copy">
            {copied ? 'Copied' : 'Copy to clipboard'}
          </Button>
          <Button onClick={download} data-testid="summary-download">
            Download .md
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <Card key={step.section + step.problem}>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <SectionBadge section={step.section} />
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {step.problem}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm">{step.chosenCopy ?? 'Keep current copy'}</p>
              {step.chosenEvidence && (
                <p className="text-xs text-muted-foreground">Why: {step.chosenEvidence}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
