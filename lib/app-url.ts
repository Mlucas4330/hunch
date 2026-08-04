import { FALLBACK_APP_ORIGIN } from '@/lib/constants'

// The configured origin on its own, for the callers that have no request to fall back to:
// metadataBase, canonical URLs and the sitemap are all generated at build or render time.
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? FALLBACK_APP_ORIGIN).replace(/\/$/, '')
}

// Prefers the configured origin over the request's, because the request's is derived from the Host
// header -- which the caller controls. Anywhere that origin ends up in a URL a user is later sent
// back to, that difference matters.
export function appOrigin(request: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return siteOrigin()
  return new URL(request.url).origin
}
