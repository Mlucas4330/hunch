import { and, eq, gt, or } from 'drizzle-orm'
import { db } from '@/db'
import { subscriptions } from '@/db/schema'
import type { PlanTier, SubscriptionStatus } from '@/lib/enums'

/**
 * What the provider says about an authorisation, and what that entitles.
 *
 * **Nothing here writes a quota.** `applySubscribedTier` in lib/quota.ts is the one path that moves
 * what an account may run, so there is one writer rather than two that have to agree. What this file
 * owns is the other half: whether the authorisation behind it is still live.
 */

export async function recordSubscription(record: {
  userId: string
  provider: string
  providerRef: string
  status: SubscriptionStatus
  tier?: PlanTier | null
  currentPeriodEnd?: Date | null
}): Promise<void> {
  await db
    .insert(subscriptions)
    .values({
      userId: record.userId,
      provider: record.provider,
      providerRef: record.providerRef,
      status: record.status,
      tier: record.tier ?? null,
      currentPeriodEnd: record.currentPeriodEnd ?? null
    })
    .onConflictDoUpdate({
      target: [subscriptions.provider, subscriptions.providerRef],
      set: {
        status: record.status,
        tier: record.tier ?? null,
        currentPeriodEnd: record.currentPeriodEnd ?? null,
        updatedAt: new Date()
      }
    })
}

export type SubscriptionRecord = {
  providerRef: string
  status: SubscriptionStatus
  tier: PlanTier | null
  currentPeriodEnd: Date | null
}

/**
 * This account's subscription, whatever state it is in.
 *
 * Newest first, so somebody who cancelled and subscribed again reads as subscribed. A screen needs
 * more than a boolean: a row that says cancelled until a period end is a different sentence from no
 * row at all.
 */
export async function subscriptionFor(userId: string): Promise<SubscriptionRecord | null> {
  const row = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    columns: { providerRef: true, status: true, tier: true, currentPeriodEnd: true }
  })

  return row ?? null
}

/**
 * The tier this account is entitled to right now, or null.
 *
 * Two states entitle: `authorized`, and `cancelled` while the month already paid for has not ended.
 * The second one is the whole reason `current_period_end` is kept rather than cleared on cancel.
 * `pending` entitles nothing, because it is somebody who opened a checkout and walked away.
 */
export async function entitledTierFor(userId: string): Promise<PlanTier | null> {
  const row = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, userId),
      or(
        eq(subscriptions.status, 'authorized'),
        and(
          eq(subscriptions.status, 'cancelled'),
          gt(subscriptions.currentPeriodEnd, new Date())
        )
      )
    ),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    columns: { tier: true }
  })

  return row?.tier ?? null
}
