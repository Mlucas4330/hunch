import { RotateCcw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getDictionary } from '@/lib/i18n'
import { POST_SIGNIN_REDIRECT } from '@/lib/constants'

/**
 * What stands where the fixes would be when the generation threw and the credit went back.
 *
 * **It exists because the alternative was the unlock wall**, which is what this row rendered before:
 * a failed generation leaves an owned, measured analysis with no hypotheses, which is byte for byte
 * what a claimed free run looks like. So the reader who had paid, waited, and been refunded was shown
 * a lock and a button to buy a credit. Telling somebody to buy the thing they were just given back is
 * the worst sentence available at that moment.
 *
 * **It may say the credit came back, and only because of where the state comes from.** The `failed`
 * state is read from a `refund` row in the ledger, not from a caught exception -- so by the time this
 * renders, the refund is a committed fact rather than an intention. Had `refundCredit` itself failed
 * there would be no row, the state would not be `failed`, and this would not be on screen claiming
 * otherwise. See `wasRefunded` in lib/credits.ts.
 *
 * What it does NOT say: why. Nothing here knows -- the schema rejected the output, or the model call
 * failed, or the process died -- and naming a cause we did not observe is the same invention the rest
 * of the product refuses. It also promises nothing about a retry. See docs/invariants.md.
 *
 * The readout above is untouched and stays the reader's: it was committed before the generation
 * started, which is the whole reason this is a recoverable moment rather than a wasted one.
 */
export async function GenerationFailed() {
  const t = await getDictionary()
  const copy = t.report.failed

  return (
    <Card className="border-dashed" data-testid="generation-failed">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <RotateCcw aria-hidden className="h-5 w-5 text-muted-foreground" />
        </span>

        <div className="space-y-1">
          <h2 className="text-balance font-display text-xl font-bold tracking-tight">
            {copy.heading}
          </h2>
          <p className="mx-auto max-w-md text-pretty text-sm text-muted-foreground">{copy.body}</p>
        </div>

        <Button asChild variant="outline">
          <Link href={POST_SIGNIN_REDIRECT}>{copy.cta}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
