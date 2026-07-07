'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function EmbedSnippet({ appUrl, embedKey }: { appUrl: string; embedKey: string }) {
  const [origin, setOrigin] = useState(appUrl)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!origin) setOrigin(window.location.origin)
  }, [origin])

  const snippet = `<script src="${origin}/embed.js" data-key="${embedKey}"></script>`

  async function copy() {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-sm font-medium">Install the tracking snippet</CardTitle>
        <Button variant="outline" size="sm" onClick={copy} data-testid="embed-copy">
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Paste this once, just before the closing body tag on your landing page. It applies
          running variants and reports results back automatically.
        </p>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{snippet}</pre>
      </CardContent>
    </Card>
  )
}
