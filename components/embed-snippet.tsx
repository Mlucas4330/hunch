'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/components/i18n-provider'
import { GOAL_ATTRIBUTE } from '@/lib/constants'

export function EmbedSnippet({ appUrl, embedKey }: { appUrl: string; embedKey: string }) {
  const { dictionary } = useI18n()
  const [origin, setOrigin] = useState(appUrl)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!origin) setOrigin(window.location.origin)
  }, [origin])

  const snippet = `<script src="${origin}/embed.js" data-key="${embedKey}"></script>`
  const csp = `script-src ${origin}; connect-src ${origin};`

  async function copy() {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-sm font-medium">{dictionary.embedSnippet.title}</CardTitle>
        <Button variant="outline" size="sm" onClick={copy} data-testid="embed-copy">
          {copied ? dictionary.common.copied : dictionary.common.copy}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">{dictionary.embedSnippet.body}</p>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{snippet}</pre>

        <div className="space-y-2 border-t pt-3">
          <p className="panel-label text-[0.65rem] text-muted-foreground">
            {dictionary.embedSnippet.goalTitle}
          </p>
          <p className="text-xs text-muted-foreground">{dictionary.embedSnippet.goalBody}</p>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
            {`<button ${GOAL_ATTRIBUTE}>...</button>`}
          </pre>
        </div>

        <div className="space-y-2 border-t pt-3">
          <p className="panel-label text-[0.65rem] text-muted-foreground">
            {dictionary.embedSnippet.troubleshootTitle}
          </p>
          <p className="text-xs text-muted-foreground">{dictionary.embedSnippet.cspBody}</p>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{csp}</pre>
          <p className="text-xs text-muted-foreground">{dictionary.embedSnippet.cspBoth}</p>
          <p className="text-xs text-muted-foreground">{dictionary.embedSnippet.debugBody}</p>
        </div>
      </CardContent>
    </Card>
  )
}
