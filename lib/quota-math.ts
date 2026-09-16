export type Quota = { limit: number; used: number; trial: number }

/**
 * The arithmetic of a quota, with nothing behind it.
 *
 * Pure by necessity, the same way lib/snapshots.ts is: the queries live in lib/quota.ts, and keeping
 * the sums here is what lets them be tested without a database.
 */

// The first instant of the current calendar month, in UTC. A quota that reset at a local midnight
// would reset at a different instant for every account. See docs/invariants.md.
export function monthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

/**
 * What this account may still run: the trial credit plus whatever is left of the month.
 *
 * **The trial is beside the monthly allowance, never part of it.** That is what lets an account with
 * no quota at all run its first analyses, and what keeps an overdrawn month from eating a credit
 * that was never monthly.
 */
export function quotaLeft(quota: Quota): number {
  return quota.trial + Math.max(0, quota.limit - quota.used)
}
