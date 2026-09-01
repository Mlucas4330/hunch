'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { PREFERENCE_COOKIE_MAX_AGE, THEME_COOKIE } from '@/lib/constants'
import { isTheme } from '@/lib/theme'

/**
 * Writes the palette cookie and re-renders the tree that reads it.
 *
 * Mirrors `setLocale` in lib/actions/locale.ts, including the `revalidatePath('/', 'layout')`: the
 * class this decides is on `<html>` in the root layout, so revalidating the page alone would leave
 * the theme on the old value until a full navigation.
 *
 * A value that is not one of THEME is dropped rather than defaulted. The only way to send one is by
 * posting to this action by hand, and quietly writing `light` for it would mean a malformed request
 * silently changed a preference the reader did not touch.
 */
export async function setTheme(formData: FormData) {
  const theme = formData.get('theme')
  if (!isTheme(theme)) return

  const store = await cookies()
  store.set(THEME_COOKIE, theme, { maxAge: PREFERENCE_COOKIE_MAX_AGE, sameSite: 'lax', path: '/' })

  revalidatePath('/', 'layout')
}
