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
        if (!credentialsLoginAllowed()) return null

        const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env

        if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return null

        if (await enforceRateLimit('signin', clientIp(request))) return null

        const email = typeof credentials.email === 'string' ? credentials.email : ''
        const password = typeof credentials.password === 'string' ? credentials.password : ''

        if (!secretsMatch(email, ADMIN_EMAIL) || !secretsMatch(password, ADMIN_PASSWORD)) {
          return null
        }

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

      const isOAuth = account?.type === 'oauth' || account?.type === 'oidc'
      if (isOAuth && profile?.email_verified !== true) return false

      const name = user.name ?? user.email
      const avatarUrl = user.image ?? null

      if (isOAuth) {
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
