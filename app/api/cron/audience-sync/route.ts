import { NextResponse } from 'next/server'
import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { creditTransactions, leads, users } from '@/db/schema'
import { authorizeCron } from '@/lib/cron-auth'
import { audienceEnabled, syncAudience } from '@/lib/google-ads-audience'
import { log } from '@/lib/log'

export const runtime = 'nodejs'

/**
 * Keeps the two Customer Match lists in step with the database.
 *
 * **Buyers exist to be excluded**, so the campaign stops paying for clicks from people who already
 * bought. **Leads exist to be targeted**, and they are the only reason the address was worth
 * collecting beyond one mail.
 *
 * Two rules decide who is in, and both are enforced by the query rather than remembered:
 *
 * - **`consented_at` must be set.** The form promised one mail and nothing else until it was
 *   rewritten to say what actually happens. A null is a promise made before that, and it is honoured
 *   by leaving the row out. See docs/ads.md.
 * - **An unsubscribed lead is out.** Asking to stop hearing from us covers the ads too. Since
 *   `syncAudience` replaces the whole membership, leaving is one run rather than a deletion nobody
 *   would remember to write.
 *
 * Nothing but a SHA-256 digest reaches Google. See lib/google-ads-audience.ts.
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!audienceEnabled()) return NextResponse.json({ synced: 0, reason: 'ads_unset' })

  // A purchase, not a hand grant and not a refund: `grant` rows are comped accounts, and training an
  // audience on them is the same mistake as reporting them as conversions. See docs/ads.md.
  const buyers = await db
    .selectDistinct({ email: users.email })
    .from(creditTransactions)
    .innerJoin(users, eq(users.id, creditTransactions.userId))
    .where(eq(creditTransactions.reason, 'purchase'))

  const buyerEmails = new Set(buyers.map((row) => row.email.toLowerCase()))

  const consented = await db
    .selectDistinct({ email: leads.email })
    .from(leads)
    .where(and(isNotNull(leads.consentedAt), isNull(leads.unsubscribedAt)))

  // Somebody who bought belongs in one list, not in both: leaving them in the lead list would target
  // the person the buyer list exists to exclude.
  const leadEmails = consented
    .map((row) => row.email)
    .filter((email) => !buyerEmails.has(email.toLowerCase()))

  const results: Record<string, number> = {}

  for (const [list, emails] of [
    ['buyers', buyers.map((row) => row.email)],
    ['leads', leadEmails]
  ] as const) {
    try {
      results[list] = await syncAudience(list, emails)
      log.info('ads.audience_synced', { list, members: results[list] })
    } catch (error) {
      // A list that stopped growing is a targeting gap. It must not take the other list down with
      // it, and it must never become a cron failure that hides the ones that matter.
      results[list] = -1
      log.error('ads.audience_failed', error, { list })
    }
  }

  return NextResponse.json(results)
}
