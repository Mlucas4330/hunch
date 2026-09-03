'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'
import type { Verdict, VerdictTarget } from '@/lib/enums'
import { cn } from '@/lib/utils'

/**
 * What the owner decided about one recommendation, on the card that made it.
 *
 * **It is the only judgement this product holds about its own output**, which is why it is worth a
 * control and a column rather than being inferred from anything. `scripts/rewrite-stats.mts` reads
 * these back as an acceptance rate, and that rate is what a change to a prompt is judged by. See
 * docs/ai-pipeline.md.
 *
 * **"Applied" says the owner shipped it and never that it worked.** Nothing here, and nothing
 * reading it, may attribute a movement in a number to a fix marked applied: nobody controlled for
 * anything between two measurements. See docs/invariants.md.
 *
 * Owner only, like the alternates one card over: a reader holding the link is not the person whose
 * decision this records, and the route answers 404 to them anyway.
 */
export function FixVerdict({
  target,
  id,
  initial
}: {
  target: VerdictTarget
  id: string
  initial: Verdict | null
}) {
  const { dictionary } = useI18n()
  const copy = dictionary.verdict
  const [verdict, setVerdict] = useState(initial)
  const [pending, setPending] = useState(false)

  // Optimistic, and rolled back on failure. The alternative is a spinner on a control whose whole
  // point is that deciding costs nothing, and a decision that quietly did not save is worse than one
  // that visibly bounced back.
  async function decide(next: Verdict | null) {
    const previous = verdict
    setVerdict(next)
    setPending(true)

    try {
      const res = await fetch('/api/verdicts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, id, verdict: next })
      })
      if (!res.ok) setVerdict(previous)
    } catch {
      setVerdict(previous)
    } finally {
      setPending(false)
    }
  }

  if (verdict) {
    return (
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3"
        data-testid="fix-verdict"
        data-verdict={verdict}
      >
        <span
          className={cn(
            'panel-label text-nano',
            verdict === 'applied' ? 'text-green' : 'text-muted-foreground'
          )}
        >
          {verdict === 'applied' ? copy.appliedState : copy.dismissedState}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => decide(null)}
          className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground disabled:opacity-50"
        >
          {copy.undo}
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 border-t border-border pt-3"
      data-testid="fix-verdict"
    >
      <span className="panel-label text-nano mr-1 text-muted-foreground">{copy.question}</span>
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => decide('applied')}>
        {copy.applied}
      </Button>
      <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => decide('dismissed')}>
        {copy.dismissed}
      </Button>
    </div>
  )
}
