import { FALLBACK_APP_ORIGIN } from '@/lib/constants'

export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? FALLBACK_APP_ORIGIN).replace(/\/$/, '')
}

export function appOrigin(request: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return siteOrigin()
  return new URL(request.url).origin
}
