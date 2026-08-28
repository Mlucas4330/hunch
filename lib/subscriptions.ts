import { and, eq, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { analyses, pageSnapshots, subscriptions, users } from '@/db/schema'
import { REMEASURE_BATCH_MAX, REMEASURE_MIN_AGE_MS } from '@/lib/constants'
import type { SubscriptionStatus } from '@/lib/enums'

/**
 * The subscription's own half: what state an authorisation is in, and which pages that entitles.
 *
 * **Nothing here moves a balance, and nothing here may start to.** A renewal's credits are added by
 * `grantCredits` exactly like a purchase, so there is one path that writes `users.credits` and one
 * ledger that explains every row in it -- see docs/invariants.md. What this file owns is the other
 * half of what was bought: being measured again, on a schedule.
 */

/**
 * Records what the provider says about an authorisation.
 *
 * Upserts on `(provider, provider_ref)` because the two deliveries that matter arrive in an order
 * nobody controls: the redirect back from the checkout and the webhook announcing the same
 * authorisation can land in either sequence, and both must converge on one row.
 */
export async function recordSubscription(record: {
  userId: string
  provider: string
  providerRef: string
  status: SubscriptionStatus
  currentPeriodEnd?: Date | null
}): Promise<void> {
  await db
    .insert(subscriptions)
    .values({
      userId: record.userId,
      provider: record.provider,
      providerRef: record.providerRef,
      status: record.status,
      currentPeriodEnd: record.currentPeriodEnd ?? null
    })
    .onConflictDoUpdate({
      target: [subscriptions.provider, subscriptions.providerRef],
      set: {
        status: record.status,
        currentPeriodEnd: record.currentPeriodEnd ?? null,
        updatedAt: new Date()
      }
    })
}

/**
 * Whether this person's pages are being watched.
 *
 * `authorized` is the only status that entitles anything. `pending` is someone who started a
 * checkout and never finished it, and reading it as active would sweep pages nobody has paid for.
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const row = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'authorized')),
    columns: { id: true }
  })

  return row !== undefined
}

export type SubscriptionRecord = {
  providerRef: string
  status: SubscriptionStatus
  currentPeriodEnd: Date | null
}

/**
 * This person's subscription, whatever state it is in.
 *
 * Separate from `hasActiveSubscription` because a screen has to render more than a boolean: a row
 * that says `cancelled` until a period end is a different sentence from no row at all, and the
 * dashboard has to be able to tell them apart.
 *
 * Newest first, so someone who cancelled and subscribed again reads as subscribed.
 */
export async function subscriptionFor(userId: string): Promise<SubscriptionRecord | null> {
  const row = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    columns: { providerRef: true, status: true, currentPeriodEnd: true }
  })

  return row ?? null
}

export type DueAnalysis = { id: string; url: string; email: string }

/**
 * The pages an active subscriber owns that nobody has measured recently.
 *
 * **The filter is the subscription, and that is the whole cost control.** The sweep opens a real
 * browser against a customer's own site and shares `SCRAPE_MAX_CONCURRENT_PAGES` with everyone
 * waiting on a live analysis, so it runs only for pages somebody is paying to have watched. The
 * version of this that existed before the pivot filtered on a `users.plan` column, and it was
 * deleted along with plans precisely because a sweep with no subscription behind it is browser time
 * nobody asked for. The argument inverts cleanly now that one exists again.
 *
 * `REMEASURE_BATCH_MAX` is a cost ceiling rather than a page size: what does not fit waits for
 * tomorrow's run, which is the correct behaviour for work nobody is watching a spinner for.
 *
 * **A cancellation stops the next charge, not the month already paid for.** So `cancelled` still
 * sweeps while `current_period_end` is in the future: cutting it the moment someone cancels would
 * take back weeks they have already been billed for, which is the kind of detail that turns a
 * cancellation into a chargeback. A null period end never sweeps -- that is a preapproval that was
 * never charged, so there is no paid month to honour.
 */
export async function analysesDueForRemeasure(): Promise<DueAnalysis[]> {
  const cutoff = new Date(Date.now() - REMEASURE_MIN_AGE_MS)

  return db
    .select({ id: analyses.id, url: analyses.url, email: users.email })
    .from(analyses)
    .innerJoin(users, eq(users.id, analyses.userId))
    .innerJoin(
      subscriptions,
      and(
        eq(subscriptions.userId, users.id),
        or(
          eq(subscriptions.status, 'authorized'),
          and(
            eq(subscriptions.status, 'cancelled'),
            sql`${subscriptions.currentPeriodEnd} > now()`
          )
        )
      )
    )
    .where(
      sql`coalesce((select max(${pageSnapshots.capturedAt}) from ${pageSnapshots} where ${pageSnapshots.analysisId} = ${analyses.id}), ${analyses.createdAt}) < ${cutoff}`
    )
    .orderBy(analyses.createdAt)
    .limit(REMEASURE_BATCH_MAX)
}
