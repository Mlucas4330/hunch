import NextAuth from 'next-auth'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { authConfig } from '@/auth.config'
import type { SubscriptionPlan } from '@/lib/enums'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false

      const existing = await db.query.users.findFirst({
        where: eq(users.email, user.email)
      })

      if (!existing) {
        await db.insert(users).values({
          email: user.email,
          name: user.name ?? user.email,
          avatarUrl: user.image ?? null
        })
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
