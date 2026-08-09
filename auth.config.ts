import Google from 'next-auth/providers/google'
import type { NextAuthConfig } from 'next-auth'
import { SESSION_MAX_AGE_SECONDS } from '@/lib/constants'

export const authConfig = {
  providers: [Google],
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: '/auth/signin' }
} satisfies NextAuthConfig
