import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'

const { auth } = NextAuth(authConfig)

const PROTECTED_PREFIXES = ['/dashboard', '/analyses', '/billing']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (isProtected && !req.auth) {
    const signInUrl = new URL('/auth/signin', req.nextUrl.origin)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return Response.redirect(signInUrl)
  }
})

export const config = {
  matcher: [
    '/((?!api/billing/webhook|api/auth|api/track|api/cron|api/waitlist|api/report|embed.js|_next/static|_next/image|favicon.ico).*)'
  ]
}
