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
              className={cn(
                'rounded-sm p-1 transition-colors',
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
