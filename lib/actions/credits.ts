'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { grantCredits } from '@/lib/credits'
import { getCurrentUser } from '@/lib/current-user'
import { isAdmin } from '@/lib/auth-policy'
import { ADMIN_CREDITS_PATH, ADMIN_PROVIDER, ADMIN_GRANT_MAX } from '@/lib/constants'

/**
 * An operator handing credits over with no payment behind them.
 *
 * **It goes through `grantCredits` like every other source, and touches neither table itself.** That
 * is the rule the whole billing side is built on — see docs/invariants.md — and an operator screen is
 * exactly the place it would be tempting to break, because `update users set credits = ...` is one
 * line and leaves no ledger row behind.
 *
 * **The role is re-checked here, not inherited from the page that rendered the form.** A server
 * action is a public POST endpoint that happens to be written next to a component: anyone who knows
 * the action id can call it, so the page's own check protects the page and nothing else.
 */

const GrantSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  // Bounded because a typo in this field is the difference between ten credits and ten thousand, and
  // there is no undo -- `grantCredits` has no inverse.
  credits: z.coerce.number().int().positive().max(ADMIN_GRANT_MAX)
})

export type GrantState = { ok: boolean; message: string } | null

export async function grantCreditsAction(
  _previous: GrantState,
  formData: FormData
): Promise<GrantState> {
  const user = await getCurrentUser()
  if (!isAdmin(user)) return { ok: false, message: 'forbidden' }

  const parsed = GrantSchema.safeParse({
    email: formData.get('email'),
    credits: formData.get('credits')
  })

  if (!parsed.success) return { ok: false, message: 'invalid' }

  // A fresh reference per submission, so the idempotency key never collides with a real payment's
  // and two deliberate grants of the same size both land. It does mean a resubmitted form grants
  // twice -- which is what an operator pressing the button twice means, and why the button reports
  // the round trip it is in rather than sitting there looking untouched.
  const result = await grantCredits({
    email: parsed.data.email,
    credits: parsed.data.credits,
    provider: ADMIN_PROVIDER,
    providerRef: randomUUID(),
    reason: 'grant'
  })

  if (!result.granted) return { ok: false, message: 'failed' }

  revalidatePath(ADMIN_CREDITS_PATH)
  revalidatePath('/dashboard')

  return { ok: true, message: 'granted' }
}
