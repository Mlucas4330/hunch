import { PendingFieldset } from '@/components/submit-button'
import { setLocale } from '@/lib/actions/locale'
import { LOCALE_LABEL } from '@/lib/constants'
import { LOCALE, type Locale } from '@/lib/enums'
import { dictionaryFor } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function LanguageToggle({ locale }: { locale: Locale }) {
  const t = dictionaryFor(locale)

  return (
    <form
      action={setLocale}
      aria-label={t.nav.languageAria}
      className="flex items-center rounded-sm border px-1 py-0.5"
    >
      <PendingFieldset>
        {LOCALE.map((option) => {
          const active = option === locale
          return (
            <button
              key={option}
              type="submit"
              name="locale"
              value={option}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'panel-label rounded-sm px-1.5 py-0.5 text-[0.6rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {LOCALE_LABEL[option]}
            </button>
          )
        })}
      </PendingFieldset>
    </form>
  )
}
