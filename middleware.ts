import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import { CALLBACK_URL_PARAM, PROTECTED_PREFIXES } from '@/lib/constants'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname, search } = req.nextUrl
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (isProtected && !req.auth) {
    const signInUrl = new URL('/auth/signin', req.nextUrl.origin)
    // Carries the query string too, so a link into a filtered or sorted view survives sign-in. The
    // sign-in page revalidates this before handing it to `redirectTo` -- see safeCallbackUrl.
    signInUrl.searchParams.set(CALLBACK_URL_PARAM, `${pathname}${search}`)
    return Response.redirect(signInUrl)
  }
})

export const config = {
  matcher: [
    '/((?!api/billing/webhook|api/auth|api/track|api/cron|api/waitlist|api/report|screenshots|embed.js|_next/static|_next/image|favicon.ico).*)'
  ]
}
