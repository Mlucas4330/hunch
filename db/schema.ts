import { relations } from 'drizzle-orm'
import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { SECTIONS } from '@/lib/enums'

export const sectionEnum = pgEnum('section', SECTIONS)

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
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
  hypotheses: many(hypotheses)
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
export type Hypothesis = typeof hypotheses.$inferSelect
export type Variant = typeof variants.$inferSelect
