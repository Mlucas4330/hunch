export const SUBSCRIPTION_PLAN = ['free', 'solo'] as const
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLAN)[number]

export const LOCALE = ['en', 'pt-BR'] as const
export type Locale = (typeof LOCALE)[number]

// The market a landing page sells into, measured from the page itself rather than from the UI
// language. It scopes the competitor search geographically and bounds which recommendations are
// eligible, so a Brazilian product is never told to add a trust seal that does not exist here.
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

// Which of the two ranked lists a fix belongs to. Both have the identical shape (title, problem,
// steps, impact, effort, evidence) and share one table and one component, so this is what keeps them
// rendering as two sections instead of one list where "write a meta description" competes with "cut
// the signup form" for the same slot.
export const FIX_KIND = ['flow', 'visibility'] as const
export type FixKind = (typeof FIX_KIND)[number]

// The tabs the analysis screen and the public report are split into. Presentation, not a column:
// `seo` and `ai` are two slices of the same flow_fixes.kind = 'visibility' rows, cut by category, so
// an existing analysis divides itself with no migration and no regeneration.
// `tests` is last on purpose: deciding what to change comes before proving it, and the live test is
// the step that happens after the work is won. It is also the one tab the public report never shows
// -- it passes `tests: 0` and the empty-tab rule in AnalysisTabs does the rest, because a prospect
// installs no snippet.
export const ANALYSIS_TAB = ['flow', 'copy', 'seo', 'ai', 'tests'] as const
export type AnalysisTab = (typeof ANALYSIS_TAB)[number]

// The sections FlowPlaybook knows how to render. `visibility` is the single combined section the
// print report still uses -- nothing may be hidden behind a tab on paper -- while `seo` and `ai` are
// what the two tabbed surfaces pass. Derived from FIX_KIND so a kind added there cannot be forgotten
// here.
export const PLAYBOOK_SECTION = [...FIX_KIND, 'seo', 'ai'] as const
export type PlaybookSection = (typeof PLAYBOOK_SECTION)[number]

// What a fix unblocks, one family per kind. A copy hypothesis swaps one line of text; a fix changes
// the page itself, so it is categorized by the blocker it removes rather than by a page section.
//
// The families are declared separately rather than sliced out of one list because each one is handed
// to its own generation as the exact set of values it may return -- a visibility fix categorized as
// `trust` would render under the wrong section heading, and the prompt alone cannot prevent that.
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

// Whether a crawler and a language model can reach, read, and cite the page.
export const VISIBILITY_FIX_CATEGORY = [
  'indexability',
  'metadata',
  'structured_data',
  'ai_answerability'
] as const
export type VisibilityFixCategory = (typeof VISIBILITY_FIX_CATEGORY)[number]

// The one visibility category about a language model quoting the page rather than a crawler reading
// it. Named because it is the whole discriminator behind the `seo` / `ai` tab split -- see
// `splitVisibility` in lib/analyses.ts.
export const AI_FIX_CATEGORY: VisibilityFixCategory = 'ai_answerability'

// Both families in one list: they share a table, a column, and a badge map, so the Postgres enum and
// every Record keyed by category cover all of them.
export const FLOW_CATEGORY = [...FLOW_FIX_CATEGORY, ...VISIBILITY_FIX_CATEGORY] as const
export type FlowCategory = (typeof FLOW_CATEGORY)[number]

export const HYPOTHESIS_STATUS = ['pending', 'testing', 'completed', 'skipped'] as const
export type HypothesisStatus = (typeof HYPOTHESIS_STATUS)[number]

// How a hypothesis's copy change can be applied: `auto` resolves to a single element and can be
// swapped by the embed snippet / screenshot; `manual` needs the founder to place it by hand.
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

// Abuse gates, distinct from the plan quotas in FREE_ANALYSES_LIMIT / FREE_EXPERIMENTS_LIMIT.
// Windows live in RATE_LIMITS, so a kind added here fails typecheck until it is given one.
export const RATE_LIMIT_KIND = [
  'analysis',
  'variants',
  'experiment',
  'screenshot',
  'waitlist',
  'track_event',
  'track_config',
  'signin'
] as const
export type RateLimitKind = (typeof RATE_LIMIT_KIND)[number]

// The measured readout: facts counted off the scraped page, never written by a model.
//
// This is the one family of numbers the product is allowed to show, and the enum is what keeps it
// that way. `measuredFindings` (lib/readout.ts) may only emit an id from this list, every id has a
// sentence in `dictionary.readout` with the value interpolated into it, and no value ever passes
// through a prompt. The quantitative ban in playbookPrompt / visibilityPrompt is untouched and still
// governs everything the model writes -- the two rules are about different producers.
// Where a lead came from. `report` is someone who hit the waitlist wall on a public report;
// `contact` is someone who filled the landing page's form and asked to talk.
//
// It exists because `waitlist.email` used to be unique on its own, and the insert is
// `onConflictDoNothing` -- so a person who had already hit a wall and then deliberately raised their
// hand was dropped in silence. Uniqueness is `(email, source)` so the second, far more valuable
// event survives the first.
export const LEAD_SOURCE = ['report', 'contact'] as const
export type LeadSource = (typeof LEAD_SOURCE)[number]

export const READOUT_FINDING = [
  // Structure: what the page makes a visitor do.
  'form_fields',
  'no_social_signin',
  'above_fold_ctas',
  'nav_links',
  'no_faq',
  'no_testimonials',
  // Metadata: what the page tells a machine about itself.
  'noindex',
  'no_meta_description',
  'h1_count',
  'images_missing_alt',
  'no_structured_data',
  'no_og_image',
  // Load: what the page costs to open.
  'lcp',
  'page_weight',
  'request_count'
] as const
export type ReadoutFinding = (typeof READOUT_FINDING)[number]

// How a measured value reads against its threshold. Deliberately three states and not two: `ok` is
// what makes the section an audit rather than a hit piece, and a report that only ever lists faults
// is one a prospect discounts on sight.
export const READOUT_SEVERITY = ['ok', 'warn', 'alert'] as const
export type ReadoutSeverity = (typeof READOUT_SEVERITY)[number]

// The readout groups, in the order they are measured and rendered.
export const READOUT_GROUP = ['structure', 'metadata', 'load'] as const
export type ReadoutGroup = (typeof READOUT_GROUP)[number]

// How a finding's value is written out. The readout itself stays in the units it measured (bytes,
// milliseconds) so nothing is rounded twice; this is what tells the component which formatter the
// dictionary sentence expects.
export const READOUT_UNIT = ['count', 'seconds', 'megabytes', 'presence'] as const
export type ReadoutUnit = (typeof READOUT_UNIT)[number]

// The metrics the side-by-side competitor table compares. A strict subset of PageStructure: only
// things measured identically on every page and meaningful without context. Conversion rate is not
// here and never can be -- we measure pages, not their traffic.
export const READOUT_COMPARISON = [
  'form_fields',
  'social_signin',
  'above_fold_ctas',
  'nav_links'
] as const
export type ReadoutComparison = (typeof READOUT_COMPARISON)[number]
