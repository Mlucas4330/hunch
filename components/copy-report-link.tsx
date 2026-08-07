'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'

type CopyState = 'idle' | 'copied' | 'failed'

// The two things you do with a finished report: copy its link, or print it. They used to be three
// controls sitting side by side -- "open shareable report", "copy report link" and "print report" --
// where the first two went to the same place and the third read like a fourth destination.
//
// Opening the link is gone: copying it is what you came to do, and the reader can open what they
// pasted. Printing is an icon rather than a third button, because it is the rarer of the two and a
// row of equal-weight buttons was the reason none of them read as the primary action.
//
// The copy button keeps its explicit failure state: `navigator.clipboard` is undefined outside a
// secure context, so on plain http the promise rejected unhandled and the button was simply dead.
export function CopyReportLink({
  reportUrl,
  embedKey,
  analysisId
}: {
  reportUrl: string
  embedKey: string
  analysisId: string
}) {
  const { dictionary } = useI18n()
  const [origin, setOrigin] = useState(reportUrl.replace(/\/$/, ''))
  const [state, setState] = useState<CopyState>('idle')

  useEffect(() => {
    if (!origin) setOrigin(window.location.origin)
  }, [origin])

  const href = `${origin}/r/${embedKey}`

  async function copy() {
    setState((await writeToClipboard(href)) ? 'copied' : 'failed')
    setTimeout(() => setState('idle'), 2000)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={copy}>
        {state === 'copied'
          ? dictionary.common.copied
          : state === 'failed'
            ? dictionary.analysis.copyFailed
            : dictionary.analysis.copyReportLink}
      </Button>
      {/* The label is on the link, not on the icon: an icon-only control with no accessible name is
          invisible to a screen reader, and it doubles as the tooltip for everyone else. */}
      <Button asChild variant="ghost" size="sm">
        <Link href={`/analyses/${analysisId}/report`} aria-label={dictionary.analysis.report}>
          <Printer aria-hidden className="h-4 w-4" />
        </Link>
      </Button>
    </>
  )
}

// The async Clipboard API only exists in a secure context, which a deploy reached over plain http or
// by LAN address is not. Falling back to the legacy command keeps the button working there instead
// of leaving it silently inert.
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Falls through to the legacy path: a rejection here is a permission or context failure, both of
    // which execCommand can still survive.
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
