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
  unique,
  uuid
} from 'drizzle-orm/pg-core'
import {
  FIX_KIND,
  FLOW_CATEGORY,
  HYPOTHESIS_TARGET,
  LOCALE,
  MARKET,
  CREDIT_REASON,
  SECTIONS,
  SUBSCRIPTION_STATUS,
  USER_ROLE
} from '@/lib/enums'
import {
  DEFAULT_LOCALE,
  DEFAULT_MARKET,
  DEFAULT_USER_ROLE
} from '@/lib/constants'
import type {
  PageMobile,
  PagePerformance,
  PageSeo,
  PageStructure
} from '@/lib/scrape'
import type { CrawlerAccess } from '@/lib/robots'
import type { PageKeywords } from '@/lib/keywords'
import type { CompetitorMeasurement } from '@/lib/competitor'

export const sectionEnum = pgEnum('section', SECTIONS)
export const hypothesisTargetEnum = pgEnum('hypothesis_target', HYPOTHESIS_TARGET)
export const flowCategoryEnum = pgEnum('flow_category', FLOW_CATEGORY)
export const localeEnum = pgEnum('locale', LOCALE)
export const marketEnum = pgEnum('market', MARKET)
export const fixKindEnum = pgEnum('fix_kind', FIX_KIND)
export const userRoleEnum = pgEnum('user_role', USER_ROLE)
export const creditReasonEnum = pgEnum('credit_reason', CREDIT_REASON)
export const subscriptionStatusEnum = pgEnum('subscription_status', SUBSCRIPTION_STATUS)

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').notNull().default(DEFAULT_USER_ROLE),
  stripeCustomerId: text('stripe_customer_id'),
  // The balance, and the only thing that says someone paid. Read from the row on every request and
  // never carried in the JWT -- a token lives SESSION_MAX_AGE_SECONDS, so a balance stamped into one
  // is stale the instant something is bought or spent. See docs/invariants.md.
  credits: integer('credits').notNull().default(0),
  lastSignInAt: timestamp('last_sign_in_at'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const analyses = pgTable(
  'analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Nullable: an analysis can be born with no owner. Someone pastes a URL from an ad, gets the
    // measured half, and only signs in if they want the rest -- so there is no user to hang it on at
    // creation, and the opaque embed_key is what identifies it until a sign-in claims it.
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    brief: text('brief'),
    structure: jsonb('structure').$type<PageStructure>(),
    seo: jsonb('seo').$type<PageSeo>(),
    performance: jsonb('performance').$type<PagePerformance>(),
    crawlerAccess: jsonb('crawler_access').$type<CrawlerAccess>(),
    keywords: jsonb('keywords').$type<PageKeywords>(),
    // The same page measured in a phone viewport. Null on every row measured before the mobile pass
    // existed, and the readout reads that null as "not measured" rather than as "nothing wrong".
    mobile: jsonb('mobile').$type<PageMobile>(),
    // A page the reader named, optional and supplied by hand: nothing here infers a competitor. The
    // URL is kept beside the measurement because the report labels the column with its hostname and
    // the prompts refer to the page by it. Both null on every analysis that named none.
    competitorUrl: text('competitor_url'),
    competitor: jsonb('competitor').$type<CompetitorMeasurement>(),
    locale: localeEnum('locale').notNull().default(DEFAULT_LOCALE),
    market: marketEnum('market').notNull().default(DEFAULT_MARKET),
    embedKey: uuid('embed_key').notNull().defaultRandom().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  // `analysisPulse` reads the newest rows and nothing else (lib/analyses.ts), so without this every
  // cache miss sorted the whole table to take 48 rows. The table grows with exactly the ad traffic
  // this index exists to survive.
  (table) => [index('analyses_created_at_idx').on(desc(table.createdAt))]
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
    // Frozen at capture so a later threshold change never rewrites history.
    score: integer('score'),
    capturedAt: timestamp('captured_at').notNull().defaultNow()
  },
  (table) => [
    index().on(table.analysisId, table.capturedAt),
    // `latestScores` takes the newest scored row per analysis and feeds both the public board and
    // the pulse (lib/analyses.ts). The index above does not serve it: the sort it needs is
    // descending and the `score is not null` filter is not covered, so it fell back to scanning and
    // sorting a table that gains a row on every measure and every re-measure.
    index('page_snapshots_scored_latest_idx')
      .on(table.analysisId, desc(table.capturedAt))
      .where(sql`${table.score} is not null`)
  ]
)

export const hypotheses = pgTable('hypotheses', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id')
    .notNull()
    .references(() => analyses.id, { onDelete: 'cascade' }),
  section: sectionEnum('section').notNull(),
  problem: text('problem').notNull(),
  currentCopy: text('current_copy').notNull(),
  impactScore: integer('impact_score').notNull(),
  rationale: text('rationale').notNull(),
  selector: text('selector'),
  target: hypothesisTargetEnum('target').notNull().default('manual'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const variants = pgTable('variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  hypothesisId: uuid('hypothesis_id')
    .notNull()
    .references(() => hypotheses.id, { onDelete: 'cascade' }),
  copy: text('copy').notNull(),
  evidence: text('evidence'),
  // A substring of `copy` that belongs in the element's existing styled fragment. See ai-pipeline.md.
  emphasis: text('emphasis'),
  position: integer('position').notNull().default(0),
  // The page as it is today. Null on every variant rendered before the slider existed, and the
  // preview falls back to showing the `after` image alone -- which is not a degraded rendering, it
  // is the only thing that was ever captured for that row.
  screenshotBeforeUrl: text('screenshot_before_url'),
  // The page with the variant applied. Named without a suffix because it predates the pair.
  screenshotUrl: text('screenshot_url'),
  screenshotOverflow: boolean('screenshot_overflow').notNull().default(false),
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
  steps: jsonb('steps').$type<string[]>().notNull(),
  impactScore: integer('impact_score').notNull(),
  evidence: text('evidence'),
  /**
   * Which `READOUT_FINDING` this fix answers. Null when no measurement backs it, which is a real and
   * common case -- nothing counts "the action is not repeated after the pricing table".
   *
   * **`text` rather than a pgEnum, against the precedent set by `kind` and `category` right above.**
   * Those two are small closed lists that change with the product; `READOUT_FINDING` is 43 values and
   * grows whenever a measurement is added -- the `credibility` and `mobile` groups both arrived after
   * the fact. As an enum, every new finding would become an `ALTER TYPE` migration, coupling
   * lib/readout.ts to the schema for no gain the Zod parse does not already give. Validation happens
   * where the value is produced, in lib/ai/schema.ts. See docs/data-model.md.
   */
  finding: text('finding'),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

/**
 * An address someone left to be told when the page they measured moves.
 *
 * **A lead is not a user and this table is not an entitlement.** Nothing here grants anything, no
 * balance is reachable from it, and `users` is untouched -- which is the whole reason it is safe.
 * A row in `users` is keyed on email and whoever presents that email next owns it, so it may only be
 * created from an address a provider verified (see invariants.md). Nobody verified this one: it is
 * a string a stranger typed into a form, and it stays in its own table where it can never key a
 * sign-in.
 *
 * Its own table rather than a column on `analyses` because a lead is a contact for one page and the
 * same person can measure several. It also leaves `analyses.user_id` as the only cut between the
 * free half and the paid one, which invariants.md requires: an address changes nothing about
 * ownership, and a lead never becomes an owner by leaving one.
 */
export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    analysisId: uuid('analysis_id')
      .notNull()
      .references(() => analyses.id, { onDelete: 'cascade' }),
    // Pinned like `analyses.locale` and for the same reason: what gets written to this person is
    // written in the language they were reading, not the one the sender happens to be in later.
    locale: localeEnum('locale').notNull().default(DEFAULT_LOCALE),
    // Set the moment they ask to stop. The row is kept rather than deleted, because deleting it
    // would let the next submit of the same address silently re-subscribe them.
    unsubscribedAt: timestamp('unsubscribed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => [
    // Submitting the same address for the same page twice is a person double-clicking, not a second
    // lead. The insert relies on this to be idempotent.
    unique('leads_email_analysis_idx').on(table.email, table.analysisId),
    index('leads_email_idx').on(table.email)
  ]
)

/**
 * A recurring authorisation at a provider, and what state it is in.
 *
 * **It holds entitlement, never balance.** What a subscriber can do that nobody else can is have
 * their page swept and be told what moved; the credits a renewal buys are added by `grantCredits`
 * like any other purchase and live in `users.credits` with the rest. Two tables would be two answers
 * to "how many credits does this person have", and invariants.md exists to keep there being one.
 *
 * `providerRef` is the provider's own id for the authorisation -- Mercado Pago's `preapproval_id` --
 * and it is unique because that id **is** the subscription. Idempotency for the money is elsewhere,
 * on `credit_transactions(provider, provider_ref)` keyed per payment: a renewal is a new payment
 * against the same authorisation, so keying grants on this column would credit the first month and
 * silently swallow every month after it.
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
    status: subscriptionStatusEnum('status').notNull().default('pending'),
    // What the provider last told us the authorisation runs until. Nullable because a preapproval
    // that has never been charged has no next payment date yet.
    currentPeriodEnd: timestamp('current_period_end'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => [
    unique('subscriptions_provider_ref_idx').on(table.provider, table.providerRef),
    index('subscriptions_user_idx').on(table.userId, table.status)
  ]
)

// Every movement of the balance, in both directions. Not decoration: without it "a credit went
// missing" has no answer, and a webhook that pays twice is indistinguishable from one that paid once.
export const creditTransactions = pgTable(
  'credit_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Signed: a purchase is positive, an unlock negative, a refund positive again.
    delta: integer('delta').notNull(),
    reason: creditReasonEnum('reason').notNull(),
    analysisId: uuid('analysis_id').references(() => analyses.id, { onDelete: 'set null' }),
    // Which payment this came from. The unique below is the idempotency key: the same provider
    // reference can never be granted twice, however many times a webhook is delivered.
    provider: text('provider'),
    providerRef: text('provider_ref'),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => [
    unique('credit_transactions_provider_ref_idx').on(table.provider, table.providerRef),
    index('credit_transactions_user_idx').on(table.userId, table.createdAt)
  ]
)

// Which webhook deliveries have already been handled, for every provider. Keyed on
// `(provider, event_id)` rather than on the id alone: two providers number their events
// independently, so nothing stops them from colliding on a string. See docs/data-model.md.
export const paymentEvents = pgTable(
  'payment_events',
  {
    provider: text('provider').notNull(),
    eventId: text('event_id').notNull(),
    type: text('type').notNull(),
    eventCreatedAt: timestamp('event_created_at').notNull(),
    receivedAt: timestamp('received_at').notNull().defaultNow()
  },
  (table) => [primaryKey({ columns: [table.provider, table.eventId] })]
)

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
  snapshots: many(pageSnapshots)
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

export const hypothesesRelations = relations(hypotheses, ({ one, many }) => ({
  analysis: one(analyses, {
    fields: [hypotheses.analysisId],
    references: [analyses.id]
  }),
  variants: many(variants)
}))

export const variantsRelations = relations(variants, ({ one }) => ({
  hypothesis: one(hypotheses, {
    fields: [variants.hypothesisId],
    references: [hypotheses.id]
  })
}))

export type User = typeof users.$inferSelect
export type Analysis = typeof analyses.$inferSelect

export type PageSnapshot = typeof pageSnapshots.$inferSelect
export type Hypothesis = typeof hypotheses.$inferSelect
export type Variant = typeof variants.$inferSelect
export type FlowFix = typeof flowFixes.$inferSelect
export type Lead = typeof leads.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
