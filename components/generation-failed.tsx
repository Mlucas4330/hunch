import { RotateCcw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getDictionary } from '@/lib/i18n'
import { POST_SIGNIN_REDIRECT } from '@/lib/constants'

/**
 * What stands where the error lists would be when the run threw or came back empty, or where the
 * measurement would be when the run failed before measuring.
 *
 * The state is read from the latest run's `failed_at`, which is written before `runAnalysis`
 * rethrows, so by the time this renders the failure is recorded and the run is already out of the
 * quota count. It does not say why: nothing here knows.
 */
export async function GenerationFailed({ measured = true }: { measured?: boolean }) {
  const t = await getDictionary()
  const copy = measured ? t.report.failed : t.report.measureFailed

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
          <Link href={POST_SIGNIN_REDIRECT}>{t.report.failed.cta}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
