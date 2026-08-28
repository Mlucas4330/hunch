import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { creditTransactions, users } from '@/db/schema'
import { GCLID_MAX_AGE_SECONDS } from '@/lib/constants'
import type { CreditReason } from '@/lib/enums'
import { googleAdsEnabled, uploadClickConversion } from '@/lib/google-ads'
import { log } from '@/lib/log'

/**
 * Everything that moves a balance goes through this file, and **no provider code ever touches the
 * two tables directly.**
 *
 * That is the load-bearing decision of this phase, and it is not tidiness. Stripe may not be able to
 * charge in BRL without a registered company, which makes a second provider a matter of when rather
 * than if. Written the other way round — a webhook that knows how to add credits — plugging the
 * second one in means reimplementing idempotency, row creation and the ledger a second time, and the
 * two copies drift the first time one is fixed.
 *
 * A provider adapter's whole job is: verify the payment is real, work out how many credits it bought,
 * and call `grantCredits`.
 */

export type Grant = {
  email: string
  credits: number
  provider: string
  /** The provider's own id for this payment. The idempotency key, so it must be stable per payment. */
  providerRef: string
  /**
   * Why the balance moved. Defaults to `purchase` because every payment adapter means that and none
   * of them should have to say so; an operator granting by hand passes `grant`, which is the only
   * other way credits are created. See docs/invariants.md.
   */
  reason?: Extract<CreditReason, 'purchase' | 'grant'>
  /**
   * What the buyer paid, in BRL, for reporting the sale to Google Ads. Omitted by the paths where
   * there is no amount to report -- a hand grant, and the e2e setup -- and a grant with no amount
   * reports nothing rather than reporting a zero.
   */
  amountBrl?: number
}

export type GrantResult = { granted: boolean; duplicate: boolean }

/**
 * Stores the Google Ads click the buyer arrived on, ahead of a payment.
 *
 * Last click wins, which is both the simple answer and the one Google's own default attribution
 * reports. The timestamp is what later decides whether the click is still inside the conversion
 * window -- see `reportConversion`.
 */
export async function rememberAdClick(userId: string, gclid: string): Promise<void> {
  await db.update(users).set({ gclid, gclidAt: new Date() }).where(eq(users.id, userId))
}

/**
 * Tells Google Ads that a click it sent turned into a paid sale.
 *
 * **It lives here rather than in the two webhooks because this is the one place that knows a payment
 * really landed.** The Mercado Pago pack route, the renewal route and the Stripe route all end at
 * `grantCredits`, so reporting from each of them would be the same code written three times, and the
 * first one fixed would be the moment the three started disagreeing -- the same reasoning that put
 * every balance movement in this file. It also means the report is gated on the ledger's own
 * idempotency: it runs only when a row was actually claimed, so a re-delivered webhook cannot report
 * a second conversion for one payment.
 *
 * **Nothing it does can fail the payment.** It is awaited rather than left dangling -- a serverless
 * invocation can be frozen the moment the response is returned, which would drop the upload silently
 * -- but every failure is logged and swallowed. A conversion Google never recorded is a reporting
 * gap; a webhook that answers 500 is a payment Mercado Pago retries.
 */
async function reportConversion(grant: Grant, userId: string): Promise<void> {
  if (grant.reason === 'grant' || !grant.amountBrl || !googleAdsEnabled()) return

  try {
    const row = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { gclid: true, gclidAt: true }
    })

    // Most buyers never came from an ad, so this is the ordinary path and not a failure. A click
    // past the window is treated the same way: Google refuses it, so sending it would only turn a
    // quiet skip into a logged error.
    const expired =
      !row?.gclidAt || Date.now() - row.gclidAt.getTime() > GCLID_MAX_AGE_SECONDS * 1000

    if (!row?.gclid || expired) {
      log.info('ads.conversion_skipped', {
        provider: grant.provider,
        providerRef: grant.providerRef,
        reason: row?.gclid ? 'click_expired' : 'no_click'
      })
      return
    }

    await uploadClickConversion({
      gclid: row.gclid,
      valueBrl: grant.amountBrl,
      orderId: grant.providerRef,
      at: new Date()
    })

    log.info('ads.conversion_uploaded', {
      provider: grant.provider,
      providerRef: grant.providerRef,
      valueBrl: grant.amountBrl
    })
  } catch (error) {
    log.error('ads.conversion_failed', error, {
      provider: grant.provider,
      providerRef: grant.providerRef
    })
  }
}

/**
 * Credits an account for a confirmed payment, creating the row when nobody has signed in yet.
 *
 * **Idempotent on `(provider, provider_ref)`**, enforced by a unique index rather than by checking
 * first: a webhook is delivered more than once by design, and two deliveries racing each other would
 * both pass a read-then-write check. The insert either claims the pair or conflicts, and only the
 * claim moves the balance.
 */
export async function grantCredits(grant: Grant): Promise<GrantResult> {
  const email = grant.email.trim().toLowerCase()
  if (!email || grant.credits <= 0) return { granted: false, duplicate: false }

  const { result, userId } = await db.transaction(async (tx) => {
    // The buyer may have no account: they paid from a checkout link and have never opened the app.
    // The row is created holding the credits, and their first sign-in fills in the person — see
    // docs/invariants.md. `name: email` is the whole provisioning record.
    const [user] = await tx
      .insert(users)
      .values({ email, name: email })
      .onConflictDoUpdate({ target: users.email, set: { email } })
      .returning({ id: users.id })

    const claimed = await tx
      .insert(creditTransactions)
      .values({
        userId: user.id,
        delta: grant.credits,
        reason: grant.reason ?? 'purchase',
        provider: grant.provider,
        providerRef: grant.providerRef
      })
      .onConflictDoNothing()
      .returning({ id: creditTransactions.id })

    if (claimed.length === 0) {
      return { result: { granted: false, duplicate: true }, userId: user.id }
    }

    await tx
      .update(users)
      .set({ credits: sql`${users.credits} + ${grant.credits}` })
      .where(eq(users.id, user.id))

    return { result: { granted: true, duplicate: false }, userId: user.id }
  })

  // Outside the transaction on purpose: an outbound HTTP call inside one holds a Postgres connection
  // open for the length of someone else's API, and a rollback would not un-send it anyway.
  if (result.granted) await reportConversion(grant, userId)

  return result
}

/**
 * Spends one credit, and refuses rather than going negative.
 *
 * The conditional update is the whole guard: `credits > 0` is evaluated by Postgres inside the
 * statement, so two requests racing to spend the last one cannot both win. Checking the balance in
 * application code first and then updating would let exactly that happen.
 */
export async function spendCredit(
  userId: string,
  analysisId: string
): Promise<{ spent: boolean }> {
  return db.transaction(async (tx) => {
    const spent = await tx
      .update(users)
      .set({ credits: sql`${users.credits} - 1` })
      .where(and(eq(users.id, userId), sql`${users.credits} > 0`))
      .returning({ id: users.id })

    if (spent.length === 0) return { spent: false }

    await tx.insert(creditTransactions).values({
      userId,
      delta: -1,
      reason: 'unlock' satisfies CreditReason,
      analysisId
    })

    return { spent: true }
  })
}

/**
 * Puts a spent credit back when the work it paid for could not be delivered.
 *
 * This exists because `AnalysisOutputSchema` has a `.min(5)` that deliberately does **not** degrade,
 * so a model that returns four hypotheses throws away a generation call that was already paid for.
 * That is the right call for correctness and the wrong outcome for a customer, so the credit returns.
 */
export async function refundCredit(userId: string, analysisId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ credits: sql`${users.credits} + 1` })
      .where(eq(users.id, userId))

    await tx.insert(creditTransactions).values({
      userId,
      delta: 1,
      reason: 'refund' satisfies CreditReason,
      analysisId
    })
  })
}

/**
 * The balance, read from the row. **Never cached in the session** — see docs/invariants.md.
 */
export async function creditsFor(userId: string): Promise<number> {
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { credits: true }
  })

  return row?.credits ?? 0
}

export type GrantRecord = {
  email: string
  credits: number
  at: Date
}

/**
 * The hand grants, newest first, for the operator screen.
 *
 * Reads `reason = 'grant'` rather than `provider = ADMIN_PROVIDER`, because the reason is the thing
 * that means "nobody paid for this" and the provider is only how it got here. It is the audit trail
 * that justified giving the reason its own enum value at all -- a grant that nothing ever shows is a
 * grant nobody reviews.
 */
export async function recentGrants(limit: number): Promise<GrantRecord[]> {
  const rows = await db
    .select({
      email: users.email,
      credits: creditTransactions.delta,
      at: creditTransactions.createdAt
    })
    .from(creditTransactions)
    .innerJoin(users, eq(users.id, creditTransactions.userId))
    .where(eq(creditTransactions.reason, 'grant'))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit)

  return rows
}
