import Link from 'next/link'
import { Mail, MessageCircle } from 'lucide-react'
import { Wordmark } from '@/components/wordmark'
import {
  CONTACT_EMAIL,
  CONTACT_EMAIL_URL,
  CONTAINER_CLASS,
  PRIVACY_PATH,
  WHATSAPP_URL
} from '@/lib/constants'
import { getDictionary } from '@/lib/i18n'
import { t as fill } from '@/lib/i18n/format'
import { cn } from '@/lib/utils'

// `max-sm:min-h-11` and a matching minimum width for the icon-only one: at 64x16 and 16x16 these
// were the two smallest controls on the site. The row is `flex-wrap` with `gap-4`, so the taller
// links change nothing about how the footer lays out on a phone beyond its own height.
const linkClass =
  'inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline max-sm:min-h-11 max-sm:min-w-11'

export async function SiteFooter() {
  const t = await getDictionary()

  return (
    <footer className="border-t print:hidden">
      <div
        className={cn(
          CONTAINER_CLASS,
          'flex flex-col items-center gap-3 py-6 text-center sm:flex-row sm:justify-between sm:text-left'
        )}
      >
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
          <Wordmark />
          <p className="text-xs text-muted-foreground">
            {fill(t.footer.copyright, { year: new Date().getFullYear() })}
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-4">
          <Link href={PRIVACY_PATH} className={linkClass}>
            {t.footer.privacy}
          </Link>
          <a
            href={CONTACT_EMAIL_URL}
            aria-label={fill(t.footer.email, { address: CONTACT_EMAIL })}
            title={CONTACT_EMAIL}
            className={linkClass}
          >
            <Mail className="size-4" aria-hidden />
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={t.footer.whatsapp}
            title={t.footer.whatsapp}
            className={linkClass}
          >
            <MessageCircle className="size-4" aria-hidden />
          </a>
        </nav>
      </div>
    </footer>
  )
}
