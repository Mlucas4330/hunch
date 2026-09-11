import { and, count, desc, eq, gt, gte, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { analysisRuns, users } from '@/db/schema'

export type Quota = { limit: number; used: number }

// The first instant of the current calendar month, in UTC. See docs/invariants.md.
export function monthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

/**
 * The account's quota and how many runs it started this month, read from the rows on every call and
 * never from the session. A run that failed does not count; a run whose analysis was deleted still
 * does.
 */
export async function quotaFor(userId: string): Promise<Quota> {
  const [[row], [usage]] = await Promise.all([
    db.select({ limit: users.monthlyQuota }).from(users).where(eq(users.id, userId)),
    db
      .select({ used: count() })
      .from(analysisRuns)
      .where(
        and(
          eq(analysisRuns.userId, userId),
          gte(analysisRuns.createdAt, monthStart()),
          isNull(analysisRuns.failedAt)
        )
      )
  ])

  return { limit: row?.limit ?? 0, used: usage?.used ?? 0 }
}

export function quotaLeft(quota: Quota): number {
  return Math.max(0, quota.limit - quota.used)
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

export type AccountQuota = { email: string; limit: number; used: number }

// Every account with a quota, for the operator screen, with this month's usage beside it.
export async function listAccountQuotas(): Promise<AccountQuota[]> {
  const rows = await db
    .select({ id: users.id, email: users.email, limit: users.monthlyQuota })
    .from(users)
    .where(gt(users.monthlyQuota, 0))
    .orderBy(desc(users.createdAt))

  return Promise.all(
    rows.map(async (row) => ({ email: row.email, limit: row.limit, used: (await quotaFor(row.id)).used }))
  )
}
