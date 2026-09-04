import { PendingFieldset } from '@/components/submit-button'
import { setLocale } from '@/lib/actions/locale'
import { LOCALE_LABEL } from '@/lib/constants'
import { LOCALE, type Locale } from '@/lib/enums'
import { dictionaryFor } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * The language switch: two segments, the current one filled.
 *
 * **A segmented pair rather than one button that toggles**, the same call `ThemeToggle` makes and for
 * the same reason -- a single control has to say either what is on or what pressing it will do, and
 * both readings are common enough to make it a coin flip. Two segments with one marked `aria-current`
 * say both at once.
 *
 * It sits in the navbar cluster next to the theme switch, in the mobile menu, and in the public
 * report's header, because a signed out reader on the landing page or on somebody else's report is
 * exactly who needs it. See docs/i18n.md.
 */
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
                // Matched to the theme switch beside it: the label stays small and the box around it
                // grows on a phone, so the pair is one control height rather than two.
                'panel-label flex items-center justify-center rounded-sm px-1.5 py-0.5 text-nano transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:size-11',
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
