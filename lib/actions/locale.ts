'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { LOCALE_COOKIE, PREFERENCE_COOKIE_MAX_AGE } from '@/lib/constants'
import { isLocale } from '@/lib/i18n'

export async function setLocale(formData: FormData) {
  const locale = formData.get('locale')
  if (!isLocale(locale)) return

  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, { maxAge: PREFERENCE_COOKIE_MAX_AGE, sameSite: 'lax', path: '/' })

  revalidatePath('/', 'layout')
}
