import { relations } from 'drizzle-orm'
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
  USER_ROLE
} from '@/lib/enums'
import {
  DEFAULT_LOCALE,
  DEFAULT_MARKET,
  DEFAULT_USER_ROLE
} from '@/lib/constants'
import type {
  PagePerformance,
  PageSeo,
  PageStructure
} from '@/lib/scrape'
import type { CrawlerAccess } from '@/lib/robots'
import type { PageKeywords } from '@/lib/keywords'

export const sectionEnum = pgEnum('section', SECTIONS)
export const hypothesisTargetEnum = pgEnum('hypothesis_target', HYPOTHESIS_TARGET)
export const flowCategoryEnum = pgEnum('flow_category', FLOW_CATEGORY)
export const localeEnum = pgEnum('locale', LOCALE)
export const marketEnum = pgEnum('market', MARKET)
export const fixKindEnum = pgEnum('fix_kind', FIX_KIND)
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
  lastSignInAt: timestamp('last_sign_in_at'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const analyses = pgTable('analyses', {
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
  locale: localeEnum('locale').notNull().default(DEFAULT_LOCALE),
  market: marketEnum('market').notNull().default(DEFAULT_MARKET),
  embedKey: uuid('embed_key').notNull().defaultRandom().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

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
    // Frozen at capture so a later threshold change never rewrites history.
    score: integer('score'),
    capturedAt: timestamp('captured_at').notNull().defaultNow()
  },
  (table) => [index().on(table.analysisId, table.capturedAt)]
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
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

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
