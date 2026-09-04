import { and, count, eq, gte, isNotNull, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { analyses, creditTransactions, leads, users } from '../db/schema.ts'
import { adsAccount, adsHeaders, googleAdsEnabled } from '../lib/google-ads.ts'
import { GOOGLE_ADS_API_ORIGIN, GOOGLE_ADS_API_VERSION } from '../lib/constants.ts'

/**
 * The campaign and the funnel behind it, side by side, over one window.
 *
 * **It exists because neither half can diagnose anything alone.** The Ads account knows what a click
 * cost and nothing about what happened after it; the database knows every run, address and purchase
 * and nothing about which ad group produced them. Reading them in two places is how "the campaign is
 * not working" stays a feeling instead of becoming a number.
 *
 *   npx tsx --env-file=.env scripts/ads-funnel.mts            # last 30 days
 *   npx tsx --env-file=.env scripts/ads-funnel.mts --days=7
 *
 * **It reads and never writes.** No script in this repo owns the account structure, which is the
 * rule in docs/ads.md; reading it back is the half that rule always allowed.
 *
 * **It prints counts and arithmetic, never a conclusion.** What each shape of number means is
 * written down in docs/ads.md under the diagnosis order, deliberately in prose a person argues with
 * rather than in a threshold this file would silently apply. Same reason `deltas()` emits values and
 * no sentences: nothing here may say what caused what. See docs/invariants.md.
 *
 * **The database side is totals, not per ad group, and that is a real limit rather than an
 * omission.** An analysis carries no click id: `gclid` is written to `users` at checkout, which is
 * the first row that exists on both sides of the gap, so a run and an address cannot be attributed
 * to the ad group that bought them. Google's own lead column is the only per-group read of the
 * address rate, which is exactly the job that secondary action was created for.
 */

const days = Number(process.argv.find((arg) => arg.startsWith('--days='))?.split('=')[1] ?? 30)
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
const iso = (date: Date) => date.toISOString().slice(0, 10)

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const rate = (part: number, whole: number) =>
  whole === 0 ? '   n/a' : `${((part / whole) * 100).toFixed(1).padStart(5)}%`

async function gaql<T>(query: string): Promise<T[]> {
  const response = await fetch(
    `${GOOGLE_ADS_API_ORIGIN}/${GOOGLE_ADS_API_VERSION}/customers/${adsAccount()}/googleAds:search`,
    { method: 'POST', headers: await adsHeaders(), body: JSON.stringify({ query }) }
  )

  const text = await response.text()
  if (!response.ok) throw new Error(`${response.status}: ${text.slice(0, 400)}`)
  return (JSON.parse(text).results ?? []) as T[]
}

const window = `segments.date between '${iso(since)}' and '${iso(new Date())}'`

console.log(`\nwindow: ${iso(since)} to ${iso(new Date())} (${days} days)\n`)

if (!googleAdsEnabled()) {
  console.log('google ads is not configured, skipping the account half\n')
} else {
  type GroupRow = {
    adGroup: { name: string; status: string }
    metrics: { impressions?: string; clicks?: string; costMicros?: string }
  }

  const groups = await gaql<GroupRow>(
    `select ad_group.name, ad_group.status, metrics.impressions, metrics.clicks, metrics.cost_micros
     from ad_group where ${window}`
  )

  type ConversionRow = {
    adGroup: { name: string }
    segments: { conversionActionName: string }
    metrics: { allConversions?: number }
  }

  const conversions = await gaql<ConversionRow>(
    `select ad_group.name, segments.conversion_action_name, metrics.all_conversions
     from ad_group where ${window}`
  )

  const converted = new Map<string, Map<string, number>>()
  for (const row of conversions) {
    const byAction = converted.get(row.adGroup.name) ?? new Map<string, number>()
    const action = row.segments.conversionActionName
    byAction.set(action, (byAction.get(action) ?? 0) + (row.metrics.allConversions ?? 0))
    converted.set(row.adGroup.name, byAction)
  }

  console.log('AD GROUP'.padEnd(30), 'STATUS'.padEnd(9), 'IMPR'.padStart(7), 'CLICKS'.padStart(7), 'COST'.padStart(11), 'CPC'.padStart(9), '  CONVERSIONS')

  let clicksTotal = 0
  let costTotal = 0

  for (const row of groups) {
    const impressions = Number(row.metrics.impressions ?? 0)
    const clicks = Number(row.metrics.clicks ?? 0)
    const cost = Number(row.metrics.costMicros ?? 0) / 1_000_000
    clicksTotal += clicks
    costTotal += cost

    const actions = [...(converted.get(row.adGroup.name) ?? new Map())]
      .filter(([, value]) => value > 0)
      .map(([name, value]) => `${name} ${value}`)
      .join(', ')

    console.log(
      row.adGroup.name.slice(0, 29).padEnd(30),
      row.adGroup.status.padEnd(9),
      String(impressions).padStart(7),
      String(clicks).padStart(7),
      brl(cost).padStart(11),
      (clicks ? brl(cost / clicks) : '-').padStart(9),
      ' ' + (actions || '-')
    )
  }

  console.log(
    '\n'.padEnd(1),
    `${clicksTotal} clicks, ${brl(costTotal)} spent, ${clicksTotal ? brl(costTotal / clicksTotal) : '-'} a click\n`
  )
}

const [runs] = await db.select({ n: count() }).from(analyses).where(gte(analyses.createdAt, since))
const [owned] = await db
  .select({ n: count() })
  .from(analyses)
  .where(and(gte(analyses.createdAt, since), isNotNull(analyses.userId)))

const [captured] = await db.select({ n: count() }).from(leads).where(gte(leads.createdAt, since))
const [consented] = await db
  .select({ n: count() })
  .from(leads)
  .where(and(gte(leads.createdAt, since), isNotNull(leads.consentedAt)))
const [left] = await db
  .select({ n: count() })
  .from(leads)
  .where(and(gte(leads.createdAt, since), isNotNull(leads.unsubscribedAt)))

const stages = await db
  .select({ stage: leads.stage, n: count() })
  .from(leads)
  .where(gte(leads.createdAt, since))
  .groupBy(leads.stage)

const [purchases] = await db
  .select({ n: count(), credits: sql<number>`coalesce(sum(${creditTransactions.delta}), 0)` })
  .from(creditTransactions)
  .where(
    and(gte(creditTransactions.createdAt, since), eq(creditTransactions.reason, 'purchase'))
  )

const [attributed] = await db
  .select({ n: count() })
  .from(creditTransactions)
  .innerJoin(users, eq(users.id, creditTransactions.userId))
  .where(
    and(
      gte(creditTransactions.createdAt, since),
      eq(creditTransactions.reason, 'purchase'),
      isNotNull(users.gclid)
    )
  )

const stageOf = (stage: number) => stages.find((row) => row.stage === stage)?.n ?? 0

console.log('THE FUNNEL, in totals')
console.log('  analyses run           ', String(runs.n).padStart(6))
console.log('  of those, owned        ', String(owned.n).padStart(6), rate(owned.n, runs.n))
console.log('  addresses left         ', String(captured.n).padStart(6), rate(captured.n, runs.n))
console.log('  of those, consented    ', String(consented.n).padStart(6), rate(consented.n, captured.n))
console.log('  waiting for day 2      ', String(stageOf(0)).padStart(6))
console.log('  had the day 2 mail     ', String(stageOf(1)).padStart(6))
console.log('  had the day 7 mail     ', String(stageOf(2)).padStart(6), '  the sequence ends here')
console.log('  unsubscribed           ', String(left.n).padStart(6), rate(left.n, captured.n))
console.log('  purchases              ', String(purchases.n).padStart(6), rate(purchases.n, captured.n), ' of the addresses')
console.log('  credits granted        ', String(purchases.credits).padStart(6))
console.log('  buyers carrying a gclid', String(attributed.n).padStart(6), '  the rest never saw an ad')
console.log('')

process.exit(0)
