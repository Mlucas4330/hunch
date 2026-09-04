
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

// The two palettes in app/globals.css. A UI-only enum -- it is not a Postgres value and is never
// stored on a row, because the theme belongs to a browser rather than to a person: the same account
// reading a report on a laptop and a phone can reasonably want different answers.
export const THEME = ['light', 'dark'] as const
export type Theme = (typeof THEME)[number]

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

// What the owner decided about one recommendation. **Null is the third state and it is the common
// one**: nobody has decided yet, which is a different fact from having decided against. It is also
// the only judgement this product will ever hold about its own output, which is why it is stored at
// all -- see docs/data-model.md.
export const VERDICT = ['applied', 'dismissed'] as const
export type Verdict = (typeof VERDICT)[number]

// Who wrote a variant's copy. **The distance between what the model wrote and what the owner
// published is the most precise thing this product can know about its own quality**, and it costs
// nobody any labelling effort: it falls out of somebody using the tool. An owner's line is also the
// one thing on a report that was never generated, so nothing may present it as written by us.
export const VARIANT_AUTHOR = ['model', 'owner'] as const
export type VariantAuthor = (typeof VARIANT_AUTHOR)[number]

// A direction the owner can point a rewrite in, and a closed list because it reaches a prompt.
//
// **Every one of these constrains form and none of them asks for a fact.** That is the whole reason
// it is an enum rather than a text box: a free field would let "say we are the best in Brazil" reach
// the generator as an instruction, and the only defence would be a written rule, which is what has
// held nothing in this pipeline. See docs/ai-pipeline.md.
export const VARIANT_TONE = ['direct', 'shorter', 'concrete', 'informal'] as const
export type VariantTone = (typeof VARIANT_TONE)[number]

// The two tables a verdict can land on. `flow_fixes` carries both the flow list and the visibility
// one under its own `kind`, so two targets cover all three tabs.
export const VERDICT_TARGET = ['hypothesis', 'fix'] as const
export type VerdictTarget = (typeof VERDICT_TARGET)[number]

// The two shapes a route's loading shell can take: a grid of rows, or one analysis.
export const ROUTE_SKELETON = ['list', 'detail'] as const
export type RouteSkeleton = (typeof ROUTE_SKELETON)[number]

// The four "what to change" tabs -- see docs/product.md.
export const ANALYSIS_TAB = ['flow', 'copy', 'seo', 'ai'] as const
export type AnalysisTab = (typeof ANALYSIS_TAB)[number]

// The anchorable landmarks of the report, top to bottom. Each value is an element `id` on the page
// and the key `ReportRail` labels itself from.
//
// **The four in the middle are spread from ANALYSIS_TAB rather than retyped**, because they are the
// same four sections and a rail listing a section the page does not render -- or missing one it does
// -- is the exact failure a hand-kept copy produces the first time a tab is added.
//
// `start` and `terms` bracket them: the triage block that opens the document and the counted terms
// that close it. The cover is not here on purpose. It is the top of the page, so an anchor to it is
// what the browser already does, and a rail entry pointing at the thing directly above the rail
// reads as furniture. See docs/report.md.
export const REPORT_SECTION = ['start', 'readout', ...ANALYSIS_TAB, 'terms'] as const
export type ReportSection = (typeof REPORT_SECTION)[number]

// The second layer inside an open card. An open card shows the decision -- the rewritten line, or
// the sentence naming the problem -- and everything that argues for it sits behind one of these.
// One list for both card families: the copy card offers why/preview/alternates, the fix card
// why/steps, and `CardDrawers` renders whichever it is handed. See docs/components.md.
export const CARD_DRAWER = ['why', 'preview', 'alternates', 'steps'] as const
export type CardDrawer = (typeof CARD_DRAWER)[number]

// Which lists `FlowPlaybook` can render, and therefore which dictionary sections have to exist.
//
// **Written out rather than derived from FIX_KIND.** `visibility` is a FIX_KIND, the discriminator
// on the table, and it is the *parent* of the seo and ai lists, never a list itself: `splitVisibility`
// cuts it into those two and nothing ever renders it whole. Deriving from FIX_KIND would demand a
// `dictionary.visibility` that no call site can reach, and it would sit there as a near-copy of
// `dictionary.seo`. One word for the kind and for a section it never is: see the note on
// READOUT_GROUP.
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
// "still working" and must not reach the client as the same one. See docs/scraping.md.
export const JOB_STATUS = ['queued', 'running', 'ready', 'unavailable'] as const
export type JobStatus = (typeof JOB_STATUS)[number]

// The two that mean the work has not finished and has not given up. The report surface reads them to
// tell "this analysis is generating right now" apart from "nobody ever bought a generation for it",
// which the row alone cannot distinguish -- both are an owned row with no hypotheses. See
// docs/report.md.
export const JOB_IN_FLIGHT: readonly JobStatus[] = ['queued', 'running']

// Where one analysis stands, as far as anything outside the worker can tell.
//
// **One name instead of the four booleans the report was switching on.** `measured`, `generated`,
// ownership and "is a job in flight" are not independent -- most of their sixteen combinations cannot
// happen -- and every surface deriving its own answer from them is how the two analysis routes came
// to disagree about `generated` before they were merged into one. See docs/report.md.
//
// `failed` is the one that had no representation at all: a generation that threw refunded the credit
// and left a row indistinguishable from one nobody ever paid for, so the reader was shown the unlock
// wall and asked to buy a credit they had just had returned.
export const ANALYSIS_STATE = ['measuring', 'generating', 'failed', 'ready', 'locked'] as const
export type AnalysisState = (typeof ANALYSIS_STATE)[number]

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
  'lead',
  // One model call and no browser, written once per analysis and then read back from the column. Its
  // own kind rather than `variants` because a retry after a failed generation must not eat the
  // allowance for rewriting copy, which is the thing the reader actually paid for. See docs/api.md.
  'ad_ideas',
  // One update of one column. Its own kind because deciding on a list of five is five calls in a
  // row, and a reader working through a report must never spend the allowance that runs analyses.
  'verdict'
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

// Which side of its own threshold a finding is flagged on.
//
// **It exists because a bare number does not say which way to move.** "Signup form fields / 6" is a
// measurement the reader cannot act on: six could be four too many or two too few, and the severity
// colour says something is wrong without saying what. The direction is not a judgement anybody has
// to invent -- `measuredFindings` already picked a ranker and a number from READOUT_THRESHOLDS, and
// this is that choice carried out to the reader instead of thrown away. See docs/readout.md.
//
// `band` is `above_fold_ctas`, where both ends are bad: none at all is an alert and a crowd of them
// is a warning. `exactly` is `h1_count`, where anything but one is wrong in either direction.
export const READOUT_CRITERION_KIND = ['above', 'below', 'band', 'exactly'] as const
export type ReadoutCriterionKind = (typeof READOUT_CRITERION_KIND)[number]

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
  // Reporting a paid conversion back to Google Ads. `skipped` is the ordinary case and not a
  // failure: most buyers never came from an ad, so there is no click to report. `failed` is the one
  // that needs a person -- an expired refresh token reports nothing and changes nothing else, so
  // without a line here the channel goes blind silently. See docs/ads.md.
  'ads.conversion_uploaded',
  'ads.conversion_skipped',
  'ads.conversion_failed',
  // The lead sequence. `skipped` covers every ordinary reason a row is passed over -- unsubscribed,
  // already bought, consented under the older copy -- and stays at info, because passing rows over
  // is most of what the cron does. See docs/api.md.
  'lead.sequence_sent',
  'lead.sequence_skipped',
  'lead.sequence_failed',
  'lead.unsubscribed',
  // A reminder about a payment the provider still reports as pending. It moves no balance and never
  // could: `grantCredits` remains the only path that does. See docs/invariants.md.
  'billing.reminder_sent',
  'billing.reminder_failed',
  // Customer Match. The addresses leave hashed, so a failure here is a list that stopped growing
  // rather than anything exposed.
  'ads.audience_synced',
  'ads.audience_failed'
] as const
export type LogEvent = (typeof LOG_EVENT)[number]
