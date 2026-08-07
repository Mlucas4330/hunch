'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'
import { CONTACT_PATH } from '@/lib/constants'
import { t } from '@/lib/i18n/format'
import { cn } from '@/lib/utils'

// Free plans get a warning as the allowance runs low and a hard block once it is gone. Paid plans
// have no allowance to warn about, so the banner renders nothing.
export function UsageBanner({ used, limit }: { used: number; limit: number | null }) {
  const { dictionary } = useI18n()

  if (limit === null) return null
  const remaining = limit - used
  if (remaining > 1) return null

  const blocked = remaining <= 0

  return (
    <div
      data-testid="usage-banner"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4',
        blocked ? 'border-red/40 bg-red/10' : 'border-amber/40 bg-amber/10'
      )}
    >
      <div className="space-y-0.5">
        <p className={cn('panel-label text-[0.65rem]', blocked ? 'text-red' : 'text-amber')}>
          {blocked ? dictionary.usageBanner.limitReached : dictionary.usageBanner.almostOut}
        </p>
        <p className="text-sm font-medium">
          <span className="font-mono tabular-nums">{used}</span> {dictionary.usageBanner.usageOf}{' '}
          <span className="font-mono tabular-nums">{limit}</span> {dictionary.usageBanner.used}{' '}
          {blocked
            ? dictionary.usageBanner.blockedNote
            : t(dictionary.usageBanner.remainingNote, { remaining })}
        </p>
      </div>
      <Button asChild size="sm" variant={blocked ? 'default' : 'outline'}>
        <Link href={CONTACT_PATH}>{dictionary.common.upgrade}</Link>
      </Button>
    </div>
  )
}
