'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export function CopyReportLink({ reportUrl, embedKey }: { reportUrl: string; embedKey: string }) {
  const [origin, setOrigin] = useState(reportUrl)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!origin) setOrigin(window.location.origin)
  }, [origin])

  async function copy() {
    await navigator.clipboard.writeText(`${origin}/r/${embedKey}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? 'Copied' : 'Copy report link'}
    </Button>
  )
}
