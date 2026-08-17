import Google from 'next-auth/providers/google'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'
import type { NextAuthConfig } from 'next-auth'
import { microsoftLoginAllowed } from '@/lib/auth-policy'
import { ENTRA_ISSUER, SESSION_MAX_AGE_SECONDS } from '@/lib/constants'

export const authConfig = {
  providers: [
    Google,
    ...(microsoftLoginAllowed()
      ? [MicrosoftEntraID({ issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ?? ENTRA_ISSUER })]
      : [])
  ],
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: '/auth/signin' }
} satisfies NextAuthConfig
