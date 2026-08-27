'use client'

import { useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'
import { cn } from '@/lib/utils'

type CopyState = 'idle' | 'copied' | 'failed'

/**
 * One control: copy the link to this analysis.
 *
 * **It used to be a named card with an `Open` button beside it**, and that card made sense while the
 * owner was reading a *different* page from the one it linked to. With one route there is nothing to
 * open -- the reader is already on the page the link points at -- so a card describing "an
 * interactive report anyone can open with the link" was describing the page it was sitting on. What
 * survives is the only part that still does something: putting the URL on the clipboard.
 *
 * The clipboard fallback stays: `navigator.clipboard` is undefined outside a secure context, and
 * without it the button is simply dead on plain http.
 */
export function CopyReportLink({
  reportUrl,
  embedKey,
  className
}: {
  reportUrl: string
  embedKey: string
  className?: string
}) {
  const { dictionary } = useI18n()
  const [origin, setOrigin] = useState(reportUrl.replace(/\/$/, ''))
  const [state, setState] = useState<CopyState>('idle')

  useEffect(() => {
    if (!origin) setOrigin(window.location.origin)
  }, [origin])

  async function onCopy() {
    setState((await writeToClipboard(`${origin}/r/${embedKey}`)) ? 'copied' : 'failed')
    setTimeout(() => setState('idle'), 2000)
  }

  const label =
    state === 'copied'
      ? dictionary.common.copied
      : state === 'failed'
        ? dictionary.analysis.copyFailed
        : dictionary.analysis.copyLink

  return (
    // **The label stays a word, never an icon alone.** Unlabelled controls are the problem this
    // component was written to solve, so shrinking the words is allowed and dropping them is not.
    // `flex-wrap` so the long transient `copyFailed` string wraps instead of overflowing.
    <Button
      variant="outline"
      size="sm"
      onClick={onCopy}
      className={cn('h-8 flex-wrap px-2 text-xs', className)}
      data-testid="copy-report-link"
    >
      <Link2 aria-hidden className="h-3.5 w-3.5" />
      {label}
    </Button>
  )
}

async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
  }

  try {
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(field)
    return ok
  } catch {
    return false
  }
}
