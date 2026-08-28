
// Granted from ADMIN_EMAIL at sign-in, never revoked by one. See docs/invariants.md.
export const USER_ROLE = ['user', 'admin'] as const
export type UserRole = (typeof USER_ROLE)[number]

// The ids Auth.js gives the OAuth providers. Each one must declare how its address is verified
// before it may key a user row -- see VERIFIED_EMAIL and docs/security.md.
export const OAUTH_PROVIDER = ['google', 'github'] as const
export type OAuthProvider = (typeof OAUTH_PROVIDER)[number]

// Who took the money. Written into `credit_transactions.provider` and `payment_events.provider`, so
// a value added here is a value those two columns start carrying. Both adapters end at
// `grantCredits` and neither touches a table -- see docs/invariants.md.
export const PAYMENT_PROVIDER = ['stripe', 'mercadopago'] as const
export type PaymentProvider = (typeof PAYMENT_PROVIDER)[number]

export const LOCALE = ['en', 'pt-BR'] as const
export type Locale = (typeof LOCALE)[number]

// The blog posts, in render order. A slug is the URL segment and the dictionary key at once, so a
// post added here fails typecheck until it is written in both locales. See docs/seo.md.
export const BLOG_SLUG = ['what-is-seo', 'what-is-copy', 'ai-is-the-new-google'] as const
export type BlogSlug = (typeof BLOG_SLUG)[number]

// The post the landing page's AI section links into.
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

// The four "what to change" tabs -- see docs/product.md.
export const ANALYSIS_TAB = ['flow', 'copy', 'seo', 'ai'] as const
export type AnalysisTab = (typeof ANALYSIS_TAB)[number]

// The second layer inside an open card. An open card shows the decision -- the rewritten line, or
// the sentence naming the problem -- and everything that argues for it sits behind one of these.
// One list for both card families: the copy card offers why/preview/alternates, the fix card
// why/steps, and `CardDrawers` renders whichever it is handed. See docs/components.md.
export const CARD_DRAWER = ['why', 'preview', 'alternates', 'steps'] as const
export type CardDrawer = (typeof CARD_DRAWER)[number]

// Which lists `FlowPlaybook` can render, and therefore which dictionary sections have to exist.
//
// **It used to be `[...FIX_KIND, 'seo', 'ai']`, and that was wrong twice over.** `visibility` is a
// FIX_KIND -- the discriminator on the table -- and it is the *parent* of the seo and ai lists, never
// a list itself: `splitVisibility` cuts it into those two and nothing ever renders it whole. Deriving
// from FIX_KIND therefore demanded a `dictionary.visibility` that no call site could reach, and the
// one that existed sat there as a near-copy of `dictionary.seo`, same eyebrow and all, until it was
// deleted. One word for the kind and for a section it never is: see the note on READOUT_GROUP.
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
  // **These two exist because the readout measured things nothing could fix.** The `mobile` and
  // `load` groups drag a page's score down, and until now no fix category could address either:
  // the report told a founder their page was slow and then offered nothing about it. A measurement
  // with no possible answer is a worse deliverable than not measuring at all.
  'mobile',
  'performance'
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

// `auto` resolves to a single element and can be swapped automatically for the variant preview;
// `manual` is applied by hand.
export const HYPOTHESIS_TARGET = ['auto', 'manual'] as const
export type HypothesisTarget = (typeof HYPOTHESIS_TARGET)[number]

// Why the balance moved. `purchase` and `refund` are the two directions a payment can push it;
// `unlock` is the one thing that spends. See docs/data-model.md.
// Why a balance moved. `grant` is an operator handing credits over with no payment behind them --
// comping a customer, or repairing a payment whose webhook never landed. It is its own reason rather
// than a `purchase` with a special provider **because the ledger's whole job is being auditable**,
// and a row saying `purchase` for something nobody bought is the one lie that makes the rest of the
// table worth less. See docs/data-model.md.
export const CREDIT_REASON = ['purchase', 'unlock', 'refund', 'grant'] as const
export type CreditReason = (typeof CREDIT_REASON)[number]

// What a queued job is doing. `unavailable` is not an error state: it means the work can never
// succeed for this input (a manual hypothesis, a stale selector), which is a different answer from
// "still working" and used to reach the client as the same one. See docs/scraping.md.
export const JOB_STATUS = ['queued', 'running', 'ready', 'unavailable'] as const
export type JobStatus = (typeof JOB_STATUS)[number]

// What a subscription is doing, in the provider's own vocabulary rather than a translation of it.
// Mercado Pago's preapproval reports exactly these, and storing its word avoids a mapping that has
// to be re-derived every time a provider adds a state. `authorized` is the only one that entitles
// anything -- see lib/subscriptions.ts.
export const SUBSCRIPTION_STATUS = ['pending', 'authorized', 'paused', 'cancelled'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number]

// A provider is free to invent a state we have never seen, and the webhook must not guess when it
// does. See the status handling in the Mercado Pago webhook.
export function isSubscriptionStatus(value: unknown): value is SubscriptionStatus {
  return SUBSCRIPTION_STATUS.includes(value as SubscriptionStatus)
}

// Abuse gates. Windows live in RATE_LIMITS, so a kind added here fails typecheck until it is given
// one.
export const RATE_LIMIT_KIND = [
  'analysis',
  'variants',
  'screenshot',
  // Its own kind rather than `analysis`: the backfill spends no allowance. See docs/api.md.
  'measure',
  // Polling must not spend the budget the work itself spends: at a few seconds an interval, one
  // preview would burn the screenshot quota on its own. See docs/scraping.md.
  'job_status',
  'signin',
  // Creating a payment is one call to the provider and no browser, so the budget is loose. It is its
  // own kind because a failed card retried three times must not spend the analysis allowance.
  'billing',
  // Leaving an address costs one insert and one email, never a browser slot or a token. Its own kind
  // so that someone correcting a typo in their address never spends the analysis allowance the same
  // IP is about to need. See docs/api.md.
  'lead'
] as const
export type RateLimitKind = (typeof RATE_LIMIT_KIND)[number]

// The questions the brief asks, in the order the form shows them. `analyses.brief` is one free
// text column and stays one: these are prompts composed into it rather than columns of their own,
// so nothing here needs a migration and a brief written before them still reads back whole.
// See lib/brief.ts.
export const BRIEF_FIELD = ['audience', 'offer', 'action', 'objection'] as const
export type BriefField = (typeof BRIEF_FIELD)[number]

// The answers each question offers, before anyone types anything. Tapping one is the whole
// interaction, so the lists are short: past about five the step stops being a choice and becomes a
// form again.
//
// These are ids, never text. What the reader taps is the sentence in
// dictionary.urlForm.briefFields[field].options[id], and what reaches the brief is that sentence --
// so an option is translated like every other string and the id never leaves the client. A reader
// whose answer is not here picks BRIEF_OTHER and writes it, which is the case the presets exist to
// make rare rather than to rule out -- "something else" is a mode the step is in, not an entry here.
export const BRIEF_OPTION = {
  audience: ['consumers', 'smb', 'enterprise', 'developers', 'creators'],
  offer: ['saas', 'service', 'ecommerce', 'course', 'marketplace'],
  action: ['signup', 'demo', 'purchase', 'waitlist', 'contact'],
  objection: ['price', 'trust', 'unclear', 'switching', 'effort']
} as const satisfies Record<BriefField, readonly string[]>


// What the landing page's live feed may say about a row, and the whole of it. Both states are read
// off columns rather than stored: `running` is a row with no measurement yet, `done` is one with a
// measurement. There is no `failed` because nothing here is entitled to guess why a row is empty --
// past PULSE_RUNNING_MAX_AGE_MS the feed drops it instead. See docs/analysis-ui.md.
export const PULSE_STATE = ['running', 'done'] as const
export type PulseState = (typeof PULSE_STATE)[number]

// The only numbers the product may show. measuredFindings (lib/readout.ts) may emit no id outside
// this list, and every id has a sentence in dictionary.readout. See docs/readout.md.
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
  'mobile_above_fold_ctas'
] as const
export type ReadoutFinding = (typeof READOUT_FINDING)[number]

// Three states, not two: `ok` is what makes the section an audit rather than a hit piece.
export const READOUT_SEVERITY = ['ok', 'warn', 'alert'] as const
export type ReadoutSeverity = (typeof READOUT_SEVERITY)[number]

// Also the render order. `crawler_access` is skipped whole when robots.txt could not be read, because
// "we could not check" is not "they block AI crawlers". See docs/invariants.md.
//
// **Three of these are named to avoid a collision, not for elegance.** `credibility`, `declared` and
// `crawler_access` were once `trust`, `metadata` and `visibility` -- and each of those words already
// names something else on the same screen: `trust` and `metadata` are fix categories, and
// `visibility` is the FIX_KIND that parents BOTH the seo and ai tabs, a wider scope than the group
// ever had. One word meaning two things in one report is how a reader concludes the page is saying
// everything twice. See docs/readout.md.
//
// `credibility` and `mobile` are skipped the same way and for the same reason: a row measured before those
// passes existed carries no value for them, and a group of zeroes would report never-measured as
// wrong. Every group here is all or nothing.
export const READOUT_GROUP = [
  'structure',
  'credibility',
  'mobile',
  'declared',
  'crawler_access',
  'load'
] as const
export type ReadoutGroup = (typeof READOUT_GROUP)[number]

// `flow_fixes.finding` is a `text` column rather than a pgEnum -- see the note on it in db/schema.ts --
// so a value read back is a plain string and has to be narrowed before it can key anything. This is
// the price of that choice, paid in one place.
export function isReadoutFinding(value: unknown): value is ReadoutFinding {
  return READOUT_FINDING.includes(value as ReadoutFinding)
}

export const READOUT_UNIT = ['count', 'seconds', 'megabytes', 'presence'] as const
export type ReadoutUnit = (typeof READOUT_UNIT)[number]

// How loud a log line is. `error` is something that needs a person, `warn` is something that
// recovered on its own, `info` is a measurement nobody has to act on. See lib/log.ts.
export const LOG_LEVEL = ['info', 'warn', 'error'] as const
export type LogLevel = (typeof LOG_LEVEL)[number]

// Every log line this app emits, named here so a line is greppable from the dashboard back to the
// code that wrote it. Free-form messages drifted into four spellings of the same event, which is
// what made the existing `console.error` calls impossible to count.
//
// The three that carry a number rather than a failure are the ones the queue had no answer for:
// how deep the queue was when work arrived, how long a job waited for a browser slot, and how long
// it then took. See docs/scraping.md.
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
  'rate_limit.refused_closed',
  'rate_limit.failed_open',
  'redis.error',
  'email.sent',
  'email.failed',
  // No credentials on this deploy. A warning rather than an error: local dev runs without them, and
  // a form that failed because nobody set an API key would fail on every machine but production.
  'email.skipped',
  'lead.failed',
  'subscription.created_failed',
  'subscription.cancel_failed',
  'subscription.activated',
  'subscription.status_changed',
  'subscription.renewed',
  'subscription.unmatched',
  'remeasure.swept',
  'remeasure.measured',
  'remeasure.failed'
] as const
export type LogEvent = (typeof LOG_EVENT)[number]
