import { desc, relations, sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core'
import {
  FIX_KIND,
  FLOW_CATEGORY,
  HYPOTHESIS_TARGET,
  LOCALE,
  MARKET,
  PLAN_TIER,
  SECTIONS,
  SUBSCRIPTION_STATUS,
  USER_ROLE
} from '@/lib/enums'
import {
  DEFAULT_LOCALE,
  DEFAULT_MARKET,
  DEFAULT_MONTHLY_QUOTA,
  DEFAULT_USER_ROLE,
  TRIAL_RUNS
} from '@/lib/constants'
import type {
  ElementRect,
  PageMobile,
  PageSameness,
  PagePerformance,
  PageSeo,
  PageStructure
} from '@/lib/scrape'
import type { CrawlerAccess } from '@/lib/robots'
import type { SiteCrawl } from '@/lib/crawl'
import type { BacklinkSummary, RankedKeywords } from '@/lib/seranking'
import type { PageKeywords } from '@/lib/keywords'
import type { CompetitorMeasurement } from '@/lib/competitor'
import type { PageSpeed } from '@/lib/pagespeed'

export const sectionEnum = pgEnum('section', SECTIONS)
export const hypothesisTargetEnum = pgEnum('hypothesis_target', HYPOTHESIS_TARGET)
export const flowCategoryEnum = pgEnum('flow_category', FLOW_CATEGORY)
export const localeEnum = pgEnum('locale', LOCALE)
export const marketEnum = pgEnum('market', MARKET)
export const fixKindEnum = pgEnum('fix_kind', FIX_KIND)
export const userRoleEnum = pgEnum('user_role', USER_ROLE)
export const planTierEnum = pgEnum('plan_tier', PLAN_TIER)
export const subscriptionStatusEnum = pgEnum('subscription_status', SUBSCRIPTION_STATUS)

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').notNull().default(DEFAULT_USER_ROLE),
  // Runs per calendar month (UTC), set by an operator. Never carried in the JWT. See
  // docs/invariants.md.
  monthlyQuota: integer('monthly_quota').notNull().default(DEFAULT_MONTHLY_QUOTA),
  // A one-time credit, not a monthly allowance: it is granted once when the row is created and never
  // refilled, so an account that has spent it has to subscribe. Spent before the monthly quota, and
  // given back when the run it paid for failed. See docs/invariants.md.
  trialRunsLeft: integer('trial_runs_left').notNull().default(TRIAL_RUNS),
  // Which tier the live subscription is on, written only by the billing webhook. Null for an account
  // with no subscription, including one an operator provisioned by hand.
  planTier: planTierEnum('plan_tier'),
  // What the agency signs its reports with. Read only through brandFor(). See docs/invariants.md.
  brandName: text('brand_name'),
  brandLogoUrl: text('brand_logo_url'),
  lastSignInAt: timestamp('last_sign_in_at'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

/**
 * One Mercado Pago preapproval, as the provider last described it.
 *
 * **The provider stays the authority on what state a subscription is in**: this row is a copy kept
 * so a screen can render without calling them, and only the webhook writes what it says. Unique on
 * `(provider, provider_ref)` because the redirect back from the checkout and the webhook announcing
 * the same authorisation arrive in an order nobody controls, and both must converge on one row.
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerRef: text('provider_ref').notNull(),
    status: subscriptionStatusEnum('status').notNull(),
    tier: planTierEnum('tier'),
    // The end of the month already paid for. A cancelled subscription is honoured until it passes.
    currentPeriodEnd: timestamp('current_period_end'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('subscriptions_provider_ref_idx').on(table.provider, table.providerRef),
    index('subscriptions_user_status_idx').on(table.userId, table.status)
  ]
)

/**
 * One webhook delivery, claimed so a retry does no work twice.
 *
 * A notification is delivered more than once by design, and the same payment notifies while pending
 * and again once approved, which is why the id is the provider's id **and** the notification type.
 * The claim is released when handling fails, so the retry can work.
 */
export const paymentEvents = pgTable(
  'payment_events',
  {
    provider: text('provider').notNull(),
    eventId: text('event_id').notNull(),
    type: text('type').notNull(),
    receivedAt: timestamp('received_at').notNull().defaultNow()
  },
  (table) => [primaryKey({ columns: [table.provider, table.eventId] })]
)

export const analyses = pgTable(
  'analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Nullable only because rows from before the quota existed were created ownerless.
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    structure: jsonb('structure').$type<PageStructure>(),
    seo: jsonb('seo').$type<PageSeo>(),
    performance: jsonb('performance').$type<PagePerformance>(),
    crawlerAccess: jsonb('crawler_access').$type<CrawlerAccess>(),
    keywords: jsonb('keywords').$type<PageKeywords>(),
    mobile: jsonb('mobile').$type<PageMobile>(),
    sameness: jsonb('sameness').$type<PageSameness>(),
    // Null when the call failed or no key is configured, which is never read as a zero score.
    pagespeed: jsonb('pagespeed').$type<PageSpeed>(),
    // Null when the crawl threw or the row predates it. A crawl the site refused is stored, as `unknown`.
    siteCrawl: jsonb('site_crawl').$type<SiteCrawl>(),
    // SE Ranking's estimates for the domain. Null when the call failed or no key is set, which is never
    // read as a zero.
    backlinks: jsonb('backlinks').$type<BacklinkSummary>(),
    rankedKeywords: jsonb('ranked_keywords').$type<RankedKeywords>(),
    competitorUrl: text('competitor_url'),
    competitor: jsonb('competitor').$type<CompetitorMeasurement>(),
    // The phone screenshot of the page as the latest run that managed one saw it, under
    // SCREENSHOT_PUBLIC_PATH. Null when no run has taken one. **This one is never pruned**: a
    // report stays online behind its link, and a blank frame on a shared report is a bug the reader
    // cannot tell from a broken product. See docs/report.md.
    mobileScreenshotUrl: text('mobile_screenshot_url'),
    // The agency's own words on the report, written by the owner and read by their client. Null is
    // the ordinary case and renders nothing at all.
    agencyNote: text('agency_note'),
    locale: localeEnum('locale').notNull().default(DEFAULT_LOCALE),
    market: marketEnum('market').notNull().default(DEFAULT_MARKET),
    embedKey: uuid('embed_key').notNull().defaultRandom().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => [
    index('analyses_created_at_idx').on(desc(table.createdAt)),
    index('analyses_user_created_idx').on(table.userId, table.createdAt)
  ]
)

// One measure-and-generate pass over an analysis: the first one, and every "Run again" after it.
// The quota counts these. See docs/data-model.md.
export const analysisRuns = pgTable(
  'analysis_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Set null rather than cascade: deleting an analysis does not give the month's run back.
    analysisId: uuid('analysis_id').references(() => analyses.id, { onDelete: 'set null' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    measuredAt: timestamp('measured_at'),
    finishedAt: timestamp('finished_at'),
    // The run threw or came back empty. A failed run does not count against the quota.
    failedAt: timestamp('failed_at'),
    // This run was paid for out of the trial credit rather than the monthly quota. Recorded because
    // a failed run has to give back whichever of the two it took. See docs/data-model.md.
    trial: boolean('trial').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => [
    index('analysis_runs_user_created_idx').on(table.userId, table.createdAt),
    index('analysis_runs_analysis_created_idx').on(table.analysisId, table.createdAt)
  ]
)

// The history behind `analyses`' measured columns: those hold the current measurement, these hold
// every one taken. See docs/readout.md.
export const pageSnapshots = pgTable(
  'page_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    analysisId: uuid('analysis_id')
      .notNull()
      .references(() => analyses.id, { onDelete: 'cascade' }),
    structure: jsonb('structure').$type<PageStructure>(),
    seo: jsonb('seo').$type<PageSeo>(),
    performance: jsonb('performance').$type<PagePerformance>(),
    crawlerAccess: jsonb('crawler_access').$type<CrawlerAccess>(),
    keywords: jsonb('keywords').$type<PageKeywords>(),
    mobile: jsonb('mobile').$type<PageMobile>(),
    sameness: jsonb('sameness').$type<PageSameness>(),
    pagespeed: jsonb('pagespeed').$type<PageSpeed>(),
    siteCrawl: jsonb('site_crawl').$type<SiteCrawl>(),
    backlinks: jsonb('backlinks').$type<BacklinkSummary>(),
    rankedKeywords: jsonb('ranked_keywords').$type<RankedKeywords>(),
    // Frozen at capture so a later change to how the score is computed never rewrites history.
    score: integer('score'),
    // This run's own screenshot. Unlike the one on `analyses`, it is pruned once superseded: a
    // trend needs the score, not twelve pictures of the same page. See docs/scraping.md.
    mobileScreenshotUrl: text('mobile_screenshot_url'),
    capturedAt: timestamp('captured_at').notNull().defaultNow()
  },
  (table) => [
    index().on(table.analysisId, table.capturedAt),
    index('page_snapshots_scored_latest_idx')
      .on(table.analysisId, desc(table.capturedAt))
      .where(sql`${table.score} is not null`)
  ]
)

/**
 * One paste of URLs, queued together.
 *
 * The batch exists so a screen can report on the wave as a whole; **what it does not hold is a
 * counter of how many finished**, because the item rows already say. Two records of one fact is how
 * a progress bar starts lying.
 */
export const bulkBatches = pgTable(
  'bulk_batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => [index('bulk_batches_user_created_idx').on(table.userId, desc(table.createdAt))]
)

export const bulkBatchItems = pgTable(
  'bulk_batch_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => bulkBatches.id, { onDelete: 'cascade' }),
    // Set null rather than cascade, for the same reason `analysis_runs` does it: deleting an analysis
    // does not erase the record of the run it cost.
    analysisId: uuid('analysis_id').references(() => analyses.id, { onDelete: 'set null' }),
    url: text('url').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => [index('bulk_batch_items_batch_idx').on(table.batchId, table.createdAt)]
)

export const hypotheses = pgTable('hypotheses', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id')
    .notNull()
    .references(() => analyses.id, { onDelete: 'cascade' }),
  section: sectionEnum('section').notNull(),
  assessment: text('assessment'),
  problem: text('problem').notNull(),
  currentCopy: text('current_copy').notNull(),
  impactScore: integer('impact_score').notNull(),
  rationale: text('rationale').notNull(),
  // What the error costs the business, in one sentence. Nullable because every row written before
  // the column existed has none, and the card renders without it. See docs/data-model.md.
  businessImpact: text('business_impact'),
  selector: text('selector'),
  // Where the element sits in the phone screenshot of the run that wrote this row, as measured in
  // the mobile layout. Null for a manual target, and null for every row older than the screenshot.
  elementRect: jsonb('element_rect').$type<ElementRect>(),
  target: hypothesisTargetEnum('target').notNull().default('manual'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const flowFixes = pgTable('flow_fixes', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id')
    .notNull()
    .references(() => analyses.id, { onDelete: 'cascade' }),
  kind: fixKindEnum('kind').notNull().default('flow'),
  category: flowCategoryEnum('category').notNull(),
  title: text('title').notNull(),
  problem: text('problem').notNull(),
  impactScore: integer('impact_score').notNull(),
  evidence: text('evidence'),
  // The same sentence the hypotheses carry, under the same rule. See `hypotheses`.
  businessImpact: text('business_impact'),
  // The Lighthouse audit id or the crawler finding id this error answers, or null. `text` because
  // Lighthouse audit ids are an open list. See docs/data-model.md.
  finding: text('finding'),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const usersRelations = relations(users, ({ many }) => ({
  analyses: many(analyses)
}))

export const analysesRelations = relations(analyses, ({ one, many }) => ({
  user: one(users, {
    fields: [analyses.userId],
    references: [users.id]
  }),
  hypotheses: many(hypotheses),
  flowFixes: many(flowFixes),
  snapshots: many(pageSnapshots),
  runs: many(analysisRuns)
}))

export const analysisRunsRelations = relations(analysisRuns, ({ one }) => ({
  analysis: one(analyses, {
    fields: [analysisRuns.analysisId],
    references: [analyses.id]
  })
}))

export const pageSnapshotsRelations = relations(pageSnapshots, ({ one }) => ({
  analysis: one(analyses, {
    fields: [pageSnapshots.analysisId],
    references: [analyses.id]
  })
}))

export const flowFixesRelations = relations(flowFixes, ({ one }) => ({
  analysis: one(analyses, {
    fields: [flowFixes.analysisId],
    references: [analyses.id]
  })
}))

export const hypothesesRelations = relations(hypotheses, ({ one }) => ({
  analysis: one(analyses, {
    fields: [hypotheses.analysisId],
    references: [analyses.id]
  })
}))

export type User = typeof users.$inferSelect
export type Analysis = typeof analyses.$inferSelect
export type AnalysisRun = typeof analysisRuns.$inferSelect

export type PageSnapshot = typeof pageSnapshots.$inferSelect
export type Hypothesis = typeof hypotheses.$inferSelect
export type FlowFix = typeof flowFixes.$inferSelect
