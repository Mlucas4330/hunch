import { NextResponse } from 'next/server'
import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import {
  CALLBACK_URL_PARAM,
  GCLID_COOKIE,
  GCLID_MAX_AGE_SECONDS,
  GCLID_PARAM,
  PROTECTED_PREFIXES
} from '@/lib/constants'

const { auth } = NextAuth(authConfig)

// Google Ads click ids are an opaque token from Google, and this is the shape every one of them
// has. An allowlist rather than a sanitizer, for the same reason SCREENSHOT_FILENAME_PATTERN is one:
// the value is written to a cookie and later read back into an outbound API call, and anything that
// is not a click id is a stranger putting a string through our server.
const GCLID_PATTERN = /^[A-Za-z0-9_-]{1,200}$/

export default auth((req) => {
  const { pathname, search, searchParams } = req.nextUrl
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (isProtected && !req.auth) {
    const signInUrl = new URL('/auth/signin', req.nextUrl.origin)
    signInUrl.searchParams.set(CALLBACK_URL_PARAM, `${pathname}${search}`)
    return Response.redirect(signInUrl)
  }

  // The whole of the ad tracking, and it happens here rather than on the landing page because an ad
  // may point at any of them: a blog post, a report link, the packs anchor. One place means a new
  // landing target can never be the one that silently stops attributing.
  const gclid = searchParams.get(GCLID_PARAM)
  if (!gclid || !GCLID_PATTERN.test(gclid)) return

  const response = NextResponse.next()

  response.cookies.set(GCLID_COOKIE, gclid, {
    maxAge: GCLID_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  })

  return response
})

export const config = {
  matcher: [
    '/((?!api/health|api/billing/webhook|api/billing/mercadopago/webhook|api/auth|api/cron|api/report|screenshots|_next/static|_next/image|favicon.ico).*)'
  ]
}
