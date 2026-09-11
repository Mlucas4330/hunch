'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { setQuota } from '@/lib/quota'
import { getCurrentUser } from '@/lib/current-user'
import { isAdmin } from '@/lib/auth-policy'
import { ADMIN_ACCOUNTS_PATH, ADMIN_QUOTA_MAX } from '@/lib/constants'

/**
 * An operator setting an account's monthly quota.
 *
 * **The role is re-checked here, not inherited from the page that rendered the form.** A server
 * action is a public POST endpoint that happens to be written next to a component. See
 * docs/invariants.md.
 */

const QuotaSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  quota: z.coerce.number().int().min(0).max(ADMIN_QUOTA_MAX)
})

export type QuotaState = { ok: boolean; message: 'saved' | 'invalid' | 'forbidden' | 'failed' } | null

export async function setQuotaAction(_previous: QuotaState, formData: FormData): Promise<QuotaState> {
  const user = await getCurrentUser()
  if (!isAdmin(user)) return { ok: false, message: 'forbidden' }

  const parsed = QuotaSchema.safeParse({
    email: formData.get('email'),
    quota: formData.get('quota')
  })

  if (!parsed.success) return { ok: false, message: 'invalid' }

  try {
    await setQuota(parsed.data.email, parsed.data.quota)
  } catch (error) {
    console.error('[admin] quota not saved', error)
    return { ok: false, message: 'failed' }
  }

  revalidatePath(ADMIN_ACCOUNTS_PATH)
  revalidatePath('/dashboard')

  return { ok: true, message: 'saved' }
}
