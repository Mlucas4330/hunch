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
  HYPOTHESIS_STATUS,
  SECTIONS,
  SUBSCRIPTION_PLAN,
  SUBSCRIPTION_STATUS,
  VARIANT_STATUS
} from '@/lib/enums'

export const subscriptionPlanEnum = pgEnum('subscription_plan', SUBSCRIPTION_PLAN)
export const subscriptionStatusEnum = pgEnum('subscription_status', SUBSCRIPTION_STATUS)
export const sectionEnum = pgEnum('section', SECTIONS)
export const hypothesisStatusEnum = pgEnum('hypothesis_status', HYPOTHESIS_STATUS)
export const variantStatusEnum = pgEnum('variant_status', VARIANT_STATUS)
export const experimentStatusEnum = pgEnum('experiment_status', EXPERIMENT_STATUS)
export const experimentArmEnum = pgEnum('experiment_arm', EXPERIMENT_ARM)

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  plan: subscriptionPlanEnum('plan').notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id'),
  analysesCount: integer('analyses_count').notNull().default(0),
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
  status: variantStatusEnum('status').notNull().default('proposed'),
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
  experiments: many(experiments)
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
export type Experiment = typeof experiments.$inferSelect
export type ExperimentStat = typeof experimentStats.$inferSelect
