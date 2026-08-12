'use client'

import { useEffect, useRef } from 'react'

export function ReportViewPing({ embedKey }: { embedKey: string }) {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true

    const body = JSON.stringify({ embedKey })

    if (navigator.sendBeacon?.('/api/report/view', body)) return
    void fetch('/api/report/view', { method: 'POST', body, keepalive: true }).catch(() => {})
  }, [embedKey])

  return null
}
