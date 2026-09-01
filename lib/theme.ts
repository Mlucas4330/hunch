import { cookies } from 'next/headers'
import { DEFAULT_THEME, THEME_COOKIE } from '@/lib/constants'
import { THEME, type Theme } from '@/lib/enums'

/**
 * The reader's palette, resolved on the server.
 *
 * **Deliberately the same shape as `getLocale()` in lib/i18n/index.ts, down to the cookie and the
 * fallback**, because it is the same problem: a preference the server has to know before it renders
 * a single byte. Reading the theme in the browser instead -- from `localStorage`, or from
 * `prefers-color-scheme` -- means the first paint is whatever the markup shipped with and the
 * correction happens after hydration, which is the white flash every dark-mode implementation is
 * judged by. There is no inline script here for the same reason: there is nothing left for one to do.
 *
 * An unreadable or absent cookie is not an error, it is a first visit. See docs/components.md.
 */
export function isTheme(value: unknown): value is Theme {
  return THEME.includes(value as Theme)
}

export async function getTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value
  return isTheme(value) ? value : DEFAULT_THEME
}
