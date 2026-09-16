import { FALLBACK_APP_ORIGIN } from '@/lib/constants'

export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? FALLBACK_APP_ORIGIN).replace(/\/$/, '')
}

export function appOrigin(request: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return siteOrigin()
  return new URL(request.url).origin
}

/**
 * Where Mercado Pago sends the reader back after a checkout.
 *
 * **Its own variable, because the provider will not accept every URL this app answers on.** Two
 * refusals, both measured against the live API rather than guessed:
 *
 * - `http://localhost:3000` is refused, so the checkout cannot be opened from a developer's machine
 *   at all without pointing this at something public.
 * - Its validator refuses some apex domains on newer TLDs: `https://hunch.solutions` is refused and
 *   `https://www.hunch.solutions` is accepted, as is the Railway hostname.
 *
 * The error it answers with is "Invalid value for back_url, must be a valid URL", which says nothing
 * about either rule, so the variable exists to be set rather than to be debugged again.
 */
export function billingReturnUrl(path: string): string {
  const base = process.env.BILLING_RETURN_URL?.replace(/\/$/, '') ?? siteOrigin()
  return `${base}${path}`
}
