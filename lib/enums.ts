
// Granted from ADMIN_EMAIL at sign-in, never revoked by one. See docs/invariants.md.
export const USER_ROLE = ['user', 'admin'] as const
export type UserRole = (typeof USER_ROLE)[number]

// The ids Auth.js gives the OAuth providers. Each one must declare how its address is verified
// before it may key a user row -- see VERIFIED_EMAIL and docs/security.md.
export const OAUTH_PROVIDER = ['google', 'github'] as const
export type OAuthProvider = (typeof OAUTH_PROVIDER)[number]

export const LOCALE = ['en', 'pt-BR'] as const
export type Locale = (typeof LOCALE)[number]

// The two palettes in app/globals.css. A UI-only enum -- it is not a Postgres value and is never
// stored on a row, because the theme belongs to a browser rather than to a person.
export const THEME = ['light', 'dark'] as const
export type Theme = (typeof THEME)[number]

// The blog posts, in render order. A slug is the URL segment and the dictionary key at once, so a
// post added here fails typecheck until it is written in both locales. See docs/seo.md.
export const BLOG_SLUG = ['what-is-seo', 'what-is-copy', 'ai-is-the-new-google'] as const
export type BlogSlug = (typeof BLOG_SLUG)[number]

// The post the landing page's AI section links to.
export const AI_POST_SLUG: BlogSlug = 'ai-is-the-new-google'

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

// The two shapes a route's loading shell can take: a grid of rows, or one analysis.
export const ROUTE_SKELETON = ['list', 'detail'] as const
export type RouteSkeleton = (typeof ROUTE_SKELETON)[number]

// The four report sections, in render order: AI first, because it is what the product is for. See
// docs/analysis-ui.md.
export const ANALYSIS_TAB = ['ai', 'seo', 'flow', 'copy'] as const
export type AnalysisTab = (typeof ANALYSIS_TAB)[number]

// The anchorable landmarks of the report, top to bottom. Each value is an element `id` on the page
// and the key `ReportRail` labels itself from. The last four are spread from ANALYSIS_TAB so the rail
// can never list a section the page does not render. See docs/report.md.
export const REPORT_SECTION = ['start', 'readout', ...ANALYSIS_TAB] as const
export type ReportSection = (typeof REPORT_SECTION)[number]

// The second layer inside an open card: what argues for the error sits behind it. See
// docs/components.md.
export const CARD_DRAWER = ['why'] as const
export type CardDrawer = (typeof CARD_DRAWER)[number]

// Which lists `FlowPlaybook` can render, and therefore which dictionary sections have to exist.
// Written out rather than derived from FIX_KIND: `visibility` is the parent of the seo and ai lists,
// never a list itself.
export const PLAYBOOK_SECTION = ['flow', 'seo', 'ai'] as const
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
  'page_structure',
  'mobile',
  'performance',
  'distinctiveness'
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

// `auto` resolves to a single element on the page; `manual` does not.
export const HYPOTHESIS_TARGET = ['auto', 'manual'] as const
export type HypothesisTarget = (typeof HYPOTHESIS_TARGET)[number]

// What a queued job is doing. `unavailable` means the work can never succeed for this input, which
// is a different answer from "still working". See docs/scraping.md.
export const JOB_STATUS = ['queued', 'running', 'ready', 'unavailable'] as const
export type JobStatus = (typeof JOB_STATUS)[number]

// The two that mean the work has not finished and has not given up.
export const JOB_IN_FLIGHT: readonly JobStatus[] = ['queued', 'running']

// Where one analysis stands, as far as anything outside the worker can tell. `rerunning` is a report
// with lists on screen and a new run in flight. See docs/report.md.
export const ANALYSIS_STATE = ['measuring', 'generating', 'rerunning', 'failed', 'ready'] as const
export type AnalysisState = (typeof ANALYSIS_STATE)[number]

// Abuse gates. Windows live in RATE_LIMITS, so a kind added here fails typecheck until it is given
// one.
export const RATE_LIMIT_KIND = ['analysis', 'job_status', 'signin'] as const
export type RateLimitKind = (typeof RATE_LIMIT_KIND)[number]

// The four Lighthouse categories PageSpeed Insights scores, in render order. The values are the ids
// the API uses, so they are sent and read back as they stand. See docs/readout.md.
export const PAGESPEED_CATEGORY = ['performance', 'accessibility', 'best-practices', 'seo'] as const
export type PageSpeedCategory = (typeof PAGESPEED_CATEGORY)[number]

// The Chrome UX Report metrics PageSpeed Insights returns as field data, keyed as the API keys them.
export const PAGESPEED_FIELD_METRIC = [
  'LARGEST_CONTENTFUL_PAINT_MS',
  'INTERACTION_TO_NEXT_PAINT',
  'CUMULATIVE_LAYOUT_SHIFT_SCORE',
  'FIRST_CONTENTFUL_PAINT_MS',
  'EXPERIMENTAL_TIME_TO_FIRST_BYTE'
] as const
export type PageSpeedFieldMetric = (typeof PAGESPEED_FIELD_METRIC)[number]

export const PAGESPEED_FIELD_CATEGORY = ['FAST', 'AVERAGE', 'SLOW'] as const
export type PageSpeedFieldCategory = (typeof PAGESPEED_FIELD_CATEGORY)[number]

// Whether the field data describes this URL or, when the URL has too little traffic, its whole
// origin. The report says which, because they are different claims.
export const PAGESPEED_FIELD_SCOPE = ['page', 'origin'] as const
export type PageSpeedFieldScope = (typeof PAGESPEED_FIELD_SCOPE)[number]

// How a field metric's percentile is printed. CLS arrives multiplied by 100, the rest in milliseconds.
export const PAGESPEED_FIELD_UNIT = ['seconds', 'milliseconds', 'score'] as const
export type PageSpeedFieldUnit = (typeof PAGESPEED_FIELD_UNIT)[number]

// The ids the generation prompts use to point a fix at something measured on the scraped page.
// Never rendered as a readout any more, except the `crawler_access` group. See docs/readout.md.
export const READOUT_FINDING = [
  'form_fields',
  'required_fields',
  'fields_without_label',
  'form_steps',
  'no_submit',
  'no_social_signin',
  'above_fold_ctas',
  'dead_ctas',
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
  'request_count',
  'no_cnpj',
  'no_trust_badge',
  'testimonial_attribution',
  'no_privacy_policy',
  'no_contact_channel',
  'mobile_overflow',
  'no_viewport_meta',
  'mobile_tap_targets',
  'mobile_tiny_text',
  'mobile_above_fold_ctas',
  'gradient_backgrounds',
  'font_families',
  'icon_set_default',
  'card_triplets',
  'emoji_in_headings',
  'generic_cta_text',
  'placeholder_text',
  'unlinked_logo_strip',
  'builder_declared',
  'stock_hero_image'
] as const
export type ReadoutFinding = (typeof READOUT_FINDING)[number]

// Three states, not two: `ok` is what makes the section an audit rather than a hit piece.
export const READOUT_SEVERITY = ['ok', 'warn', 'alert'] as const
export type ReadoutSeverity = (typeof READOUT_SEVERITY)[number]

export const READOUT_GROUP = [
  'structure',
  'credibility',
  'mobile',
  'declared',
  'crawler_access',
  'load',
  'sameness'
] as const
export type ReadoutGroup = (typeof READOUT_GROUP)[number]

// Groups that are counted but never scored.
export const UNSCORED_READOUT_GROUP: ReadoutGroup[] = ['sameness']

// `flow_fixes.finding` is a `text` column, so a value read back is a plain string and has to be
// narrowed before it can key anything.
export function isReadoutFinding(value: unknown): value is ReadoutFinding {
  return READOUT_FINDING.includes(value as ReadoutFinding)
}

export const READOUT_UNIT = ['count', 'seconds', 'megabytes', 'presence'] as const
export type ReadoutUnit = (typeof READOUT_UNIT)[number]

// Which side of its own threshold a finding is flagged on. See docs/readout.md.
export const READOUT_CRITERION_KIND = ['above', 'below', 'band', 'exactly'] as const
export type ReadoutCriterionKind = (typeof READOUT_CRITERION_KIND)[number]

// How loud a log line is. `error` is something that needs a person, `warn` is something that
// recovered on its own, `info` is a measurement nobody has to act on. See lib/log.ts.
export const LOG_LEVEL = ['info', 'warn', 'error'] as const
export type LogLevel = (typeof LOG_LEVEL)[number]

// Every log line this app emits, named here so a line is greppable from the dashboard back to the
// code that wrote it.
export const LOG_EVENT = [
  'queue.enqueued',
  'queue.job_finished',
  'queue.job_failed',
  'queue.no_runner',
  'queue.reaped',
  'queue.read_failed',
  'queue.write_failed',
  'queue.enqueue_failed',
  'queue.reap_failed',
  'scrape.slot_acquired',
  'rate_limit.failed_open',
  'redis.error',
  // PageSpeed Insights answered with an error, timed out, or no key is configured. A warning: the
  // analysis continues without it and the report shows no PageSpeed section.
  'pagespeed.failed'
] as const
export type LogEvent = (typeof LOG_EVENT)[number]
