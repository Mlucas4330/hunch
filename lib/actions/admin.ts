'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db'
import { users } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { isAdmin } from '@/lib/auth-policy'
import { ADMIN_ACCOUNTS_PATH } from '@/lib/constants'
import { SUBSCRIPTION_PLAN } from '@/lib/enums'

const GrantSchema = z.object({
  email: z.string().email(),
  plan: z.enum(SUBSCRIPTION_PLAN)
})

// A server action is its own endpoint, so it authorizes itself rather than trusting the layout.
export async function grantPlan(formData: FormData) {
  const user = await getCurrentUser()
  if (!isAdmin(user)) return

  const parsed = GrantSchema.safeParse({
    email: String(formData.get('email') ?? '')
      .trim()
      .toLowerCase(),
    plan: formData.get('plan')
  })
  if (!parsed.success) return

  const { email, plan } = parsed.data

  await db
    .insert(users)
    .values({ email, name: email, plan })
    .onConflictDoUpdate({ target: users.email, set: { plan } })

  revalidatePath(ADMIN_ACCOUNTS_PATH)
}
