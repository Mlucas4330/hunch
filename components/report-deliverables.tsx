'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { useI18n } from '@/components/i18n-provider'

type CopyState = 'idle' | 'copied' | 'failed'

// One destination now that the PDF is gone. The pair of named cards existed to tell two documents
// apart, so with one left the naming is the card's own heading and nothing else -- see
// docs/report.md. The clipboard fallback stays: navigator.clipboard is undefined outside a secure
// context, and without it the button is simply dead on plain http.
export function ReportDeliverables({
  reportUrl,
  embedKey,
  variant = 'full'
}: {
  reportUrl: string
  embedKey: string
  variant?: 'full' | 'compact'
}) {
  const { dictionary } = useI18n()
  const copy = dictionary.analysis.deliverables
  const [origin, setOrigin] = useState(reportUrl.replace(/\/$/, ''))
  const [state, setState] = useState<CopyState>('idle')

  useEffect(() => {
    if (!origin) setOrigin(window.location.origin)
  }, [origin])

  const href = `${origin}/r/${embedKey}`

  async function onCopy() {
    setState((await writeToClipboard(href)) ? 'copied' : 'failed')
    setTimeout(() => setState('idle'), 2000)
  }

  const copyLabel =
    state === 'copied'
      ? dictionary.common.copied
      : state === 'failed'
        ? dictionary.analysis.copyFailed
        : copy.copyLink

  if (variant === 'compact') {
    return (
      <div
        className="relative z-10 -ml-2 flex flex-wrap items-center gap-1"
        data-testid="deliverables-compact"
      >
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onCopy}>
          <Link2 aria-hidden className="h-3.5 w-3.5" />
          {copyLabel}
        </Button>
      </div>
    )
  }

  return (
    <section className="space-y-3" data-testid="deliverables">
      <div className="flex items-center gap-2">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{copy.eyebrow}</p>
        <InfoHint label={copy.hintLabel}>
          <RichText>{copy.hint}</RichText>
        </InfoHint>
      </div>

      <Card className="flex flex-col gap-3 p-4">
        <div className="space-y-1">
          <h2 className="font-display text-sm font-semibold tracking-tight">
            {copy.interactiveTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{copy.interactiveBody}</p>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <a href={href} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden className="h-4 w-4" />
              {copy.open}
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={onCopy}>
            {copyLabel}
          </Button>
        </div>
      </Card>
    </section>
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
