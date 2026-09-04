import { desc, relations, sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid
} from 'drizzle-orm/pg-core'
import {
  FIX_KIND,
  VARIANT_AUTHOR,
  VERDICT,
  FLOW_CATEGORY,
  HYPOTHESIS_TARGET,
  LOCALE,
  MARKET,
  CREDIT_REASON,
  SECTIONS,
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
import type { AdIdeas } from '@/lib/ai/schema'

export const sectionEnum = pgEnum('section', SECTIONS)
export const hypothesisTargetEnum = pgEnum('hypothesis_target', HYPOTHESIS_TARGET)
export const flowCategoryEnum = pgEnum('flow_category', FLOW_CATEGORY)
export const localeEnum = pgEnum('locale', LOCALE)
export const marketEnum = pgEnum('market', MARKET)
export const fixKindEnum = pgEnum('fix_kind', FIX_KIND)
export const verdictEnum = pgEnum('verdict', VERDICT)
export const variantAuthorEnum = pgEnum('variant_author', VARIANT_AUTHOR)
export const userRoleEnum = pgEnum('user_role', USER_ROLE)
export const creditReasonEnum = pgEnum('credit_reason', CREDIT_REASON)

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
  // The Google Ads click this person last arrived on, copied off the first-party cookie when they
  // create a payment and read back by `grantCredits` to report the sale. Null on everyone who never
  // came from an ad, which is most rows and is not a gap.
  //
  // **It is stored on the buyer rather than on the payment on purpose.** The click happens before
  // anyone signs in and often days before they buy, so there is no payment to hang it on when it
  // arrives; `users` is the first row that exists on both sides of that gap. The cost is that it is
  // last-click only, which is also what Google's own default attribution reports.
  gclid: text('gclid'),
  // When that click was captured, because a click older than GCLID_MAX_AGE_SECONDS is outside
  // Google's conversion window and reporting it produces a rejected upload rather than a conversion.
  gclidAt: timestamp('gclid_at'),
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
    // Ad groups written off `keywords`, on the owner's click rather than during the run. One column
    // rather than a table: it is a single object, read whole and written whole, exactly like the
    // measurement columns above it. Null on every analysis nobody has asked for one on, which is
    // most of them. See docs/data-model.md.
    adIdeas: jsonb('ad_ideas').$type<AdIdeas>(),
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
  // What the line already does for the visitor, written before the replacement was. Nullable because
  // every row generated before the field existed has none, and null renders as no verdict rather
  // than as an empty one -- same treatment as `variants.evidence`. See docs/ai-pipeline.md.
  assessment: text('assessment'),
  problem: text('problem').notNull(),
  currentCopy: text('current_copy').notNull(),
  impactScore: integer('impact_score').notNull(),
  rationale: text('rationale').notNull(),
  selector: text('selector'),
  target: hypothesisTargetEnum('target').notNull().default('manual'),
  /**
   * What the owner decided about this recommendation, and the only judgement of this product's own
   * output that exists anywhere.
   *
   * **Null means undecided, never rejected.** Every row written before this column existed is null,
   * and so is every row nobody has read yet, so an acceptance rate is a rate over decided rows and
   * must never treat the rest as noes.
   *
   * **It says the owner acted, never that the change worked.** Nobody controlled for anything
   * between two measurements of a page, so no surface reading this may attribute a movement to a
   * fix marked `applied` -- see docs/invariants.md.
   */
  verdict: verdictEnum('verdict'),
  verdictAt: timestamp('verdict_at'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const variants = pgTable('variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  hypothesisId: uuid('hypothesis_id')
    .notNull()
    .references(() => hypotheses.id, { onDelete: 'cascade' }),
  copy: text('copy').notNull(),
  /**
   * Who wrote this line.
   *
   * **An owner's edit is a new row, never an overwrite.** Keeping both is the whole point: what the
   * model proposed stays beside what the reader actually published, and the difference between the
   * two is a label nobody had to sit down and produce. It is also what stops an edited line from
   * being presented as something this product wrote. See docs/data-model.md.
   */
  author: variantAuthorEnum('author').notNull().default('model'),
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
  // The same pair as on `hypotheses`, and it carries the same meaning. One column on each of the two
  // tables covers all three fix lists, because `kind` above already splits flow from visibility.
  verdict: verdictEnum('verdict'),
  verdictAt: timestamp('verdict_at'),
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
    // The credential on the unsubscribe link, and the only one. Unguessable like `embed_key`, so a
    // mail client that prefetches links can only ever unsubscribe the person who was mailed, and a
    // stranger cannot walk ids to unsubscribe anyone else.
    unsubscribeToken: uuid('unsubscribe_token').notNull().defaultRandom().unique(),
    // Which mail of LEAD_SEQUENCE has gone out. Idempotency for the cron lives here rather than in a
    // timestamp comparison: a run that crashes after sending has already written the stage.
    stage: smallint('stage').notNull().default(0),
    lastEmailedAt: timestamp('last_emailed_at'),
    // **What the reader was actually promised.** A row captured under a form that said one mail and
    // nothing else may not be enrolled in a sequence or uploaded to an ad network however the policy
    // reads today. Set only by the form that states the current terms, so a null here is an older
    // promise and is honoured by being left alone. See docs/ads.md.
    consentedAt: timestamp('consented_at'),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => [
    // Submitting the same address for the same page twice is a person double-clicking, not a second
    // lead. The insert relies on this to be idempotent.
    unique('leads_email_analysis_idx').on(table.email, table.analysisId),
    index('leads_email_idx').on(table.email)
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
