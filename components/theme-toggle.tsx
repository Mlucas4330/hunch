import { Moon, Sun } from 'lucide-react'
import { PendingFieldset } from '@/components/submit-button'
import { setTheme } from '@/lib/actions/theme'
import { THEME, type Theme } from '@/lib/enums'
import { getDictionary } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const THEME_ICON = { light: Sun, dark: Moon }

/**
 * The palette switch: two segments, the current one filled.
 *
 * **A segmented pair rather than one button that toggles**, which is the same call `LanguageToggle`
 * made and for the same reason. A single button has to say either what it is or what it will do, and
 * both readings are common enough that the control is a coin flip -- a moon glyph means "you are in
 * dark" to half the readers and "press for dark" to the other half. Two segments with one marked
 * `aria-current` say both at once and need no label to disambiguate.
 *
 * Icon-only, so each segment carries its accessible name from the dictionary rather than from the
 * glyph. `PendingFieldset` rather than `SubmitButton`: `useFormStatus` reports the form and not which
 * button was pressed, so a spinner would have to appear on both.
 */
export async function ThemeToggle({ theme }: { theme: Theme }) {
  const t = await getDictionary()

  return (
    <form
      action={setTheme}
      aria-label={t.nav.themeAria}
      className="flex items-center rounded-sm border px-1 py-0.5"
    >
      <PendingFieldset>
        {THEME.map((option) => {
          const active = option === theme
          const Icon = THEME_ICON[option]

          return (
            <button
              key={option}
              type="submit"
              name="theme"
              value={option}
              aria-current={active ? 'true' : undefined}
              title={t.nav.theme[option]}
              // The icon stays `size-3.5` and the box around it is squared off explicitly, at the
              // same two sizes `LanguageToggle` uses. Padding alone sized each segment off its own
              // content, an icon here and a text label there, so the two switches sat side by side
              // at different heights on a desktop and only agreed at the `max-sm` step. Enlarging
              // the glyph instead would put a pair of oversized icons in a bar drawn around small
              // ones. On a phone the segmented pair is 88px wide, which is what a two-way control
              // costs when both halves are tappable.
              className={cn(
                'flex size-6 items-center justify-center rounded-sm transition-colors max-sm:size-11',
                active ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{t.nav.theme[option]}</span>
            </button>
          )
        })}
      </PendingFieldset>
    </form>
  )
}
