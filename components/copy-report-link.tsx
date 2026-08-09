'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'

type CopyState = 'idle' | 'copied' | 'failed'

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
      <Button asChild variant="ghost" size="sm">
        <Link href={`/analyses/${analysisId}/report`} aria-label={dictionary.analysis.report}>
          <Printer aria-hidden className="h-4 w-4" />
        </Link>
      </Button>
    </>
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
