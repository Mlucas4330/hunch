'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'

export function CopyReportLink({ reportUrl, embedKey }: { reportUrl: string; embedKey: string }) {
  const { dictionary } = useI18n()
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
      {copied ? dictionary.common.copied : dictionary.analysis.copyReportLink}
    </Button>
  )
}
