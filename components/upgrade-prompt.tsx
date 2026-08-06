'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'
import { UPGRADE_PROMPT_DISMISSED_KEY } from '@/lib/constants'

// The post-value upsell: shown to free plans once the analysis they came for is on screen, never
// before it. Deliberately says nothing about the remaining allowance -- UsageBanner already counts
// that on the dashboard, and the experiment panel already offers the export upgrade.
//
// Dismissal lives in localStorage, so it is per browser rather than per user. Making it per user
// would need a users column and a write endpoint, which is more than a dismissible prompt is worth.
export function UpgradePrompt() {
  const { dictionary } = useI18n()
  // null until localStorage has been read: rendering before that flashes a card the reader already
  // dismissed.
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(UPGRADE_PROMPT_DISMISSED_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  if (dismissed !== false) return null

  function dismiss() {
    try {
      window.localStorage.setItem(UPGRADE_PROMPT_DISMISSED_KEY, '1')
    } catch {
      // A browser refusing storage costs a dismissal that does not persist, never the dismissal.
    }
    setDismissed(true)
  }

  return (
    <div
      data-testid="upgrade-prompt"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-purple/40 bg-purple/10 p-4"
    >
      <div className="space-y-0.5">
        <p className="panel-label text-[0.65rem] text-purple">{dictionary.upgradePrompt.eyebrow}</p>
        <p className="text-sm font-medium">{dictionary.upgradePrompt.title}</p>
        <p className="text-sm text-muted-foreground">{dictionary.upgradePrompt.body}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={dismiss}
          aria-label={dictionary.upgradePrompt.dismissAria}
        >
          {dictionary.upgradePrompt.dismiss}
        </Button>
        <Button asChild size="sm">
          <Link href="/billing">{dictionary.common.upgrade}</Link>
        </Button>
      </div>
    </div>
  )
}
