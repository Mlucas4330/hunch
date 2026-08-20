import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import { CALLBACK_URL_PARAM, PROTECTED_PREFIXES } from '@/lib/constants'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname, search } = req.nextUrl
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (isProtected && !req.auth) {
    const signInUrl = new URL('/auth/signin', req.nextUrl.origin)
    signInUrl.searchParams.set(CALLBACK_URL_PARAM, `${pathname}${search}`)
    return Response.redirect(signInUrl)
  }
})

export const config = {
  matcher: [
    '/((?!api/health|api/billing/webhook|api/billing/mercadopago/webhook|api/auth|api/cron|api/report|screenshots|_next/static|_next/image|favicon.ico).*)'
  ]
}
