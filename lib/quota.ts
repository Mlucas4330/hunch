import { and, count, desc, eq, gt, gte, isNull, or } from 'drizzle-orm'
import { db } from '@/db'
import { analysisRuns, users } from '@/db/schema'
import { PLAN } from '@/lib/constants'
import { monthStart, type Quota } from '@/lib/quota-math'
import { entitledTierFor } from '@/lib/subscriptions'

// The sums live in lib/quota-math.ts so they can be tested without a database, and are re-exported
// here because every call site wants them beside the query that produced the numbers.
export { quotaLeft, type Quota } from '@/lib/quota-math'

/**
 * The account's quota, how many runs it started this month, and what is left of its trial. Read from
 * the rows on every call and never from the session. A run that failed does not count; a run whose
 * analysis was deleted still does.
 *
 * **A subscription that has run out drops the limit to zero here, and no scheduled job is involved.**
 * The row is read per request anyway, so reading the entitlement beside it is what makes a cancelled
 * account lose its quota the moment the month it paid for ends, rather than whenever a cron next
 * happened to run. An account an operator provisioned by hand has no subscription row and keeps
 * whatever the operator wrote. See docs/invariants.md.
 */
export async function quotaFor(userId: string): Promise<Quota> {
  const [[row], [usage], entitled] = await Promise.all([
    db
      .select({
        limit: users.monthlyQuota,
        trial: users.trialRunsLeft,
        tier: users.planTier
      })
      .from(users)
      .where(eq(users.id, userId)),
    db
      .select({ used: count() })
      .from(analysisRuns)
      .where(
        and(
          eq(analysisRuns.userId, userId),
          gte(analysisRuns.createdAt, monthStart()),
          isNull(analysisRuns.failedAt)
        )
      ),
    entitledTierFor(userId)
  ])

  const subscribed = row?.tier != null
  const limit = subscribed && !entitled ? 0 : (row?.limit ?? 0)

  return { limit, used: usage?.used ?? 0, trial: row?.trial ?? 0 }
}

/**
 * Sets an account's monthly quota, creating the row when nobody has signed in with that address yet.
 * `name: email` is the whole provisioning record; the first sign-in fills in the person. See
 * docs/invariants.md.
 */
export async function setQuota(email: string, limit: number): Promise<void> {
  const address = email.trim().toLowerCase()

  await db
    .insert(users)
    .values({ email: address, name: address, monthlyQuota: limit })
    .onConflictDoUpdate({ target: users.email, set: { monthlyQuota: limit } })
}

/**
 * Writes what a confirmed subscription bought: the tier, and the quota that tier carries.
 *
 * **An absolute write, never an increment.** That is what makes it safe for a webhook delivered
 * twice: applying the same authorisation again lands on the same number. See docs/invariants.md.
 *
 * It updates by id and never inserts, because a row keyed on an email may only be created by
 * something that has seen the address verified.
 */
export async function applySubscribedTier(
  userId: string,
  tier: keyof typeof PLAN
): Promise<void> {
  await db
    .update(users)
    .set({ planTier: tier, monthlyQuota: PLAN[tier].quota })
    .where(eq(users.id, userId))
}

export type AccountQuota = { email: string; limit: number; used: number; trial: number }

// Every account with something to spend, for the operator screen, with this month's usage beside it.
// Trial-only accounts are included: they can run analyses, so an operator has to be able to see them.
export async function listAccountQuotas(): Promise<AccountQuota[]> {
  const rows = await db
    .select({ id: users.id, email: users.email, limit: users.monthlyQuota })
    .from(users)
    .where(or(gt(users.monthlyQuota, 0), gt(users.trialRunsLeft, 0)))
    .orderBy(desc(users.createdAt))

  return Promise.all(
    rows.map(async (row) => {
      const quota = await quotaFor(row.id)
      return { email: row.email, limit: quota.limit, used: quota.used, trial: quota.trial }
    })
  )
}
