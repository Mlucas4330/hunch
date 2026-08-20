import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getDictionary } from '@/lib/i18n'

/**
 * What sits where the fixes would be on an analysis nobody has paid for.
 *
 * It stands in the same place the old email wall did, and answers a different question. That one
 * traded a stranger's address for a preview of someone else's report; this one asks the person
 * looking at their **own** page whether they want the half a model has to write. The score and the
 * readout above it are never behind this — they are the part the reader can check against their own
 * site in one click, and gating a measurement of someone's own page reads as a trick. See
 * docs/readout.md.
 */
export async function UnlockWall({ embedKey }: { embedKey: string }) {
  const t = await getDictionary()
  const copy = t.unlock

  return (
    <Card className="border-dashed" data-testid="unlock-wall">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple/15">
          <Lock aria-hidden className="h-5 w-5 text-purple" />
        </span>

        <div className="space-y-1">
          <h2 className="text-balance font-display text-xl font-bold tracking-tight">
            {copy.heading}
          </h2>
          <p className="mx-auto max-w-md text-pretty text-sm text-muted-foreground">{copy.body}</p>
        </div>

        <ul className="space-y-1 text-sm text-muted-foreground">
          {copy.points.map((point) => (
            <li key={point} className="flex items-start gap-2">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground" />
              {point}
            </li>
          ))}
        </ul>

        <Button asChild>
          <Link href={`/auth/signin?${new URLSearchParams({ callbackUrl: `/r/${embedKey}` })}`}>
            {copy.cta}
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
