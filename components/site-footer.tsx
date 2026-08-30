import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { Wordmark } from '@/components/wordmark'
import { CONTAINER_CLASS, PRIVACY_PATH, WHATSAPP_URL } from '@/lib/constants'
import { getDictionary } from '@/lib/i18n'
import { t as fill } from '@/lib/i18n/format'
import { cn } from '@/lib/utils'

const linkClass =
  'inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline'

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
