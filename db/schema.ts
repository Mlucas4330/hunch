import { desc, relations, sql } from 'drizzle-orm'
import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import {
  FIX_KIND,
  FLOW_CATEGORY,
  HYPOTHESIS_TARGET,
  LOCALE,
  MARKET,
  SECTIONS,
  USER_ROLE
} from '@/lib/enums'
import {
  DEFAULT_LOCALE,
  DEFAULT_MARKET,
  DEFAULT_MONTHLY_QUOTA,
  DEFAULT_USER_ROLE
} from '@/lib/constants'
import type {
  PageMobile,
  PageSameness,
  PagePerformance,
  PageSeo,
  PageStructure
} from '@/lib/scrape'
import type { CrawlerAccess } from '@/lib/robots'
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

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').notNull().default(DEFAULT_USER_ROLE),
  // Runs per calendar month (UTC), set by an operator. Never carried in the JWT. See
  // docs/invariants.md.
  monthlyQuota: integer('monthly_quota').notNull().default(DEFAULT_MONTHLY_QUOTA),
  lastSignInAt: timestamp('last_sign_in_at'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

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
    competitorUrl: text('competitor_url'),
    competitor: jsonb('competitor').$type<CompetitorMeasurement>(),
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
    // Frozen at capture so a later change to how the score is computed never rewrites history.
    score: integer('score'),
    capturedAt: timestamp('captured_at').notNull().defaultNow()
  },
  (table) => [
    index().on(table.analysisId, table.capturedAt),
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
  assessment: text('assessment'),
  problem: text('problem').notNull(),
  currentCopy: text('current_copy').notNull(),
  impactScore: integer('impact_score').notNull(),
  rationale: text('rationale').notNull(),
  selector: text('selector'),
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
