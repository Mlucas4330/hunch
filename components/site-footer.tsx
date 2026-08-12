import Link from 'next/link'
import { Wordmark } from '@/components/wordmark'
import { CONTACT_PATH, CONTAINER_CLASS } from '@/lib/constants'
import { getDictionary } from '@/lib/i18n'
import { t as fill } from '@/lib/i18n/format'
import { cn } from '@/lib/utils'

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
        <Link
          href={CONTACT_PATH}
          className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          {t.footer.contact}
        </Link>
      </div>
    </footer>
  )
}
