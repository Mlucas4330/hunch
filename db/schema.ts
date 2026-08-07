import { relations } from 'drizzle-orm'
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid
} from 'drizzle-orm/pg-core'
import {
  EXPERIMENT_ARM,
  EXPERIMENT_STATUS,
  FIX_KIND,
  FLOW_CATEGORY,
  HYPOTHESIS_STATUS,
  HYPOTHESIS_TARGET,
  LEAD_SOURCE,
  LOCALE,
  MARKET,
  SECTIONS,
  SUBSCRIPTION_PLAN,
  SUBSCRIPTION_STATUS,
  TRACK_EVENT,
  VARIANT_STATUS
} from '@/lib/enums'
import { DEFAULT_LEAD_SOURCE, DEFAULT_LOCALE, DEFAULT_MARKET } from '@/lib/constants'
import type {
  CompetitorStructure,
  PagePerformance,
  PageSeo,
  PageStructure
} from '@/lib/scrape'

export const subscriptionPlanEnum = pgEnum('subscription_plan', SUBSCRIPTION_PLAN)
export const subscriptionStatusEnum = pgEnum('subscription_status', SUBSCRIPTION_STATUS)
export const sectionEnum = pgEnum('section', SECTIONS)
export const hypothesisStatusEnum = pgEnum('hypothesis_status', HYPOTHESIS_STATUS)
export const hypothesisTargetEnum = pgEnum('hypothesis_target', HYPOTHESIS_TARGET)
export const variantStatusEnum = pgEnum('variant_status', VARIANT_STATUS)
export const flowCategoryEnum = pgEnum('flow_category', FLOW_CATEGORY)
export const experimentStatusEnum = pgEnum('experiment_status', EXPERIMENT_STATUS)
export const experimentArmEnum = pgEnum('experiment_arm', EXPERIMENT_ARM)
export const trackEventEnum = pgEnum('track_event', TRACK_EVENT)
export const localeEnum = pgEnum('locale', LOCALE)
export const marketEnum = pgEnum('market', MARKET)
export const fixKindEnum = pgEnum('fix_kind', FIX_KIND)
export const leadSourceEnum = pgEnum('lead_source', LEAD_SOURCE)

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  plan: subscriptionPlanEnum('plan').notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id'),
  analysesCount: integer('analyses_count').notNull().default(0),
  usagePeriodStart: timestamp('usage_period_start').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  plan: subscriptionPlanEnum('plan').notNull(),
  status: subscriptionStatusEnum('status').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const analyses = pgTable('analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  brief: text('brief'),
  competitors: jsonb('competitors').$type<{ name: string; url: string }[]>(),
  goalCandidates: jsonb('goal_candidates').$type<{ text: string; selector: string }[]>(),
  researchBrief: text('research_brief'),
  // The three measured readouts, kept so the report can state facts about the page without a model
  // in the loop. They were captured for generation long before this and thrown away afterwards.
  //
  // All nullable, and that is a contract rather than convenience: every analysis created before these
  // columns existed holds null, and MeasuredReadout renders nothing for a null exactly as FlowPlaybook
  // renders nothing for an empty list. No backfill, nothing regenerated.
  structure: jsonb('structure').$type<PageStructure>(),
  seo: jsonb('seo').$type<PageSeo>(),
  performance: jsonb('performance').$type<PagePerformance>(),
  // Populated only in Competitor mode -- see CompetitorStructure.
  competitorStructures: jsonb('competitor_structures').$type<CompetitorStructure[]>(),
  // The language the AI wrote this analysis in. Pinned at creation so alternates generated later
  // match the hypotheses already stored, even if the user switches the UI language afterwards.
  locale: localeEnum('locale').notNull().default(DEFAULT_LOCALE),
  // The market the analyzed page sells into, measured from the page itself rather than taken from the
  // UI locale. Pinned for the same reason as `locale`: an alternate written later must be held to the
  // market its hypothesis was written for.
  market: marketEnum('market').notNull().default(DEFAULT_MARKET),
  embedKey: uuid('embed_key').notNull().defaultRandom().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const hypotheses = pgTable('hypotheses', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id')
    .notNull()
    .references(() => analyses.id, { onDelete: 'cascade' }),
  section: sectionEnum('section').notNull(),
  problem: text('problem').notNull(),
  currentCopy: text('current_copy').notNull(),
  impactScore: integer('impact_score').notNull(),
  effortScore: integer('effort_score').notNull(),
  rationale: text('rationale').notNull(),
  selector: text('selector'),
  target: hypothesisTargetEnum('target').notNull().default('manual'),
  status: hypothesisStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const variants = pgTable('variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  hypothesisId: uuid('hypothesis_id')
    .notNull()
    .references(() => hypotheses.id, { onDelete: 'cascade' }),
  copy: text('copy').notNull(),
  evidence: text('evidence'),
  position: integer('position').notNull().default(0),
  status: variantStatusEnum('status').notNull().default('proposed'),
  screenshotUrl: text('screenshot_url'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

// The flow playbook: structural fixes that cannot be applied by swapping one line of text, so they
// never become a live test. No variants, no target, no status -- a founder either ships the steps or
// does not, and there is nothing for the embed snippet to measure.
export const flowFixes = pgTable('flow_fixes', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id')
    .notNull()
    .references(() => analyses.id, { onDelete: 'cascade' }),
  // Which ranked list this fix belongs to. Conversion fixes and discoverability fixes have the
  // identical shape and share this table and one component, so this is the only thing keeping them
  // two sections rather than one list where they compete for the same slot. `position` is assigned
  // per kind, so each section ranks from 1.
  kind: fixKindEnum('kind').notNull().default('flow'),
  category: flowCategoryEnum('category').notNull(),
  title: text('title').notNull(),
  problem: text('problem').notNull(),
  steps: jsonb('steps').$type<string[]>().notNull(),
  impactScore: integer('impact_score').notNull(),
  effortScore: integer('effort_score').notNull(),
  evidence: text('evidence'),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const experiments = pgTable('experiments', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id')
    .notNull()
    .references(() => analyses.id, { onDelete: 'cascade' }),
  hypothesisId: uuid('hypothesis_id')
    .notNull()
    .references(() => hypotheses.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id')
    .notNull()
    .references(() => variants.id, { onDelete: 'cascade' }),
  status: experimentStatusEnum('status').notNull().default('running'),
  selector: text('selector'),
  controlCopy: text('control_copy').notNull(),
  variantCopy: text('variant_copy').notNull(),
  goalSelector: text('goal_selector'),
  splitPercent: integer('split_percent').notNull().default(50),
  durationDays: integer('duration_days').notNull().default(14),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endsAt: timestamp('ends_at'),
  stoppedAt: timestamp('stopped_at'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const waitlist = pgTable(
  'waitlist',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    phone: text('phone'),
    embedKey: uuid('embed_key'),
    source: leadSourceEnum('source').notNull().default(DEFAULT_LEAD_SOURCE),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => [
    // Not `email` alone, which is what it was. The insert is onConflictDoNothing, so a unique email
    // meant that someone who had already hit a report's wall and then filled in the contact form was
    // discarded without a trace -- losing the highest-intent event the product has. Per source, the
    // dedupe still stops a reload from writing the same lead twice.
    unique().on(table.email, table.source)
  ]
)

// Every Stripe event we have already acted on. Stripe retries on any non-2xx and can deliver out of
// order, so without this a replayed event would be processed twice.
export const stripeEvents = pgTable('stripe_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  // Which subscription the event concerned, so ordering can be judged per subscription rather
  // than against unrelated customers' events.
  subscriptionId: text('subscription_id'),
  // event.created, not our clock: this is what makes a late event recognisable as stale.
  eventCreatedAt: timestamp('event_created_at').notNull(),
  receivedAt: timestamp('received_at').notNull().defaultNow()
})

// One row per (visitor, experiment, arm, event), so a reload or a forged replay cannot increment
// experiment_stats twice. Also the statistically correct unit: a conversion rate is per visitor.
export const experimentEvents = pgTable(
  'experiment_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    experimentId: uuid('experiment_id')
      .notNull()
      .references(() => experiments.id, { onDelete: 'cascade' }),
    visitorId: uuid('visitor_id').notNull(),
    arm: experimentArmEnum('arm').notNull(),
    type: trackEventEnum('type').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => [unique().on(table.experimentId, table.visitorId, table.arm, table.type)]
)

export const experimentStats = pgTable(
  'experiment_stats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    experimentId: uuid('experiment_id')
      .notNull()
      .references(() => experiments.id, { onDelete: 'cascade' }),
    arm: experimentArmEnum('arm').notNull(),
    impressions: integer('impressions').notNull().default(0),
    conversions: integer('conversions').notNull().default(0)
  },
  (table) => [unique().on(table.experimentId, table.arm)]
)

export const usersRelations = relations(users, ({ many, one }) => ({
  analyses: many(analyses),
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId]
  })
}))

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id]
  })
}))

export const analysesRelations = relations(analyses, ({ one, many }) => ({
  user: one(users, {
    fields: [analyses.userId],
    references: [users.id]
  }),
  hypotheses: many(hypotheses),
  flowFixes: many(flowFixes),
  experiments: many(experiments)
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

export const experimentsRelations = relations(experiments, ({ one, many }) => ({
  analysis: one(analyses, {
    fields: [experiments.analysisId],
    references: [analyses.id]
  }),
  hypothesis: one(hypotheses, {
    fields: [experiments.hypothesisId],
    references: [hypotheses.id]
  }),
  variant: one(variants, {
    fields: [experiments.variantId],
    references: [variants.id]
  }),
  stats: many(experimentStats)
}))

export const experimentStatsRelations = relations(experimentStats, ({ one }) => ({
  experiment: one(experiments, {
    fields: [experimentStats.experimentId],
    references: [experiments.id]
  })
}))

export type User = typeof users.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
export type Analysis = typeof analyses.$inferSelect
export type Hypothesis = typeof hypotheses.$inferSelect
export type Variant = typeof variants.$inferSelect
export type FlowFix = typeof flowFixes.$inferSelect
export type Experiment = typeof experiments.$inferSelect
export type ExperimentStat = typeof experimentStats.$inferSelect
export type Waitlist = typeof waitlist.$inferSelect
