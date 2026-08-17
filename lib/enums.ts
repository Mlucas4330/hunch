export const SUBSCRIPTION_PLAN = ['free', 'pro'] as const
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLAN)[number]

// Granted from ADMIN_EMAIL at sign-in, never revoked by one. See docs/invariants.md.
export const USER_ROLE = ['user', 'admin'] as const
export type UserRole = (typeof USER_ROLE)[number]

// The ids Auth.js gives the OAuth providers. Each one needs a verified-email claim before its
// email may key a user row -- see VERIFIED_EMAIL_CLAIM and docs/security.md.
export const OAUTH_PROVIDER = ['google', 'microsoft-entra-id'] as const
export type OAuthProvider = (typeof OAUTH_PROVIDER)[number]

export const LOCALE = ['en', 'pt-BR'] as const
export type Locale = (typeof LOCALE)[number]

// Measured from the page, never from the UI locale. See docs/invariants.md.
export const MARKET = ['us', 'br'] as const
export type Market = (typeof MARKET)[number]

export const SECTIONS = [
  'headline',
  'subheadline',
  'cta',
  'social_proof',
  'pricing',
  'features',
  'hero_image',
  'navigation',
  'other'
] as const
export type Section = (typeof SECTIONS)[number]

// Discriminates the two ranked lists sharing flow_fixes. See docs/data-model.md.
export const FIX_KIND = ['flow', 'visibility'] as const
export type FixKind = (typeof FIX_KIND)[number]

// Only the four "what to change" tabs. Running a live test is its own screen, because it is the one
// step that needs access to the client's site -- see docs/product.md.
export const ANALYSIS_TAB = ['flow', 'copy', 'seo', 'ai'] as const
export type AnalysisTab = (typeof ANALYSIS_TAB)[number]

// Derived from FIX_KIND so a kind added there cannot be forgotten here.
export const PLAYBOOK_SECTION = [...FIX_KIND, 'seo', 'ai'] as const
export type PlaybookSection = (typeof PLAYBOOK_SECTION)[number]

// Declared as two families, not sliced out of one list: each generation is handed only its own as
// the exact set of values it may return. See docs/data-model.md.
export const FLOW_FIX_CATEGORY = [
  'signup_friction',
  'cta_placement',
  'decision_load',
  'objections',
  'trust',
  'pricing_clarity',
  'page_structure'
] as const
export type FlowFixCategory = (typeof FLOW_FIX_CATEGORY)[number]

export const VISIBILITY_FIX_CATEGORY = [
  'indexability',
  'metadata',
  'structured_data',
  'ai_answerability'
] as const
export type VisibilityFixCategory = (typeof VISIBILITY_FIX_CATEGORY)[number]

// The whole discriminator behind the seo / ai tab split -- see splitVisibility in lib/analyses.ts.
export const AI_FIX_CATEGORY: VisibilityFixCategory = 'ai_answerability'

// Both families in one list: one table, one column, one badge map.
export const FLOW_CATEGORY = [...FLOW_FIX_CATEGORY, ...VISIBILITY_FIX_CATEGORY] as const
export type FlowCategory = (typeof FLOW_CATEGORY)[number]

export const HYPOTHESIS_STATUS = ['pending', 'testing', 'completed', 'skipped'] as const
export type HypothesisStatus = (typeof HYPOTHESIS_STATUS)[number]

// `auto` resolves to a single element and can be swapped by the snippet; `manual` is applied by hand.
export const HYPOTHESIS_TARGET = ['auto', 'manual'] as const
export type HypothesisTarget = (typeof HYPOTHESIS_TARGET)[number]

export const VARIANT_STATUS = ['proposed', 'testing', 'winner', 'rejected'] as const
export type VariantStatus = (typeof VARIANT_STATUS)[number]

export const SUBSCRIPTION_STATUS = ['active', 'canceled', 'past_due'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number]

export const EXPERIMENT_STATUS = ['running', 'stopped', 'completed'] as const
export type ExperimentStatus = (typeof EXPERIMENT_STATUS)[number]

export const EXPERIMENT_ARM = ['control', 'variant'] as const
export type ExperimentArm = (typeof EXPERIMENT_ARM)[number]

export const TRACK_EVENT = ['impression', 'conversion'] as const
export type TrackEvent = (typeof TRACK_EVENT)[number]

export const EXPERIMENT_ACTION = ['stop', 'declare_winner', 'discard'] as const
export type ExperimentAction = (typeof EXPERIMENT_ACTION)[number]

export const EXPERIMENT_DURATIONS = [7, 14, 30] as const
export type ExperimentDuration = (typeof EXPERIMENT_DURATIONS)[number]

export const EXPERIMENT_RECOMMENDATION = ['ship_variant', 'keep_control', 'inconclusive'] as const
export type ExperimentRecommendation = (typeof EXPERIMENT_RECOMMENDATION)[number]

// Abuse gates, distinct from the plan quotas. Windows live in RATE_LIMITS, so a kind added here
// fails typecheck until it is given one.
export const RATE_LIMIT_KIND = [
  'analysis',
  'variants',
  'experiment',
  'screenshot',
  'brand',
  // Its own kind rather than `analysis`: the backfill spends no allowance. See docs/api.md.
  'measure',
  'waitlist',
  'report_view',
  'track_event',
  'track_config',
  'signin'
] as const
export type RateLimitKind = (typeof RATE_LIMIT_KIND)[number]

// Unique per (email, source), not per email -- see docs/data-model.md.
export const LEAD_SOURCE = ['report', 'contact'] as const
export type LeadSource = (typeof LEAD_SOURCE)[number]

// The only numbers the product may show. measuredFindings (lib/readout.ts) may emit no id outside
// this list, and every id has a sentence in dictionary.readout. See docs/readout.md.
export const READOUT_FINDING = [
  'form_fields',
  'no_social_signin',
  'above_fold_ctas',
  'nav_links',
  'no_faq',
  'no_testimonials',
  'word_count',
  'heading_count',
  'noindex',
  'no_meta_description',
  'h1_count',
  'images_missing_alt',
  'no_structured_data',
  'no_og_image',
  'no_canonical',
  'no_lang',
  'internal_links',
  'term_in_title',
  'term_in_h1',
  'term_in_meta_description',
  'ai_crawlers_blocked',
  'robots_blocks_all',
  'no_sitemap',
  'ttfb',
  'fcp',
  'lcp',
  'page_weight',
  'request_count'
] as const
export type ReadoutFinding = (typeof READOUT_FINDING)[number]

// Three states, not two: `ok` is what makes the section an audit rather than a hit piece.
export const READOUT_SEVERITY = ['ok', 'warn', 'alert'] as const
export type ReadoutSeverity = (typeof READOUT_SEVERITY)[number]

// Also the render order. `visibility` is skipped whole when robots.txt could not be read, because
// "we could not check" is not "they block AI crawlers". See docs/invariants.md.
export const READOUT_GROUP = ['structure', 'metadata', 'visibility', 'load'] as const
export type ReadoutGroup = (typeof READOUT_GROUP)[number]

export const READOUT_UNIT = ['count', 'seconds', 'megabytes', 'presence'] as const
export type ReadoutUnit = (typeof READOUT_UNIT)[number]

// A strict subset of PageStructure: only what is measured identically on every page. Conversion rate
// is not here and never can be -- we measure pages, not their traffic.
export const READOUT_COMPARISON = [
  'form_fields',
  'social_signin',
  'above_fold_ctas',
  'nav_links',
  'word_count',
  'pricing',
  'testimonials',
  'faq',
  'sticky_cta',
  'meta_description',
  'structured_data',
  'lcp',
  'page_weight'
] as const
export type ReadoutComparison = (typeof READOUT_COMPARISON)[number]
