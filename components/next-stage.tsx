import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { t as fill } from '@/lib/i18n/format'
import type { Dictionary } from '@/lib/i18n'

export function NextStage({
  t,
  analysisId,
  testable
}: {
  t: Dictionary
  analysisId: string
  testable: number
}) {
  const copy = t.nextStage

  return (
    <section className="space-y-3 rounded-lg border border-dashed bg-muted/30 p-5" data-testid="next-stage">
      <div className="space-y-1">
        <p className="panel-label text-[0.65rem] text-muted-foreground">{copy.eyebrow}</p>
        <h2 className="font-display text-xl font-bold tracking-tight">{copy.title}</h2>
      </div>

      <p className="max-w-2xl text-pretty text-sm text-muted-foreground">{copy.body}</p>

      {testable > 0 ? (
        <>
          <p className="text-sm font-medium">{fill(copy.ready, { count: testable })}</p>
          <p className="text-xs text-muted-foreground">{copy.requirement}</p>
          <Button asChild size="sm">
            <Link href={`/analyses/${analysisId}/tests`}>{copy.cta}</Link>
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t.testList.empty}</p>
      )}
    </section>
  )
}
