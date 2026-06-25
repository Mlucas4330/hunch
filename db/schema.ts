import { relations } from 'drizzle-orm'
import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import {
  HYPOTHESIS_STATUS,
  SECTIONS,
  SUBSCRIPTION_PLAN,
  SUBSCRIPTION_STATUS
} from '@/lib/enums'

export const subscriptionPlanEnum = pgEnum('subscription_plan', SUBSCRIPTION_PLAN)
export const subscriptionStatusEnum = pgEnum('subscription_status', SUBSCRIPTION_STATUS)
export const sectionEnum = pgEnum('section', SECTIONS)
export const hypothesisStatusEnum = pgEnum('hypothesis_status', HYPOTHESIS_STATUS)

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
  variantCopy: text('variant_copy').notNull(),
  impactScore: integer('impact_score').notNull(),
  effortScore: integer('effort_score').notNull(),
  rationale: text('rationale').notNull(),
  status: hypothesisStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

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
  hypotheses: many(hypotheses)
}))

export const hypothesesRelations = relations(hypotheses, ({ one }) => ({
  analysis: one(analyses, {
    fields: [hypotheses.analysisId],
    references: [analyses.id]
  })
}))

export type User = typeof users.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
export type Analysis = typeof analyses.$inferSelect
export type Hypothesis = typeof hypotheses.$inferSelect
