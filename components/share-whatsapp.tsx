'use client'

import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'
import { REPORT_PATH, WHATSAPP_SHARE_URL } from '@/lib/constants'
import { t } from '@/lib/i18n/format'
import { cn } from '@/lib/utils'

/**
 * Sending this report on WhatsApp, which is where a Brazilian agency reaches a prospect.
 *
 * **It carries no number, ours least of all.** `WHATSAPP_SHARE_URL` opens the reader's own chat
 * picker, so the message goes to whoever they choose and names nobody. Putting `WHATSAPP_URL` here
 * would advertise us inside a document that carries the agency's brand. See docs/invariants.md.
 *
 * Owner only, mounted in the owner's half of the header, and `print:hidden` like every other
 * control.
 */
export function ShareWhatsapp({
  reportUrl,
  embedKey,
  host,
  className
}: {
  reportUrl: string
  embedKey: string
  host: string
  className?: string
}) {
  const { dictionary } = useI18n()
  const copy = dictionary.report.shareWhatsapp
  const [origin, setOrigin] = useState(reportUrl.replace(/\/$/, ''))

  useEffect(() => {
    if (!origin) setOrigin(window.location.origin)
  }, [origin])

  const message = t(copy.message, { host, url: `${origin}${REPORT_PATH}/${embedKey}` })

  return (
    <Button asChild variant="ghost" size="sm" className={cn('print:hidden', className)}>
      <a
        href={`${WHATSAPP_SHARE_URL}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noreferrer noopener"
      >
        <MessageCircle aria-hidden className="h-4 w-4" />
        {copy.label}
      </a>
    </Button>
  )
}
