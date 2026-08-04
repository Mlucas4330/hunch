'use client'

import { WaitlistForm } from '@/components/waitlist-form'
import { useI18n } from '@/components/i18n-provider'
import { t } from '@/lib/i18n/format'

export function WaitlistWall({ embedKey, hiddenCount }: { embedKey: string; hiddenCount: number }) {
  const { dictionary } = useI18n()

  return (
    <div className="rounded-lg border border-purple/40 bg-purple/10 p-6 text-center">
      <p className="panel-label text-[0.65rem] text-purple">{dictionary.waitlist.seeMore}</p>
      <h2 className="mt-2 text-balance font-display text-xl font-bold tracking-tight">
        {t(dictionary.waitlist.heading, { count: hiddenCount })}
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {dictionary.waitlist.body}
      </p>
      <div className="mx-auto mt-5 max-w-sm">
        <WaitlistForm embedKey={embedKey} />
      </div>
    </div>
  )
}
