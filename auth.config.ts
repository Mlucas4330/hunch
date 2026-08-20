import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import type { NextAuthConfig } from 'next-auth'
import { githubLoginAllowed } from '@/lib/auth-policy'
import { GITHUB_SCOPE, SESSION_MAX_AGE_SECONDS } from '@/lib/constants'

export const authConfig = {
  providers: [
    Google,
    // The scope is spelled out because the default does not include `user:email`, and without it the
    // endpoint that verifies the address answers 403 -- so every GitHub login would be refused, for a
    // reason nothing in the failure would name. See docs/security.md.
    ...(githubLoginAllowed()
      ? [GitHub({ authorization: { params: { scope: GITHUB_SCOPE } } })]
      : [])
  ],
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: '/auth/signin' }
} satisfies NextAuthConfig
