import { BR, US } from 'country-flag-icons/react/3x2'
import { PendingFieldset } from '@/components/submit-button'
import { setLocale } from '@/lib/actions/locale'
import { LOCALE_LABEL } from '@/lib/constants'
import { LOCALE, type Locale } from '@/lib/enums'
import { dictionaryFor } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * One flag per locale, from `country-flag-icons`.
 *
 * **Not the flag emoji.** Windows ships no flag faces in Segoe UI Emoji, so Chrome and Edge draw the
 * regional indicator pair as the boxed letters "BR" and "US" -- which is the small out of proportion
 * label this replaced, with less control over it. These are SVGs and render the same everywhere.
 *
 * It lives here rather than in `lib/constants.ts` for the reason `READOUT_GROUP_ICON` does: that file
 * is imported by pure modules and holds strings, and a component in it would pull the flag set into
 * all of them.
 */
const LOCALE_FLAG: Record<Locale, typeof BR> = {
  en: US,
  'pt-BR': BR
}

/**
 * The language switch: two segments, the current one filled.
 *
 * **A segmented pair rather than one button that toggles**, the same call `ThemeToggle` makes and for
 * the same reason -- a single control has to say either what is on or what pressing it will do, and
 * both readings are common enough to make it a coin flip. Two segments with one marked `aria-current`
 * say both at once.
 *
 * Flags rather than the language's letters, so **each segment carries its accessible name from
 * `LOCALE_LABEL`** exactly as the theme switch carries its own from the dictionary. A flag is a
 * country and not a language, which is why the name a screen reader reads is the language.
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
          const Flag = LOCALE_FLAG[option]

          return (
            <button
              key={option}
              type="submit"
              name="locale"
              value={option}
              aria-current={active ? 'true' : undefined}
              title={LOCALE_LABEL[option]}
              className={cn(
                // Matched to the theme switch beside it at both sizes: the flag stays small and the
                // box around it is squared off explicitly, so the two switches are one control
                // height on a desktop and one tap target on a phone.
                'flex size-6 items-center justify-center rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:size-11',
                active ? 'bg-foreground' : 'hover:bg-muted'
              )}
            >
              {/* Sized in exact 3:2 pairs, the ratio the flags are drawn at, so neither one is
                  stretched. Desaturated until chosen: two full colour flags side by side both look
                  selected, and the fill alone then has to carry a decision the colour is arguing
                  against. */}
              <Flag
                className={cn(
                  'h-3 w-4.5 transition-[filter,opacity] max-sm:h-4 max-sm:w-6',
                  active ? 'opacity-100' : 'opacity-60 grayscale'
                )}
                aria-hidden="true"
              />
              <span className="sr-only">{LOCALE_LABEL[option]}</span>
            </button>
          )
        })}
      </PendingFieldset>
    </form>
  )
}
