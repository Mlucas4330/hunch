'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'
import { CONTACT_PATH, UPGRADE_PROMPT_DISMISSED_KEY } from '@/lib/constants'

export function UpgradePrompt() {
  const { dictionary } = useI18n()
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
          <Link href={CONTACT_PATH}>{dictionary.common.upgrade}</Link>
        </Button>
      </div>
    </div>
  )
}
