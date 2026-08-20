import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { authConfig } from '@/auth.config'
import { clientIp, enforceRateLimit } from '@/lib/rate-limit'
import { secretsMatch } from '@/lib/secure-compare'
import { credentialsLoginAllowed, isAdminEmail, verifiedEmailFor } from '@/lib/auth-policy'
import { ADMIN_ROLE, DEFAULT_USER_ROLE } from '@/lib/constants'

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
          .values({ email: ADMIN_EMAIL, name: 'Admin', role: ADMIN_ROLE })
          .onConflictDoUpdate({ target: users.email, set: { role: ADMIN_ROLE } })

        return { email: ADMIN_EMAIL, name: 'Admin' }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      const isOAuth = account?.type === 'oauth' || account?.type === 'oidc'

      // **The address the provider vouches for is the one that keys the row**, not the one the
      // profile happened to carry. They are the same for Google and can differ for GitHub, whose
      // `profile.email` is null when the account keeps it private while a verified primary address
      // exists on the account. Using the profile's would key the row on an address nobody verified.
      if (isOAuth) {
        const verified = await verifiedEmailFor(account, profile)
        if (!verified) return false
        user.email = verified
      }

      if (!user.email) return false

      const name = user.name ?? user.email
      const avatarUrl = user.image ?? null
      const lastSignInAt = new Date()

      // Promotes, never demotes: the role outlives a changed ADMIN_EMAIL and a hand-granted admin
      // survives their next sign-in. See docs/invariants.md.
      const grantedRole = isAdminEmail(user.email) ? ADMIN_ROLE : undefined

      if (isOAuth) {
        await db
          .insert(users)
          .values({
            email: user.email,
            name,
            avatarUrl,
            role: grantedRole ?? DEFAULT_USER_ROLE,
            lastSignInAt
          })
          .onConflictDoUpdate({
            target: users.email,
            set: {
              name,
              lastSignInAt,
              ...(avatarUrl ? { avatarUrl } : {}),
              ...(grantedRole ? { role: grantedRole } : {})
            }
          })
      } else {
        await db
          .insert(users)
          .values({ email: user.email, name, avatarUrl, lastSignInAt })
          .onConflictDoUpdate({ target: users.email, set: { lastSignInAt } })
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
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    }
  }
})
