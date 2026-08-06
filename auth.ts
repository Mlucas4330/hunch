import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { authConfig } from '@/auth.config'
import { clientIp, enforceRateLimit } from '@/lib/rate-limit'
import { secretsMatch } from '@/lib/secure-compare'
import { credentialsLoginAllowed } from '@/lib/auth-policy'
import type { SubscriptionPlan } from '@/lib/enums'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: {},
        password: {}
      },
      async authorize(credentials, request) {
        // Local/e2e escape hatch only, behind two independent gates -- see lib/auth-policy.ts.
        if (!credentialsLoginAllowed()) return null

        const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env

        if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return null

        if (await enforceRateLimit('signin', clientIp(request))) return null

        const email = typeof credentials.email === 'string' ? credentials.email : ''
        const password = typeof credentials.password === 'string' ? credentials.password : ''

        if (!secretsMatch(email, ADMIN_EMAIL) || !secretsMatch(password, ADMIN_PASSWORD)) {
          return null
        }

        // One statement rather than read-then-write: two concurrent sign-ins would otherwise both
        // see no row and race into the email unique constraint.
        await db
          .insert(users)
          .values({ email: ADMIN_EMAIL, name: 'Admin', plan: 'solo' })
          .onConflictDoUpdate({ target: users.email, set: { plan: 'solo' } })

        return { email: ADMIN_EMAIL, name: 'Admin' }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false

      // A user row is keyed on email and there is no `accounts` table, so this claim is the only
      // thing between a provider's assertion and an existing row. It fails closed: an absent claim
      // is treated as unverified, because "the provider did not say the address is verified" and
      // "the provider said it is not" carry exactly the same risk here. Google's profile types
      // `email_verified` as a required boolean, so this costs a real sign-in nothing.
      const isOAuth = account?.type === 'oauth' || account?.type === 'oidc'
      if (isOAuth && profile?.email_verified !== true) return false

      const name = user.name ?? user.email
      const avatarUrl = user.image ?? null

      // Upserted in one statement rather than read-then-write: two concurrent first sign-ins would
      // otherwise both see no row and race into the email unique constraint, failing a valid login.
      if (isOAuth) {
        // The provider owns the display name and photo, so a user who changes either at Google sees
        // it on their next sign in. `plan`, the usage counters and the Stripe ids are ours and are
        // never touched here. A missing photo leaves the stored one alone rather than blanking it --
        // the provider omitting a field is not the user clearing it.
        await db
          .insert(users)
          .values({ email: user.email, name, avatarUrl })
          .onConflictDoUpdate({
            target: users.email,
            set: avatarUrl ? { name, avatarUrl } : { name }
          })
      } else {
        await db.insert(users).values({ email: user.email, name, avatarUrl }).onConflictDoNothing()
      }

      return true
    },
    async jwt({ token, user }) {
      const email = user?.email ?? token.email
      if (!email) return token

      const dbUser = await db.query.users.findFirst({
        where: eq(users.email, email)
      })

      if (dbUser) {
        token.id = dbUser.id
        token.plan = dbUser.plan
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.plan = token.plan as SubscriptionPlan
      }
      return session
    }
  }
})
