import Google from 'next-auth/providers/google'
import type { NextAuthConfig } from 'next-auth'
import { SESSION_MAX_AGE_SECONDS } from '@/lib/constants'

// Edge-safe config (no DB imports) -- shared by middleware and the full server config.
export const authConfig = {
  providers: [Google],
  // A JWT session cannot be revoked server-side, so its lifetime is the only bound on a stolen
  // token. The default 30 days is far longer than this app needs.
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: '/auth/signin' }
} satisfies NextAuthConfig
