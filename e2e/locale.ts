import type { BrowserContext } from '@playwright/test'
import { LOCALE_COOKIE } from '../lib/constants'
import { E2E_BASE_URL } from '../playwright.config'

/**
 * Pins a context to English.
 *
 * **The site answers pt-BR to a reader with no cookie** (`DEFAULT_LOCALE`), and the assertions in
 * this suite are written in English. Pinning keeps them about the behaviour they cover rather than
 * about which dictionary rendered it -- both are complete and typechecked against each other, so a
 * screen that works in one works in the other.
 *
 * What is deliberately not pinned is the locale test itself, which is the only place that asserts
 * what an unpinned reader gets. See e2e/core.spec.ts.
 */
export async function pinEnglish(context: BrowserContext) {
  await context.addCookies([{ name: LOCALE_COOKIE, value: 'en', url: E2E_BASE_URL }])
}
