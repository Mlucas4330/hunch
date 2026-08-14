import type {
  ExperimentDuration,
  ExperimentRecommendation,
  ExperimentStatus,
  FlowCategory,
  HypothesisStatus,
  LeadSource,
  Locale,
  Market,
  RateLimitKind,
  ReadoutSeverity,
  Section,
  SubscriptionPlan,
  UserRole,
  VariantStatus
} from '@/lib/enums'

// Only reached when NEXT_PUBLIC_APP_URL is unset: local dev and the e2e run.
export const FALLBACK_APP_ORIGIN = 'http://localhost:3000'

// Shared by middleware.ts and app/robots.ts so the two can never drift.
export const PROTECTED_PREFIXES = ['/dashboard', '/analyses', '/admin']

export const POST_SIGNIN_REDIRECT = '/dashboard'

// Where every paid-plan prompt sends the reader. See docs/invariants.md.
export const CONTACT_PATH = '/#contact'

export const CALLBACK_URL_PARAM = 'callbackUrl'

// The founder's own channels, in the site footer. Never on a report surface -- see
// docs/components.md.
export const LINKEDIN_URL = 'https://www.linkedin.com/in/lucas-medeiros-dev'

// wa.me takes the number in E.164 without the plus.
export const WHATSAPP_NUMBER = '5551989431913'
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_COOKIE = 'locale'

// localStorage rather than a cookie: nothing server-side reads it.
export const UPGRADE_PROMPT_DISMISSED_KEY = 'hunch.upgrade-prompt.dismissed'

// Never translated.
export const LOCALE_LABEL: Record<Locale, string> = {
  en: 'EN',
  'pt-BR': 'PT'
}

export const AI_OUTPUT_LANGUAGE: Record<Locale, string> = {
  en: 'English',
  'pt-BR': 'Brazilian Portuguese (pt-BR)'
}

// A UI preference, not a session: it outlives sign-out and is never tied to the user row.
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const DEFAULT_MARKET: Market = 'us'

// `user_location` on the web search tool. ISO 3166-1 alpha-2 + IANA, the shape the tool accepts.
export const MARKET_SEARCH_LOCATION: Record<Market, { country: string; timezone: string }> = {
  us: { country: 'US', timezone: 'America/New_York' },
  br: { country: 'BR', timezone: 'America/Sao_Paulo' }
}

// Prompt input, so it is written in the prompts' language and never translated.
export const MARKET_NAME: Record<Market, string> = {
  us: 'the United States',
  br: 'Brazil'
}

// Every signal is decisive on its own, which is why the list is short -- see docs/invariants.md.
// `langExceptions` keeps Portugal out of a prefix match on `pt`; matched lowercased.
export const MARKET_SIGNALS: Record<
  Exclude<Market, 'us'>,
  { tlds: string[]; langPrefixes: string[]; langExceptions: string[] }
> = {
  br: {
    tlds: ['.br'],
    langPrefixes: ['pt'],
    langExceptions: ['pt-pt']
  }
}

// Crawlers that feed AI answers, checked against the page's robots.txt.
export const AI_CRAWLER_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended',
  'CCBot'
]

// Short: it runs alongside competitor research and must never be what makes an analysis slow.
export const ROBOTS_FETCH_TIMEOUT_MS = 5_000

// A robots.txt larger than this is not a robots.txt. The far end is not ours.
export const ROBOTS_MAX_BYTES = 512 * 1024

// Hops are followed by hand to re-validate each one, so the depth is bounded here, not by fetch.
// Enough for the http -> https -> www chains that are the reason redirects are followed at all.
export const ROBOTS_MAX_REDIRECTS = 3

// See lib/url-guard.ts.
export const ALLOWED_SCRAPE_PROTOCOLS = ['http:', 'https:']

export const ALLOWED_SCRAPE_PORTS = [80, 443, 8080]

// Resolve inside the deploy no matter what DNS says.
export const BLOCKED_HOST_SUFFIXES = ['localhost', '.localhost', '.local', '.internal', '.home.arpa']

// One scrape touches many subresources on few hosts; long enough to resolve each once, short
// enough that a verdict never goes stale across analyses.
export const HOST_RESOLUTION_CACHE_TTL_MS = 60 * 1000

// A real desktop fold. captureElements, aboveFoldCtaCount and the preview image all measure
// against it, so it cannot be left at Puppeteer's 800x600 default.
export const SCRAPE_VIEWPORT = { width: 1280, height: 800 }

export const SCRAPE_NAVIGATION_TIMEOUT_MS = 30_000

// Calibrated against a real ~8s cold-start skeleton; 10s lost the race intermittently. Generous on
// purpose -- a fast page never spends it. See docs/scraping.md.
export const SCRAPE_SETTLE_TIMEOUT_MS = 25_000

export const SCRAPE_SETTLE_POLL_MS = 250

// Below this the text is a skeleton, not a landing page: still rendering, not settled.
export const SCRAPE_SETTLE_MIN_TEXT_LENGTH = 200

// A countdown or a live counter rewrites a few characters forever, so settling is "stopped
// changing meaningfully" rather than "identical".
export const SCRAPE_SETTLE_TEXT_TOLERANCE = 8

// Past this it is padding, and an unbounded response exhausts the function's memory.
export const SCRAPE_MAX_RESPONSE_BYTES = 25 * 1024 * 1024

// Media, websockets and prefetches only cost time. `preflight` is here because blocking the OPTIONS
// stops the real request for a CORS-served stylesheet or webfont, rendering the page unstyled -- and
// it is not a hole in the guard, since isPublicUrl runs on a preflight like any other request.
export const SCRAPE_ALLOWED_RESOURCE_TYPES = [
  'document',
  'stylesheet',
  'image',
  'font',
  'script',
  'xhr',
  'fetch',
  'preflight',
  'other'
]

// A screenshot is judged on how it looks, so it waits for webfonts after the text settles.
// Fail-soft: an asset that never resolves costs this budget, never the screenshot.
export const SCRAPE_ASSET_READY_TIMEOUT_MS = 3_000

export const SCRAPE_PAINT_SETTLE_MS = 250

// Tabs on the single shared `browser` service are the scarce resource, and per process only equals
// per deploy because railway.json pins numReplicas: 1. See docs/scraping.md.
export const SCRAPE_MAX_CONCURRENT_PAGES = 3

// Asymmetric by call site: a preview that gives up degrades to a retry button and costs nothing.
export const SCREENSHOT_QUEUE_MAX_WAIT_MS = 5_000

// An analysis has already committed to a Sonnet call and needs several slots at once, so it waits.
export const SCRAPE_QUEUE_MAX_WAIT_MS = 120_000

// Long enough for a restarting container to listen on CDP, short enough that an absent
// BROWSER_URL still fails the request rather than stalling it.
export const BROWSER_CONNECT_RETRY_DELAY_MS = 1_000

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS

// Sized by what each route costs us, not by what a plan allows. The tracking routes carry a landing
// page's real traffic and must stay generous enough that a busy customer is never throttled.
export const RATE_LIMITS: Record<RateLimitKind, { tokens: number; windowMs: number }> = {
  analysis: { tokens: 5, windowMs: HOUR_MS },
  variants: { tokens: 20, windowMs: HOUR_MS },
  experiment: { tokens: 30, windowMs: HOUR_MS },
  screenshot: { tokens: 10, windowMs: HOUR_MS },
  // Looser than `analysis` because it buys no generation, tighter than `variants` because it
  // opens a browser.
  measure: { tokens: 10, windowMs: HOUR_MS },
  waitlist: { tokens: 5, windowMs: HOUR_MS },
  // Loose: it gates nothing but noise in the operator's own follow-up signal, and one reader
  // reloading a report is normal.
  report_view: { tokens: 60, windowMs: HOUR_MS },
  track_event: { tokens: 120, windowMs: MINUTE_MS },
  track_config: { tokens: 300, windowMs: MINUTE_MS },
  signin: { tokens: 5, windowMs: 15 * MINUTE_MS }
}

// Same-origin, so no next/image remote pattern and img-src 'self' already covers them.
export const SCREENSHOT_PUBLIC_PATH = '/screenshots'

// Exactly what saveScreenshot() writes. An allowlist, not a sanitizer: no separator or dot segment
// survives it. See docs/security.md.
export const SCREENSHOT_FILENAME_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.png$/

// It cannot be made an LRU instead: serving a file does not touch its mtime, and atime on a network
// volume is not dependable. See docs/deployment.md.
export const SCREENSHOT_RETENTION_DAYS = 30

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export const FREE_ANALYSES_LIMIT = 3

export const FREE_EXPERIMENTS_LIMIT = 1

export const DEFAULT_EXPERIMENT_DURATION: ExperimentDuration = 14

// How many hypotheses the public report shows in full before the wall.
export const REPORT_PREVIEW_LIMIT = 3

// Lower than the hypothesis limit: a fix card carries its whole steps list, so two fill a screen.
export const REPORT_FIX_PREVIEW_LIMIT = 2

// What the button promises before the click. The wait is long enough to state rather than hide.
export const PREVIEW_ESTIMATE_SECONDS = 15

// Everything not covered by a timeout below: two DNS lookups, the CDP connect, the page.evaluate
// round trips, writing the PNG, two queries.
const PREVIEW_TIMEOUT_SLACK_MS = 15_000

// Derived, never written down: a literal is wrong the first time a budget under it moves. The
// deadlines are additive -- settlePage only starts counting once goto has returned.
export const PREVIEW_REQUEST_TIMEOUT_MS =
  SCREENSHOT_QUEUE_MAX_WAIT_MS +
  SCRAPE_NAVIGATION_TIMEOUT_MS +
  SCRAPE_SETTLE_TIMEOUT_MS +
  SCRAPE_ASSET_READY_TIMEOUT_MS +
  SCRAPE_PAINT_SETTLE_MS +
  PREVIEW_TIMEOUT_SLACK_MS

// The wait here is the scrape's, not a request's, so it is stated rather than hidden.
export const MEASURE_ESTIMATE_SECONDS = 20

// Everything not covered by a deadline below: two DNS lookups, the CDP connect, the three readouts'
// round trips, the LCP observer handoff, one update.
const MEASURE_TIMEOUT_SLACK_MS = 10_000

// Derived like PREVIEW_REQUEST_TIMEOUT_MS. The queue wait is the scrape's generous one, because
// measuring goes through scrapePage rather than failing fast the way a preview does.
export const MEASURE_REQUEST_TIMEOUT_MS =
  SCRAPE_QUEUE_MAX_WAIT_MS +
  SCRAPE_NAVIGATION_TIMEOUT_MS +
  SCRAPE_SETTLE_TIMEOUT_MS +
  MEASURE_TIMEOUT_SLACK_MS

// Guards a matching heuristic, so it stays tight: being wrong means snapping a long merged string
// onto a tiny element. NOT the same as VARIANT_WORD_BUDGET_RATIO below.
export const TARGET_MATCH_MAX_WORD_RATIO = 1.3

// Anything wordier is prose with a link in it, not a CTA. Feeds captureStructure's above-fold CTA
// count for the readout -- it has nothing to do with conversion goals, despite the name.
export const GOAL_CANDIDATE_MAX_WORDS = 8

// What a conversion is: the one element the site owner marked. Unbranded on purpose -- it lands in a
// white-labelled client's source permanently, where the agency cannot strip it. Duplicated as a
// literal in public/embed.js, which cannot import from lib/.
export const GOAL_ATTRIBUTE = 'data-ab-goal'
export const GOAL_TARGET_SELECTOR = `[${GOAL_ATTRIBUTE}]`

// A writing constraint, deliberately looser than TARGET_MATCH_MAX_WORD_RATIO above -- do not
// unify them. The floor exists because a pure ratio is nonsense at the short end: a 2-word CTA at
// 1.5x is 3 words, which forbids "Start free, no card required".
export const VARIANT_WORD_BUDGET_RATIO = 1.5

export const VARIANT_WORD_BUDGET_FLOOR = 3

// How far past its current last line an unclipped element is assumed to be able to grow. One line:
// enough that a headline is not frozen at its exact current length, small enough that the copy the
// model writes still lands in the shape the designer drew. An element inside a clipping ancestor
// ignores this and gets the real free height instead.
export const VARIANT_GROWTH_LINES = 1

// Fallback ratio of line height to font size, for the elements whose computed lineHeight is the
// keyword `normal` rather than a length.
export const NORMAL_LINE_HEIGHT_RATIO = 1.2

// Fitting the swapped copy back into a box that clips it. Steps are multiplicative on the element's
// own computed font size, so the shrink is relative to whatever the designer set.
export const FIT_STEP_RATIO = 0.94

// Past this the preview stops being a picture of the page. An element still clipping at the floor is
// reported as an overflow rather than shrunk into illegibility.
export const FIT_MIN_SCALE = 0.7

// Subpixel layout noise. A box is not "clipping" because it is a third of a pixel short.
export const FIT_TOLERANCE_PX = 1

export const GOAL_CANDIDATE_LIMIT = 12

// The recommendation plus its two alternates, which are written on demand. See docs/ai-pipeline.md.
export const VARIANTS_PER_HYPOTHESIS = 3

// Bounded because a founder acts on a short list, and the playbook shares the generation budget.
export const PLAYBOOK_MIN = 3

export const PLAYBOOK_MAX = 6

export const PLAYBOOK_STEPS_MAX = 5

// No minimum, unlike PLAYBOOK_MIN: zero findings is a correct answer. See docs/ai-pipeline.md.
export const VISIBILITY_MAX = 6

// A handoff, not a measurement window: buffered LCP entries arrive on a task after observe()
// returns. See docs/scraping.md.
export const SCRAPE_LCP_FLUSH_MS = 50

// Also the correct backfill: the wall was the only thing writing leads before the contact form.
export const DEFAULT_LEAD_SOURCE: LeadSource = 'report'

export const DEFAULT_USER_ROLE: UserRole = 'user'

// The one role sign-in may grant. See docs/invariants.md.
export const ADMIN_ROLE: UserRole = 'admin'

// The readout measures in bytes and milliseconds and converts once, at the render edge.
export const BYTES_PER_MEGABYTE = 1024 * 1024

export const MS_PER_SECOND = 1000

// These decide a finding's colour and nothing else -- what is rendered is always the page's own
// value. Deliberately loose: a false alert is the expensive error. See docs/readout.md.
export const READOUT_THRESHOLDS = {
  // Email + password is 2, so 4 already asks for things a landing page does not need.
  formFieldsWarn: 4,
  formFieldsAlert: 7,
  // Past four, the "primary" action is whichever one they happen to see first.
  aboveFoldCtasWarn: 5,
  navLinksWarn: 8,
  navLinksAlert: 14,
  // Read by rankBelow: at or under the number is already the bad side. A landing page under 300
  // words has nothing for a reader to weigh and nothing for a crawler to quote.
  wordCountWarn: 300,
  wordCountAlert: 120,
  headingCountWarn: 3,
  internalLinksWarn: 3,
  // Google's own "good" and "poor" boundaries for each. Generous when measured from a datacenter,
  // which is the intended direction.
  ttfbWarnMs: 800,
  ttfbAlertMs: 1_800,
  fcpWarnMs: 1_800,
  fcpAlertMs: 3_000,
  lcpWarnMs: 2_500,
  lcpAlertMs: 4_000,
  pageWeightWarnBytes: 2 * BYTES_PER_MEGABYTE,
  pageWeightAlertBytes: 5 * BYTES_PER_MEGABYTE,
  requestCountWarn: 75,
  requestCountAlert: 150
} as const

// The sparkline's own coordinate space, scaled by the viewBox. Padding leaves room for the end dot
// and its surface ring so neither is clipped at the edge.
export const TREND_CHART = { width: 240, height: 48, padding: 6, dotRadius: 4 } as const

export const TREND_SCORE_MAX = 100

// How far back the trend reads. A landing page re-measured weekly gives this about three months,
// which is longer than any conversation about it.
export const SNAPSHOT_HISTORY_MAX = 12

// Analyses re-measured per cron run. Each one opens a real browser against a customer's page, so
// this is a cost ceiling, not a page size.
export const REMEASURE_BATCH_MAX = 20

// A page measured more recently than this is left alone, so a manual re-measure is never
// immediately followed by the cron taking another one.
export const REMEASURE_MIN_AGE_MS = 6 * 24 * 60 * 60 * 1000

// Named so the schema's fallback is not a bare literal. See docs/ai-pipeline.md.
export const SECTION_FALLBACK: Section = 'other'

// Enough to cover a landing page's outline without carrying a nav-generated wall of h3s into a
// jsonb column. Truncated per heading for the same reason.
export const SEO_HEADINGS_MAX = 40

export const SEO_HEADING_MAX_CHARS = 200

// How many terms the keyword table shows. Past ten it stops being a reading and starts being a dump.
export const KEYWORD_TERMS_MAX = 10

// A term appearing once is noise, not a theme the page is built around.
export const KEYWORD_MIN_COUNT = 2

// Bigrams as well as single words, because "landing page" is one term and two words.
export const KEYWORD_MAX_WORDS = 2

// Both languages in one list, like STRUCTURE_PATTERNS: the page's language is not known until the
// scrape, and a Portuguese stopword is never an English keyword. Accents kept -- pt-BR needs them.
export const KEYWORD_STOPWORDS = [
  'a', 'about', 'after', 'all', 'also', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been', 'but',
  'by', 'can', 'do', 'does', 'for', 'from', 'get', 'has', 'have', 'how', 'if', 'in', 'into', 'is',
  'it', 'its', 'just', 'like', 'make', 'may', 'more', 'most', 'no', 'not', 'now', 'of', 'on', 'one',
  'only', 'or', 'other', 'our', 'out', 'over', 'own', 'see', 'so', 'some', 'than', 'that', 'the',
  'their', 'them', 'then', 'there', 'these', 'they', 'this', 'to', 'up', 'us', 'use', 'was', 'we',
  'what', 'when', 'which', 'who', 'why', 'will', 'with', 'you', 'your',
  'ao', 'aos', 'as', 'até', 'com', 'como', 'da', 'das', 'de', 'dele', 'dela', 'deles', 'do', 'dos',
  'e', 'ele', 'ela', 'eles', 'em', 'entre', 'era', 'essa', 'esse', 'esta', 'este', 'eu', 'foi',
  'isso', 'já', 'la', 'lhe', 'mais', 'mas', 'me', 'mesmo', 'meu', 'muito', 'na', 'nas', 'nao',
  'não', 'nem', 'no', 'nos', 'nós', 'num', 'numa', 'o', 'os', 'ou', 'para', 'pela', 'pelo', 'por',
  'porque', 'qual', 'quando', 'que', 'quem', 'se', 'sem', 'ser', 'seu', 'seus', 'só', 'sua', 'suas',
  'também', 'te', 'tem', 'ter', 'teu', 'todo', 'todos', 'tu', 'um', 'uma', 'voce', 'você', 'vocês'
]

// Detection patterns, not domain values -- matched case-insensitively.
export const OAUTH_PROVIDER_PATTERNS: Record<string, string[]> = {
  google: ['google'],
  github: ['github'],
  microsoft: ['microsoft', 'azure', 'office 365'],
  apple: ['apple'],
  facebook: ['facebook', 'meta'],
  linkedin: ['linkedin'],
  slack: ['slack'],
  sso: ['sso', 'single sign on', 'saml', 'okta']
}

// Matched case-insensitively against element text, headings or iframe sources. A provider name
// alone is never social sign in, so `auth` has to match on the same control.
export const STRUCTURE_PATTERNS = {
  auth: ['sign in', 'signin', 'sign up', 'signup', 'log in', 'login', 'continue with', 'register'],
  faq: ['faq', "faq's", 'frequently asked', 'common questions', 'questions', 'perguntas'],
  pricing: ['pricing', 'plans', 'price', 'preco', 'precos', 'planos'],
  testimonials: ['testimonial', 'customers say', 'loved by', 'what our', 'reviews', 'depoimentos'],
  videoHosts: ['youtube.com', 'youtu.be', 'vimeo.com', 'loom.com', 'wistia', 'mux.com']
}

// Satori parses neither oklch() nor a CSS variable, so these mirror the tokens in globals.css as
// sRGB hex -- the only place a hex value is legitimate. Keep them in step.
export const OG_COLORS = {
  ink: '#1b1d24',
  paper: '#fbfbfd',
  rule: '#e2e2e7',
  mutedForeground: '#6c6f7d',
  purple: '#7c3aed',
  coral: '#ef5a3f'
}

export const OG_IMAGE_SIZE = { width: 1200, height: 630 }

// Named explicitly because a page setting its own `openGraph` replaces the root layout's entirely,
// taking the file-convention image with it. See docs/seo.md.
export const DEFAULT_OG_IMAGE_PATH = '/opengraph-image'

// One measure for every surface: the navbar, the app pages and both reports. See docs/components.md.
export const CONTAINER_CLASS = 'mx-auto w-full max-w-5xl px-4'

// Semantic token utilities from app/globals.css -- never raw Tailwind colors or hex values.
export const SECTION_BADGE_CLASS: Record<Section, string> = {
  headline: 'bg-purple/15 text-purple',
  subheadline: 'bg-purple/10 text-purple-soft',
  cta: 'bg-coral/15 text-coral',
  social_proof: 'bg-teal/15 text-teal',
  pricing: 'bg-amber/15 text-amber',
  features: 'bg-blue/15 text-blue',
  hero_image: 'bg-neutral/15 text-neutral',
  navigation: 'bg-neutral/15 text-neutral',
  other: 'bg-neutral/15 text-neutral'
}

export const SECTION_SELECTED_CLASS: Record<Section, string> = {
  headline: 'border-purple bg-purple/15 ring-2 ring-purple',
  subheadline: 'border-purple-soft bg-purple/10 ring-2 ring-purple-soft',
  cta: 'border-coral bg-coral/15 ring-2 ring-coral',
  social_proof: 'border-teal bg-teal/15 ring-2 ring-teal',
  pricing: 'border-amber bg-amber/15 ring-2 ring-amber',
  features: 'border-blue bg-blue/15 ring-2 ring-blue',
  hero_image: 'border-neutral bg-neutral/15 ring-2 ring-neutral',
  navigation: 'border-neutral bg-neutral/15 ring-2 ring-neutral',
  other: 'border-neutral bg-neutral/15 ring-2 ring-neutral'
}

export const SECTION_DOT_CLASS: Record<Section, string> = {
  headline: 'bg-purple',
  subheadline: 'bg-purple-soft',
  cta: 'bg-coral',
  social_proof: 'bg-teal',
  pricing: 'bg-amber',
  features: 'bg-blue',
  hero_image: 'bg-neutral',
  navigation: 'bg-neutral',
  other: 'bg-neutral'
}

// Hues repeat across the two families on purpose: they never render in the same list.
export const FLOW_CATEGORY_BADGE_CLASS: Record<FlowCategory, string> = {
  signup_friction: 'bg-coral/15 text-coral',
  cta_placement: 'bg-purple/15 text-purple',
  decision_load: 'bg-blue/15 text-blue',
  objections: 'bg-teal/15 text-teal',
  trust: 'bg-green/15 text-green',
  pricing_clarity: 'bg-amber/15 text-amber',
  page_structure: 'bg-neutral/15 text-neutral',
  indexability: 'bg-coral/15 text-coral',
  metadata: 'bg-purple/15 text-purple',
  structured_data: 'bg-blue/15 text-blue',
  ai_answerability: 'bg-teal/15 text-teal'
}

// Green is load-bearing: a report that is all coral reads as a sales pitch.
export const READOUT_SEVERITY_CLASS: Record<ReadoutSeverity, string> = {
  ok: 'bg-green/15 text-green',
  warn: 'bg-amber/15 text-amber',
  alert: 'bg-coral/15 text-coral'
}

// The same three states as a solid fill, for the score bars.
export const READOUT_SEVERITY_FILL_CLASS: Record<ReadoutSeverity, string> = {
  ok: 'bg-green',
  warn: 'bg-amber',
  alert: 'bg-coral'
}

// What each severity is worth to the score. A warn is half a finding, not a failure: the whole point
// of three states is that the middle one is not the bottom one.
export const READOUT_SEVERITY_POINTS: Record<ReadoutSeverity, number> = {
  ok: 1,
  warn: 0.5,
  alert: 0
}

// Read downward, like rankBelow: at or under the number is already that side. Looser than the
// finding thresholds on purpose -- a page can afford a few warns and still be in good shape.
export const READOUT_SCORE_THRESHOLDS = {
  warnAtOrBelow: 80,
  alertAtOrBelow: 50
} as const

// `contact` is green: it means someone asked to talk, in a list dominated by wall hits.
export const LEAD_SOURCE_BADGE_CLASS: Record<LeadSource, string> = {
  report: 'bg-neutral/15 text-neutral',
  contact: 'bg-green/15 text-green'
}

export const PLAN_BADGE_CLASS: Record<SubscriptionPlan, string> = {
  free: 'bg-neutral/15 text-neutral',
  pro: 'bg-purple/15 text-purple'
}

export const HYPOTHESIS_STATUS_BADGE_CLASS: Record<HypothesisStatus, string> = {
  pending: 'bg-neutral/15 text-neutral',
  testing: 'bg-amber/15 text-amber',
  completed: 'bg-green/15 text-green',
  skipped: 'bg-neutral/10 text-muted-foreground'
}

export const VARIANT_STATUS_BADGE_CLASS: Record<VariantStatus, string> = {
  proposed: 'bg-neutral/15 text-neutral',
  testing: 'bg-amber/15 text-amber',
  winner: 'bg-green/15 text-green',
  rejected: 'bg-red/15 text-red'
}

export const EXPERIMENT_STATUS_BADGE_CLASS: Record<ExperimentStatus, string> = {
  running: 'bg-amber/15 text-amber',
  stopped: 'bg-neutral/15 text-neutral',
  completed: 'bg-green/15 text-green'
}

export const EXPERIMENT_RECOMMENDATION_BADGE_CLASS: Record<ExperimentRecommendation, string> = {
  ship_variant: 'bg-green/15 text-green',
  keep_control: 'bg-neutral/15 text-neutral',
  inconclusive: 'bg-amber/15 text-amber'
}

export function impactScoreBadgeClass(score: number): string {
  if (score >= 8) return 'bg-coral/15 text-coral'
  if (score >= 5) return 'bg-amber/15 text-amber'
  return 'bg-neutral/15 text-neutral'
}

export function effortScoreBadgeClass(score: number): string {
  if (score <= 3) return 'bg-green/15 text-green'
  if (score <= 6) return 'bg-amber/15 text-amber'
  return 'bg-red/15 text-red'
}

export function impactScoreFillClass(score: number): string {
  if (score >= 8) return 'bg-coral'
  if (score >= 5) return 'bg-amber'
  return 'bg-neutral'
}

export function effortScoreFillClass(score: number): string {
  if (score <= 3) return 'bg-green'
  if (score <= 6) return 'bg-amber'
  return 'bg-red'
}

// A default, never a state the reader is stuck in -- every row can still be closed.
export const HYPOTHESIS_EXPANDED_COUNT = 3
// Fewer: playbook cards are the tallest thing on the page once the steps list is showing.
export const PLAYBOOK_EXPANDED_COUNT = 2
