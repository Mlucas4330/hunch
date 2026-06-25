import Google from 'next-auth/providers/google'
import type { NextAuthConfig } from 'next-auth'

// Edge-safe config (no DB imports) -- shared by middleware and the full server config.
export const authConfig = {
  providers: [Google],
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/signin' }
} satisfies NextAuthConfig
