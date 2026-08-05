import type {
  ExperimentRecommendation,
  ExperimentStatus,
  FlowCategory,
  HypothesisStatus,
  Locale,
  RateLimitKind,
  Section,
  SubscriptionPlan,
  VariantStatus
} from '@/lib/enums'

// Only reached when NEXT_PUBLIC_APP_URL is unset, which is local dev and the e2e run. In production
// it is what canonical, Open Graph and sitemap URLs are built from, so it must be set there.
export const FALLBACK_APP_ORIGIN = 'http://localhost:3000'

// Session-gated page prefixes. Middleware redirects them when signed out and robots.txt disallows
// them, so the two can never drift.
export const PROTECTED_PREFIXES = ['/dashboard', '/analyses', '/billing', '/admin']

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_COOKIE = 'locale'

// Language names stay in their own language -- never translated.
export const LOCALE_LABEL: Record<Locale, string> = {
  en: 'EN',
  'pt-BR': 'PT'
}

// How each locale is named to the model when it is told which language to write the analysis in.
export const AI_OUTPUT_LANGUAGE: Record<Locale, string> = {
  en: 'English',
  'pt-BR': 'Brazilian Portuguese (pt-BR)'
}

// A language choice is a UI preference, not a session: it outlives sign-out and belongs to the
// browser, so it is never tied to the user row.
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

// Outbound scraping is driven by user-supplied URLs, so every hop is validated against these before
// a browser is pointed at it. See lib/url-guard.ts.
export const ALLOWED_SCRAPE_PROTOCOLS = ['http:', 'https:']

export const ALLOWED_SCRAPE_PORTS = [80, 443, 8080]

// Hostnames that resolve inside the deploy no matter what DNS says.
export const BLOCKED_HOST_SUFFIXES = ['localhost', '.localhost', '.local', '.internal', '.home.arpa']

// One scrape touches many subresources on a handful of hosts; resolving each host once per scrape
// keeps the guard off the critical path without letting a verdict go stale across analyses.
export const HOST_RESOLUTION_CACHE_TTL_MS = 60 * 1000

// A real desktop fold. Every scrape and every screenshot renders at exactly this size, so the
// visibility filter in captureElements, aboveFoldCtaCount and the preview image's intrinsic
// dimensions all agree by construction rather than by three copies of the same pair of numbers.
export const SCRAPE_VIEWPORT = { width: 1280, height: 800 }

export const SCRAPE_NAVIGATION_TIMEOUT_MS = 30_000

// How long to keep waiting for a client-rendered page to paint after navigation reports idle.
// Generous on purpose: a page that renders fast settles in about two polls and never spends this
// budget, so the only thing a bigger number costs is the pathological case. Measured against a real
// target, an app whose API backend cold-starts took ~8s to swap its "Carregando..." skeleton for
// content -- well past navigation, and enough that a 10s budget lost the race intermittently.
export const SCRAPE_SETTLE_TIMEOUT_MS = 25_000

export const SCRAPE_SETTLE_POLL_MS = 250

// Below this the rendered text is a skeleton or a spinner, not a landing page, so an unchanged
// sample that short is treated as "still rendering" rather than as settled.
export const SCRAPE_SETTLE_MIN_TEXT_LENGTH = 200

// Rendered text never goes perfectly still: a countdown, a live counter or a rotating headline
// rewrites a few characters forever. Settling is therefore "stopped changing meaningfully" rather
// than "identical", or every page carrying one would wait out the full timeout for nothing.
export const SCRAPE_SETTLE_TEXT_TOLERANCE = 8

// A page is read for its copy, so anything past this is padding -- and an unbounded response is a
// straightforward way to exhaust the function's memory.
export const SCRAPE_MAX_RESPONSE_BYTES = 25 * 1024 * 1024

// Resource types worth fetching to render text and take a screenshot. Media, websockets and
// prefetches only cost time. `preflight` is here because a cross-origin stylesheet or webfont served
// behind CORS never issues its real request once the OPTIONS is aborted, so blocking it renders the
// page unstyled -- and the screenshot is read as a preview of the customer's own site. It is not a
// hole in the guard: the request handler runs isPublicUrl on a preflight like any other request.
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

// A screenshot is judged on how it looks, so it waits for webfonts and pending images after the text
// has settled -- an unstyled fallback face reads as a broken preview. Fail-soft and short: an asset
// that never resolves costs the preview this budget, never the screenshot.
export const SCRAPE_ASSET_READY_TIMEOUT_MS = 3_000

// Lets the scroll land and freshly triggered lazy images paint before the shutter.
export const SCRAPE_PAINT_SETTLE_MS = 250

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS

// Sized by what each route costs us, not by what a plan allows. The two LLM/Puppeteer routes are
// the expensive ones; the tracking routes carry a landing page's real traffic and must stay generous
// enough that a busy customer is never throttled.
export const RATE_LIMITS: Record<RateLimitKind, { tokens: number; windowMs: number }> = {
  analysis: { tokens: 5, windowMs: HOUR_MS },
  variants: { tokens: 20, windowMs: HOUR_MS },
  experiment: { tokens: 30, windowMs: HOUR_MS },
  screenshot: { tokens: 10, windowMs: HOUR_MS },
  waitlist: { tokens: 5, windowMs: HOUR_MS },
  track_event: { tokens: 120, windowMs: MINUTE_MS },
  track_config: { tokens: 300, windowMs: MINUTE_MS },
  signin: { tokens: 5, windowMs: 15 * MINUTE_MS }
}

// Where variant previews are served from. They live on a volume rather than object storage, so they
// are same-origin: no next/image remote pattern, and img-src 'self' already covers them.
export const SCREENSHOT_PUBLIC_PATH = '/screenshots'

// Exactly what saveScreenshot() writes: a uuid, a hyphen, a uuid, `.png`. The serving route
// allowlists against this instead of sanitizing the request path, so no separator or dot segment
// can survive the check in the first place.
export const SCREENSHOT_FILENAME_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.png$/

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export const FREE_ANALYSES_LIMIT = 3

export const FREE_EXPERIMENTS_LIMIT = 1

export const DEFAULT_EXPERIMENT_DURATION = 14

// Public outreach report: how many top hypotheses are shown in full before the
// remaining ones are blurred behind the waitlist wall.
export const REPORT_PREVIEW_LIMIT = 3

// What the preview button promises before it is clicked. A variant preview boots a browser and
// renders the customer's real page, so the wait is long enough that it has to be stated up front
// rather than hidden behind a spinner.
export const PREVIEW_ESTIMATE_SECONDS = 15

// Variant targeting: a hypothesis is only "auto" (safe to swap in a screenshot or live test) when
// its current copy resolves to a single element whose word count is within this ratio of the copy.
// Guards against snapping a long merged string onto a tiny element (e.g. a 3-word badge).
export const TARGET_MATCH_MAX_WORD_RATIO = 1.3

// Conversion goals are pinned to clickable elements. Anything wordier than this is prose with a link
// in it, not a CTA, so it never becomes a goal candidate.
export const GOAL_CANDIDATE_MAX_WORDS = 8

// How much longer than the copy it replaces a variant may be. Deliberately NOT
// TARGET_MATCH_MAX_WORD_RATIO: that one guards a matching heuristic, where being wrong means
// previewing the wrong element, so it must stay tight. This one is a writing constraint and has to
// leave room for a genuinely better line. A pure ratio is nonsense at the short end (a 2-word CTA at
// 1.5x is 3 words, which forbids "Start free, no card required"), hence the floor. Ceilings run
// 2 -> 5, 6 -> 9, 10 -> 15: a hero headline stays one line instead of becoming a paragraph.
export const VARIANT_WORD_BUDGET_RATIO = 1.5

export const VARIANT_WORD_BUDGET_FLOOR = 3

// How many goal candidates the test runner offers before falling back to the free-text selector.
export const GOAL_CANDIDATE_LIMIT = 12

// The recommendation plus its two alternates. Only the recommendation is generated during the
// analysis; the alternates are written on demand by the run-a-test screen.
export const VARIANTS_PER_HYPOTHESIS = 3

// The flow playbook: structural fixes that sit beside the copy hypotheses. Bounded because a founder
// acts on a short list, and because the playbook shares the analysis's generation budget.
export const PLAYBOOK_MIN = 3

export const PLAYBOOK_MAX = 6

export const PLAYBOOK_STEPS_MAX = 5

// Where a hypothesis lands when the model answers with a section outside the enum -- it has returned
// the element's HTML tag before. The catch-all SECTIONS member, named here so the schema's fallback
// is not a bare string literal.
export const SECTION_FALLBACK: Section = 'other'

// How many reference pages are named as examples in one evidence line. The aggregate count carries
// the argument; the names are there to make it checkable.
export const REFERENCE_SAMPLE_LIMIT = 5

// A corpus signal is only evidence FOR a fix when most reference pages do it. Below this the count
// argues the other way ("2 of 12 do this"), which is worse than citing nothing: the corpus holds
// landing pages, so anything that normally lives a click deeper (a signup form's OAuth buttons) is
// legitimately sparse and must not be quoted as a reason to skip the fix.
export const REFERENCE_MAJORITY_RATIO = 0.5

// Each ingest entry is a full Puppeteer scrape, so the batch is throttled rather than fanned out.
export const REFERENCE_INGEST_CONCURRENCY = 3

// Text a login button carries when it delegates auth to a provider. Used to tell a page that already
// offers social sign in from one that would benefit from it, so the playbook never recommends adding
// what is already there. Detection patterns, not domain values -- matched case-insensitively.
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

// The rest of the structural detection vocabulary, matched case-insensitively against element text,
// headings, or iframe sources. A provider name alone is not enough to call something social sign in
// (a dev tool links to GitHub in its nav), so `auth` has to match on the same control.
export const STRUCTURE_PATTERNS = {
  auth: ['sign in', 'signin', 'sign up', 'signup', 'log in', 'login', 'continue with', 'register'],
  faq: ['faq', "faq's", 'frequently asked', 'common questions', 'questions', 'perguntas'],
  pricing: ['pricing', 'plans', 'price', 'preco', 'precos', 'planos'],
  testimonials: ['testimonial', 'customers say', 'loved by', 'what our', 'reviews', 'depoimentos'],
  videoHosts: ['youtube.com', 'youtu.be', 'vimeo.com', 'loom.com', 'wistia', 'mux.com']
}

// Open Graph images are rasterized by Satori, which parses neither oklch() nor a CSS custom
// property -- so the design tokens in app/globals.css cannot be referenced there. These are those
// same tokens (--ink, --paper, --rule, --muted-foreground, --purple, --coral) as sRGB hex, and the
// only place in the codebase where a hex value is legitimate. Keep them in step with globals.css.
export const OG_COLORS = {
  ink: '#1b1d24',
  paper: '#fbfbfd',
  rule: '#e2e2e7',
  mutedForeground: '#6c6f7d',
  purple: '#7c3aed',
  coral: '#ef5a3f'
}

export const OG_IMAGE_SIZE = { width: 1200, height: 630 }

// The site-wide card rendered by app/opengraph-image.tsx. Named explicitly because a page that sets
// its own `openGraph` replaces the root layout's entirely -- the file convention does not survive
// that merge, so every such page has to point back here. See lib/seo.ts.
export const DEFAULT_OG_IMAGE_PATH = '/opengraph-image'

export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  free: 0,
  solo: 29
}

// Color tokens are defined in app/globals.css (@theme). These maps only reference
// semantic token utility classes -- never raw Tailwind color classes or hex values.
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

// Filled style for a selected option card (mirrors SECTION_BADGE_CLASS colors).
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

export const FLOW_CATEGORY_BADGE_CLASS: Record<FlowCategory, string> = {
  signup_friction: 'bg-coral/15 text-coral',
  cta_placement: 'bg-purple/15 text-purple',
  decision_load: 'bg-blue/15 text-blue',
  objections: 'bg-teal/15 text-teal',
  trust: 'bg-green/15 text-green',
  pricing_clarity: 'bg-amber/15 text-amber',
  page_structure: 'bg-neutral/15 text-neutral'
}

export const PLAN_BADGE_CLASS: Record<SubscriptionPlan, string> = {
  free: 'bg-neutral/15 text-neutral',
  solo: 'bg-purple/15 text-purple'
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

// Solid channel color for the segmented gauge fill (mirrors the badge score ranges).
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

// High payoff for little work. The print report's summary cell and the analysis screen's "Quick
// wins" sort read the same definition, so the two can never disagree about what one is.
export function isQuickWin(scores: { impactScore: number; effortScore: number }): boolean {
  return scores.impactScore >= 7 && scores.effortScore <= 3
}

// How many hypotheses stay open before the rest collapse into scannable rows, and the point past
// which the sort/filter bar earns its space.
export const HYPOTHESIS_EXPANDED_COUNT = 3
export const HYPOTHESIS_FILTER_THRESHOLD = 4
// The playbook keeps fewer open: it sits above the hypotheses on every surface, and its cards are
// the tallest thing on the page once the steps list is showing.
export const PLAYBOOK_EXPANDED_COUNT = 2
