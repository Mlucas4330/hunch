import { cache } from 'react'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/db'
import { users, type User } from '@/db/schema'

// Memoized per request. `auth()` is not itself cached and the `jwt` callback queries `users` on every
// token decode, so an uncached helper cost one query per caller -- and a signed-in page render has
// several (the navbar, the page, anything else needing the plan). Every caller is a server component
// or route handler inside one request, which is exactly the scope `cache()` covers.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id)
  })

  return user ?? null
})
