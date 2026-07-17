import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { authConfig } from '@/auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: {},
        password: {}
      },
      async authorize(credentials) {
        const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env

        if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return null
        if (credentials.email !== ADMIN_EMAIL || credentials.password !== ADMIN_PASSWORD) {
          return null
        }

        const existing = await db.query.users.findFirst({
          where: eq(users.email, ADMIN_EMAIL)
        })

        if (!existing) {
          await db.insert(users).values({
            email: ADMIN_EMAIL,
            name: 'Admin'
          })
        }

        return { email: ADMIN_EMAIL, name: 'Admin' }
      }
    })
  ],
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
