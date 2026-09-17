import type {
  BlogSlug,
  ErrorSeverity,
  FixKind,
  FlowCategory,
  Locale,
  Market,
  OAuthProvider,
  PageSpeedCategory,
  PageSpeedFieldCategory,
  PageSpeedFieldMetric,
  PageSpeedFieldUnit,
  PlanTier,
  RateLimitKind,
  ReadoutSeverity,
  Section,
  Theme,
  UserRole
} from '@/lib/enums'
import { PLAN_TIER } from '@/lib/enums'

// Only reached when NEXT_PUBLIC_APP_URL is unset: local dev and the e2e run.
export const FALLBACK_APP_ORIGIN = 'http://localhost:3000'

// Shared by middleware.ts and app/robots.ts so the two can never drift.
export const PROTECTED_PREFIXES = ['/dashboard', '/analyses', '/admin', '/settings']

// Where an agency sets the brand its reports carry. See docs/invariants.md.
export const SETTINGS_PATH = '/settings'

export const POST_SIGNIN_REDIRECT = '/dashboard'

// Read by the nav and the sitemap.
export const BLOG_PATH = '/blog'

export const PRIVACY_PATH = '/privacy'

// What the page states as its own last change. A date in the copy and a date in the file would be two
// places holding one fact, and the one nobody remembers to edit is the one the reader believes.
export const PRIVACY_UPDATED = '2026-09-11'

export const SIGNIN_PATH = '/auth/signin'

// Where a report lives. The key is the whole credential, so the path is only ever this prefix plus
// one. See docs/report.md.
export const REPORT_PATH = '/r'

// The sample report the landing links to is read from the database, never configured: see
// `sampleReportKey` in lib/analyses.ts.

export const URL_FIELD_ID = 'url'

// Publication dates, in ISO. They reach the reader through formatDate and the sitemap's
// lastModified, so they are the real date a post was written and nothing infers them.
export const BLOG_POST_DATE: Record<BlogSlug, string> = {
  'what-is-seo': '2026-08-20',
  'what-is-copy': '2026-08-20',
  'ai-is-the-new-google': '2026-08-20'
}

export const CALLBACK_URL_PARAM = 'callbackUrl'

// PageSpeed Insights, which measures what the readout shows. One call per analysis, mobile only, all
// four Lighthouse categories. See docs/readout.md.
export const PAGESPEED_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
export const PAGESPEED_STRATEGY = 'mobile'

// A Lighthouse run on Google's side routinely takes 10 to 30 seconds, and a heavy Brazilian page was
// measured at 40, 51 and past 60. Past this the analysis continues without it rather than holding the
// report. It bounds every attempt together, so a retry never makes the wait longer.
export const PAGESPEED_TIMEOUT_MS = 120_000

// Lighthouse answers a 5xx for a run that went wrong on Google's side, and the same page often scores on
// the next try.
export const PAGESPEED_RETRIES = 1

// The API reports CLS percentiles multiplied by 100.
export const PAGESPEED_CLS_SCALE = 100

export const PAGESPEED_FIELD_UNIT_BY_METRIC: Record<PageSpeedFieldMetric, PageSpeedFieldUnit> = {
  LARGEST_CONTENTFUL_PAINT_MS: 'seconds',
  INTERACTION_TO_NEXT_PAINT: 'milliseconds',
  CUMULATIVE_LAYOUT_SHIFT_SCORE: 'score',
  FIRST_CONTENTFUL_PAINT_MS: 'seconds',
  EXPERIMENTAL_TIME_TO_FIRST_BYTE: 'seconds'
}

// Google's own three bands, read on the same three colours the rest of the report uses.
export const PAGESPEED_FIELD_SEVERITY: Record<PageSpeedFieldCategory, ReadoutSeverity> = {
  FAST: 'ok',
  AVERAGE: 'warn',
  SLOW: 'alert'
}

// The Lighthouse categories each error generator is given, and so the ones the report shows in the
// sections those errors land in. See docs/invariants.md.
export const PAGESPEED_CATEGORY_BY_FIX_KIND: Record<FixKind, PageSpeedCategory[]> = {
  flow: ['performance', 'accessibility', 'best-practices'],
  visibility: ['seo']
}

// How each provider's address is verified, declared per provider rather than assumed.
//
// The row is keyed on email with no `accounts` table, so whoever presents an address next owns
// whatever is in that row -- the quota included. **A provider absent from this map is refused**, which
// is what makes adding one to authConfig without thinking lock itself out instead of letting itself
// in.
//
// Two strategies, because GitHub has no equivalent of Google's claim: its OAuth profile carries no
// `email_verified` and its `email` can be null outright when the account keeps it private, so the
// only answer is asking its API. See docs/security.md.
export const VERIFIED_EMAIL: Record<
  OAuthProvider,
  { kind: 'claim'; claim: string } | { kind: 'remote' }
> = {
  google: { kind: 'claim', claim: 'email_verified' },
  github: { kind: 'remote' }
}

export const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails'

// Without this scope the emails endpoint answers 403 and every GitHub login is refused -- correctly,
// but for a reason nothing in the error would name.
export const GITHUB_SCOPE = 'read:user user:email'

// The operator's own channel: the site footer, and the landing's first action through
// `whatsappUrl` below. Never on a report surface, which carries the agency's brand and not ours --
// see docs/components.md.
//
// wa.me takes the number in E.164 without the plus.
export const WHATSAPP_NUMBER = '5551989431913'
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`

// **A share link, with no number in it.** wa.me with only a `text` opens the sender's own chat
// picker, so an agency forwarding a report picks their own client and nothing here names us. This is
// the one WhatsApp URL allowed on a report surface, and `WHATSAPP_URL` above is still not: a report
// carries the agency's brand, not ours. See docs/invariants.md.
export const WHATSAPP_SHARE_URL = 'https://wa.me/'

// The landing's first action opens the chat with the first message already written, so an agency
// that clicks it arrives saying something rather than staring at an empty thread. The text itself is
// a dictionary string, because it is copy a reader sends in their own language.
export function whatsappUrl(message: string): string {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`
}

// What an agency actually said, and who said it. It sits here rather than in the dictionaries
// because it is the only copy on the page that is not ours to write or to translate: a quote
// rewritten into another language is a quote nobody said. Null until an agency agrees to be named,
// and the landing shows no testimonial while it is.
export const LANDING_TESTIMONIAL: {
  quote: string
  name: string
  role: string
  agency: string
} | null = null

// The written channel, next to WhatsApp in the footer and named by the privacy policy.
export const CONTACT_EMAIL = 'contact@hunch.solutions'
export const CONTACT_EMAIL_URL = `mailto:${CONTACT_EMAIL}`

// What a reader with no cookie gets, which is every first visit: the product sells to Brazilian
// agencies, and pt-BR is a rewrite rather than a translation of the English -- see docs/i18n.md.
// English is still complete and one cookie away.
//
// It is also the locale generation falls back to and the one the OG images are written in, because a
// tab title and an unfurl are read by the same person the page is for.
export const DEFAULT_LOCALE: Locale = 'pt-BR'

export const LOCALE_COOKIE = 'locale'

// Never translated: each language names itself, so a reader who cannot read the current UI can still
// find their own. These are the language switch's accessible names rather than anything it prints --
// the segments show flags, and a flag is a country. "EN" and "PT" were enough while they were the
// visible label and are not enough to be read aloud as one.
export const LOCALE_LABEL: Record<Locale, string> = {
  en: 'English',
  'pt-BR': 'Português'
}

export const AI_OUTPUT_LANGUAGE: Record<Locale, string> = {
  en: 'English',
  'pt-BR': 'Brazilian Portuguese (pt-BR)'
}

// A UI preference, not a session: it outlives sign-out and is never tied to the user row. Shared by
// the locale and the theme because they are the same kind of thing -- something the reader chose
// about this browser, which no sign-out should undo.
export const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

// **Dark, and not the operating system's setting.** A theme read from `prefers-color-scheme` cannot
// be known on the server, so the first paint would be the wrong one and every surface would flash --
// which is exactly what the cookie exists to avoid. A reader who wants light chooses it once and the
// choice is then a fact the server has before it renders.
//
// Which of the two is the fallback is an owner's call about how the product should look on a first
// visit, and it moved from `light` to `dark`. Nothing else changed: both palettes are complete in
// app/globals.css, the toggle writes the same cookie, and a reader already holding a `light` cookie
// still gets light. See docs/components.md.
export const DEFAULT_THEME: Theme = 'dark'

export const THEME_COOKIE = 'theme'

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

// Short: it runs alongside the scrape and must never be what makes an analysis slow.
export const ROBOTS_FETCH_TIMEOUT_MS = 5_000

// A robots.txt larger than this is not a robots.txt. The far end is not ours.
export const ROBOTS_MAX_BYTES = 512 * 1024

// Hops are followed by hand to re-validate each one, so the depth is bounded here, not by fetch.
// Enough for the http -> https -> www chains that are the reason redirects are followed at all.
export const ROBOTS_MAX_REDIRECTS = 3

// The status codes the outbound fetches read. `missing` is a page that is not there; 503 is kept apart
// from the other server errors because bot protection and maintenance pages answer with it.
export const HTTP_STATUS = {
  successMin: 200,
  redirectMin: 300,
  clientErrorMin: 400,
  serverErrorMin: 500,
  unavailable: 503,
  tooManyRequests: 429,
  missing: [404, 410]
} as const

// The site crawl: plain fetches, no browser, same origin only. Sized by how long the reader waits,
// which is why the budget is a wall clock and not only a page count. See docs/scraping.md.
export const CRAWL_PAGE_MAX = 100
export const CRAWL_CONCURRENCY = 5
export const CRAWL_PAGE_TIMEOUT_MS = 8_000
export const CRAWL_BUDGET_MS = 90_000
export const CRAWL_PAGE_MAX_BYTES = 2 * 1024 * 1024
export const CRAWL_MAX_REDIRECTS = ROBOTS_MAX_REDIRECTS

// A sitemap index can point at hundreds of files, and a hundred pages are found in the first few.
export const CRAWL_SITEMAP_FILES_MAX = 5
export const CRAWL_SITEMAP_MAX_BYTES = 10 * 1024 * 1024
export const CRAWL_SITEMAP_DEFAULT_PATH = '/sitemap.xml'

export const CRAWL_USER_AGENT = 'Mozilla/5.0 (compatible; HunchBot/1.0)'
export const CRAWL_ACCEPT_HTML = 'text/html,application/xhtml+xml'
export const CRAWL_ACCEPT_XML = 'application/xml,text/xml'
export const CRAWL_HTML_CONTENT_TYPE = 'text/html'
export const ROBOTS_ACCEPT = 'text/plain'
export const ROBOTS_ALL_AGENTS = '*'

export const CRAWL_ROBOTS_META_NAMES = ['robots', 'googlebot']
export const CRAWL_NOINDEX_DIRECTIVE = 'noindex'

// Links to these are files, not pages, and fetching one spends a page of the budget on nothing.
export const CRAWL_SKIP_EXTENSIONS = [
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.avif', '.ico', '.zip', '.mp4',
  '.mp3', '.css', '.js', '.json', '.xml', '.txt', '.gz'
]

// Below this share of the words the browser rendered, the HTML is a JavaScript shell: its titles,
// headings and text say nothing about what a visitor reads, so they are not judged. See
// docs/invariants.md.
export const CRAWL_RAW_TEXT_RATIO_MIN = 0.3

// How many affected URLs the site card lists under a finding, and how many a prompt is given.
export const CRAWL_CARD_URLS_MAX = 10
export const CRAWL_PROMPT_URLS_MAX = 5

// SE Ranking, the one source of backlink and ranking numbers. Every call spends credits, so what is
// asked for is bounded here. See docs/readout.md.
export const SE_RANKING_API_URL = 'https://api.seranking.com/v1'
export const SE_RANKING_ENDPOINT = {
  backlinksSummary: '/backlinks/summary',
  referringDomains: '/backlinks/refdomains',
  domainKeywords: '/domain/keywords',
  domainOverview: '/domain/overview/db'
} as const
export const SE_RANKING_TIMEOUT_MS = 30_000

// A trial account is held to one request a second, so a 429 is retried once, after this long.
export const SE_RANKING_RETRIES = 1
export const SE_RANKING_RETRY_DELAY_MS = 1_100

// Backlinks for the whole domain, subdomains included, and organic rankings for the same.
export const SE_RANKING_BACKLINK_MODE = 'domain'
export const SE_RANKING_KEYWORD_TYPE = 'organic'
export const SE_RANKING_WITH_SUBDOMAINS = '1'

// SE Ranking's regional databases are keyed by ISO 3166-1 alpha-2 code.
export const SE_RANKING_SOURCE: Record<Market, string> = {
  us: 'us',
  br: 'br'
}

export const RANKED_KEYWORDS_MAX = 100
// The keywords that bring the most estimated traffic first, so a hundred rows are the hundred that matter.
export const RANKED_KEYWORDS_ORDER_FIELD = 'traffic'
export const SORT_DESC = 'desc'
export const RANKED_KEYWORDS_TABLE_MAX = 20
export const RANKED_KEYWORDS_PROMPT_MAX = 20

export const BACKLINK_REFERRING_DOMAINS_MAX = 10
export const REFERRING_DOMAINS_ORDER = 'domain_inlink_rank'

// SE Ranking's domain authority runs from 0 to this.
export const DOMAIN_RANK_MAX = 100

// See lib/url-guard.ts.
export const ALLOWED_SCRAPE_PROTOCOLS = ['http:', 'https:']

export const ALLOWED_SCRAPE_PORTS = [80, 443, 8080]

// Resolve inside the deploy no matter what DNS says.
export const BLOCKED_HOST_SUFFIXES = ['localhost', '.localhost', '.local', '.internal', '.home.arpa']

// One scrape touches many subresources on few hosts; long enough to resolve each once, short
// enough that a verdict never goes stale across analyses.
export const HOST_RESOLUTION_CACHE_TTL_MS = 60 * 1000

// A real desktop fold. captureElements and aboveFoldCtaCount measure against it, so it cannot be left at Puppeteer's 800x600 default.
export const SCRAPE_VIEWPORT = { width: 1280, height: 800 }

// The phone the mobile pass emulates. A mid-size modern handset, chosen because the fold it implies
// is the one most visitors actually have -- the point of the pass is what is above 844px, not what a
// 2016 device did.
//
// **It runs in the same browser slot as the desktop pass, on a reload.** A second `withBrowserSlot`
// would double an analysis's claim on SCRAPE_MAX_CONCURRENT_PAGES for a measurement that needs no
// second page; the reload is what makes it a page load rather than a slot. The navigation is not
// optional either: capturePerformance reads a PerformanceObserver, which only reports for a
// navigation that happened after the viewport changed.
export const SCRAPE_VIEWPORT_MOBILE = {
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true
}

// Sent with the mobile pass, because a page that branches on the user agent rather than on a media
// query would otherwise serve its desktop build into a phone viewport and every finding would
// describe a page no phone receives.
export const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

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

// Tabs on the single shared `browser` service are the scarce resource, and per process only equals
// per deploy because .railway/railway.ts pins numReplicas: 1. See docs/scraping.md.
export const SCRAPE_MAX_CONCURRENT_PAGES = 3

// How many same-origin links `captureLinks` keeps. Big enough that a footer sitemap does not push
// the pricing page out, small enough that a link farm cannot make the payload interesting.
export const PAGE_LINKS_MAX = 200

// How many of the linked pages an owned analysis actually opens.
//
// **Two, and the number is bounded by latency rather than by usefulness.** Each one is a page load
// in a shared browser slot on top of a generation that already takes forty seconds, and the two
// richest are almost always pricing and docs. Raising this is a decision about how long the reader
// waits, not about how much the model gets. See docs/scraping.md.
export const SITE_PAGE_MAX = 2

// Which linked pages carry facts a landing page leaves out, recognised in the anchor text or in the
// path. Both languages, because the market is measured from the page and never assumed.
//
// **It selects, it does not crawl.** A page matching nothing here is never opened, so an analysis
// visits at most SITE_PAGE_MAX known kinds of page and never walks the site. Order is priority.
export const NEIGHBOUR_PAGE_PATTERNS: { id: string; pattern: RegExp }[] = [
  { id: 'pricing', pattern: /pre[çc]os?\b|planos?\b|pricing\b|plans?\b/i },
  {
    id: 'docs',
    pattern: /documenta[çc]|\bdocs?\b|manual\b|guias?\b|guides?\b|\bajuda\b|\bhelp\b|suporte\b|support\b/i
  },
  { id: 'features', pattern: /funcionalidades?\b|recursos?\b|features?\b|como funciona|how it works/i },
  { id: 'about', pattern: /\bsobre\b|quem somos|\babout\b|our story/i },
  { id: 'faq', pattern: /\bfaq\b|perguntas frequentes|d[úu]vidas/i }
]

// An analysis has already committed to a Sonnet call and needs several slots at once, so it waits.
export const SCRAPE_QUEUE_MAX_WAIT_MS = 120_000

// Long enough for a restarting container to listen on CDP, short enough that an absent
// BROWSER_URL still fails the request rather than stalling it.
export const BROWSER_CONNECT_RETRY_DELAY_MS = 1_000

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS

// How long a finished job stays readable after the worker wrote it. It only has to outlive the
// client's polling, and the durable answer is in Postgres either way.
export const JOB_TTL_MS = 10 * MINUTE_MS

// How often the client asks. Short enough that a fast job does not feel queued, long enough that it
// is not a busy loop against Redis.
export const JOB_POLL_INTERVAL_MS = 2_000

// Past this the queue stops accepting rather than promising work it will not get to. An unbounded
// queue on one browser container is the outage it exists to prevent, not a safeguard against it.
export const QUEUE_MAX_DEPTH = 50

// How many jobs the worker runs at once.
//
// It is not the browser cap and must not be read as one: `withBrowserSlot` still admits
// SCRAPE_MAX_CONCURRENT_PAGES tabs and is the only thing that limits Chromium. This limits how many
// jobs are *in flight*, which matters because most of an owned analysis holds no slot at all -- it
// scrapes once, releases, then spends 30-60s in three Sonnet calls. Draining that serially left the
// whole queue waiting on work that was competing for nothing.
//
// Matched to the browser cap so a burst of pure-scrape jobs queues at the slot rather than here,
// where the wait is already bounded by SCRAPE_QUEUE_MAX_WAIT_MS.
export const QUEUE_DRAIN_CONCURRENCY = 3

// How long the form waits for a queued analysis before giving up on the reader's behalf. Measured on
// the wall clock rather than a retry count, because what matters is how long someone has been
// looking at a spinner. Generous: a burst still puts real analyses behind QUEUE_DRAIN_CONCURRENCY
// others, and the ones ahead may be holding every browser slot.
export const ANALYSIS_WAIT_MAX_MS = 8 * MINUTE_MS

// The operator screen. Under PROTECTED_PREFIXES so middleware turns away anyone with no session, and
// re-checked against the stored role by both the page and the action behind it. See docs/invariants.md.
export const ADMIN_PATH = '/admin'
export const ADMIN_ACCOUNTS_PATH = `${ADMIN_PATH}/accounts`

// A ceiling on one account's monthly quota, so an extra digit typed into the form is refused rather
// than honoured.
export const ADMIN_QUOTA_MAX = 1000

// What a row gets when nobody has set a quota for it: no analyses until an operator does.
export const DEFAULT_MONTHLY_QUOTA = 0

// What each tier costs a month in BRL and how many runs it carries. The landing page prints the pair
// and the operator screen offers the quota as a shortcut, so the number an agency was sold and the
// number typed into the form come from here. Every quota has to stay under ADMIN_QUOTA_MAX. See
// docs/product.md.
export const PLAN: Record<PlanTier, { priceBrl: number; quota: number }> = {
  studio: { priceBrl: 197, quota: 20 },
  agency: { priceBrl: 397, quota: 60 },
  network: { priceBrl: 797, quota: 200 }
}

/**
 * Which tier an amount bought, read back from our own map.
 *
 * **The amount the provider confirms decides the tier, and it is matched against this map rather
 * than trusted.** Nothing the browser sent reaches it: the checkout route reads the price from
 * `PLAN` on the way out, and the webhook reads the tier from the confirmed amount on the way back.
 * An amount matching no tier buys nothing. See docs/security.md.
 */
export function planTierForAmount(amount: number): PlanTier | null {
  return PLAN_TIER.find((tier) => PLAN[tier].priceBrl === amount) ?? null
}

// What the subscription is called on the payer's card statement and in their Mercado Pago account.
// Not a dictionary string: it is read by somebody looking at a charge months later, in whatever
// language their bank speaks, and it has to match what we can look up.
export const PLAN_REASON: Record<PlanTier, string> = {
  studio: 'Hunch Studio',
  agency: 'Hunch Agencia',
  network: 'Hunch Rede'
}

// How the preapproval is billed. Monthly, in BRL, and every tier is on the same cycle.
export const PLAN_FREQUENCY = { frequency: 1, frequencyType: 'months', currency: 'BRL' } as const

// What a new account may run before it has paid for anything. **A one-time credit, not a monthly
// allowance**: it is the row's starting value and nothing refills it, so an account that has spent
// it has to subscribe. See docs/invariants.md.
export const TRIAL_RUNS = 3

// The features sold only with the larger plans. One list, read by `canBulkGenerate` and by nothing
// else, so what a tier buys is stated in a single place. See docs/product.md.
export const BULK_PLAN_TIERS: PlanTier[] = ['agency', 'network']

/**
 * How many URLs one batch may carry.
 *
 * **Deliberately well under `QUEUE_MAX_DEPTH`.** The queue holds 50 jobs and drains 3 at a time
 * against a single browser with `SCRAPE_MAX_CONCURRENT_PAGES` slots, so a batch big enough to fill it
 * would park every interactive analysis behind it. Ten is also about 3,100 SE Ranking credits, which
 * is the real money. Raise it only after timing a real batch on staging. See docs/scraping.md.
 */
export const BULK_URLS_MAX = 10

export const BULK_PATH = '/dashboard/bulk'

// Where a signed-in reader subscribes. The landing sends anyone with an account to the dashboard, so
// the price list has to exist somewhere behind the sign-in too, and the account screen is where the
// subscription is already managed. The anchor is what the exhausted-quota line points at.
export const PLANS_ANCHOR = 'plans'
export const PLANS_PATH = `${SETTINGS_PATH}#${PLANS_ANCHOR}`

// Mercado Pago. The provider's own name for itself in our tables, the two notification topics we
// act on, and the one status that means money moved. See docs/api.md.
export const MERCADOPAGO_PROVIDER = 'mercadopago'
export const MERCADOPAGO_PREAPPROVAL_TOPIC = 'subscription_preapproval'
export const MERCADOPAGO_SUBSCRIPTION_PAYMENT_TOPIC = 'subscription_authorized_payment'
export const MERCADOPAGO_AUTHORIZED = 'authorized'

// Where the reader lands after the provider's checkout, and where they manage what they bought.
export const BILLING_RETURN_PATH = '/dashboard'
export const BILLING_SUBSCRIBE_PATH = '/api/billing/mercadopago/subscribe'

// The card form, rendered in our own page by the provider's script. See docs/security.md for the
// three CSP holes it needs.
export const MERCADOPAGO_SDK_URL = 'https://sdk.mercadopago.com/js/v2'
export const MERCADOPAGO_BRICK_CONTAINER = 'mercadopago-card-brick'

// The form's `customVariables`, each read off one of our tokens when the form is built. See
// docs/components.md.
export const MERCADOPAGO_BRICK_COLOR_TOKENS = {
  baseColor: '--primary',
  baseColorFirstVariant: '--foreground',
  baseColorSecondVariant: '--muted',
  buttonTextColor: '--primary-foreground',
  textPrimaryColor: '--foreground',
  textSecondaryColor: '--muted-foreground',
  formBackgroundColor: '--card',
  inputBackgroundColor: '--background',
  outlinePrimaryColor: '--border',
  outlineSecondaryColor: '--border',
  errorColor: '--destructive',
  successColor: '--green'
} as const

export const MERCADOPAGO_BRICK_RADIUS_TOKEN = '--radius'
export const MERCADOPAGO_BRICK_RADIUS_VARIABLES = [
  'borderRadiusSmall',
  'borderRadiusMedium',
  'borderRadiusLarge'
] as const

export const MERCADOPAGO_LOCALE: Record<Locale, string> = {
  en: 'en-US',
  'pt-BR': 'pt-BR'
}

// How close a tooltip may come to the edge of the viewport before it slides itself back in. It is
// the gap that keeps the panel from looking welded to the screen edge, and the reason the number is
// here rather than in the component is that it is a spacing decision, not a mechanism. See
// components/info-hint.tsx.
export const TOOLTIP_VIEWPORT_MARGIN_PX = 12

// Sized by what each route costs us, not by what a plan allows.
export const RATE_LIMITS: Record<RateLimitKind, { tokens: number; windowMs: number }> = {
  // A first run and every "Run again" alike.
  analysis: { tokens: 20, windowMs: HOUR_MS },
  // Deliberately loose: polling costs one Redis read.
  job_status: { tokens: 600, windowMs: HOUR_MS },
  signin: { tokens: 5, windowMs: 15 * MINUTE_MS },
  // Each accepted call can write a file to the volume.
  brand: { tokens: 20, windowMs: HOUR_MS },
  // Each accepted call is one request to Mercado Pago and one `pending` row, which entitles nothing.
  billing: { tokens: 10, windowMs: HOUR_MS },
  // A batch is many runs at once, so this is deliberately tight. The quota is what actually bounds
  // the work; this bounds how often somebody may queue a wave of it.
  bulk: { tokens: 3, windowMs: HOUR_MS }
}

// The agency's logo, served from BRAND_DIR under this path. See docs/security.md.
export const BRAND_PUBLIC_PATH = '/brand'

// Exactly what saveBrandLogo() writes, so the serving route can refuse every other name.
export const BRAND_FILENAME_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(?:png|jpg)$/

export const BRAND_LOGO_MAX_KB = 512
export const BRAND_LOGO_MAX_BYTES = BRAND_LOGO_MAX_KB * 1024

// Sniffed from the file's own bytes, never from the declared Content-Type. SVG is deliberately absent:
// it is served from our own origin and can carry script. See docs/security.md.
export const BRAND_LOGO_SIGNATURES = [
  { ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { ext: 'jpg', bytes: [0xff, 0xd8, 0xff] }
] as const

export const BRAND_NAME_MAX_LENGTH = 40

// The phone screenshot of a measured page, served from SCREENSHOT_DIR under this path. Same volume
// as the brand logo and the same traversal guard, because it is the same class of file: bytes we
// wrote, served back by name. See docs/security.md.
export const SCREENSHOT_PUBLIC_PATH = '/screenshots'

// Exactly what saveScreenshot() writes, so the serving route can refuse every other name.
export const SCREENSHOT_FILENAME_PATTERN =
  /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.png$/

// A phone viewport is captured at deviceScaleFactor 3 so the tap target audit measures what a
// phone measures. **The picture is taken at 1.** A full page shot of a long Brazilian landing page
// at 3x is megabytes per run on a volume shared with every brand logo, and the crop this feeds is
// read at a few hundred pixels wide.
export const SCREENSHOT_SCALE_FACTOR = 1

// How many superseded screenshots one prune pass deletes. A cap because the delete list becomes
// bind parameters, and because a pass that runs long holds nothing open.
export const SCREENSHOT_PRUNE_BATCH = 200

// How the crop is framed: the margin kept around the element so it is read in its surroundings, and
// the width the frame is scaled down to fit. It never scales up, so a narrow element is shown at its
// own size rather than enlarged into blur.
export const ELEMENT_CROP_PADDING_PX = 12
export const ELEMENT_CROP_WIDTH_PX = 520

// The agency's own words on the report, written by the owner and read by their client. Bounded for
// the same reason the brand name is: it is rendered on a surface neither of them can scroll away.
export const AGENCY_NOTE_MAX_LENGTH = 600

// next/image needs intrinsic dimensions; the drawn size comes from CSS, so these bound the box.
export const BRAND_LOGO_DISPLAY_HEIGHT = 32
export const BRAND_LOGO_DISPLAY_MAX_WIDTH = 200

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

// How long a copy button says "Copied" before it goes back to its label. Long enough to be read at a
// glance, short enough that a second copy does not look like it failed.
export const COPY_FEEDBACK_MS = 2000

// Guards a matching heuristic, so it stays tight: being wrong means snapping a long merged string
// onto a tiny element. NOT the same as VARIANT_WORD_BUDGET_RATIO below.
export const TARGET_MATCH_MAX_WORD_RATIO = 1.3

// Anything wordier is prose with a link in it, not a CTA. Feeds captureStructure's above-fold CTA
// count for the readout -- it has nothing to do with conversion goals, despite the name.
export const GOAL_CANDIDATE_MAX_WORDS = 8

// How far past its current last line an unclipped element is assumed to be able to grow. One line:
// enough that a headline is not frozen at its exact current length, small enough that the copy the
// model writes still lands in the shape the designer drew. An element inside a clipping ancestor
// ignores this and gets the real free height instead.
export const VARIANT_GROWTH_LINES = 1

// Fallback ratio of line height to font size, for the elements whose computed lineHeight is the
// keyword `normal` rather than a length.
export const NORMAL_LINE_HEIGHT_RATIO = 1.2

// A ceiling and deliberately no floor, for the reason VISIBILITY_MAX has none: a page whose lines are
// already doing their job should return three rewrites rather than three plus five of padding. There
// was a floor of five, and it was what bought the padding. See docs/ai-pipeline.md.
export const HYPOTHESES_MAX = 8

// Bounded because an owner acts on a short list, and the playbook shares the generation budget.
export const PLAYBOOK_MIN = 3

// Raised from 6 when `mobile` and `performance` joined the categories. The subject got wider, and a
// ceiling that did not move would have let a phone-viewport fix crowd out a conversion one -- the
// list would look the same length while quietly covering less of what it now measures. Still bounded:
// an owner acts on a short list, and every extra card is generation budget and page height.
export const PLAYBOOK_MAX = 8

// No minimum, unlike PLAYBOOK_MIN: zero findings is a correct answer. See docs/ai-pipeline.md.
export const VISIBILITY_MAX = 6

// A handoff, not a measurement window: buffered LCP entries arrive on a task after observe()
// returns. See docs/scraping.md.
export const SCRAPE_LCP_FLUSH_MS = 50

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
  // Read by rankBelow on a form that exists: asking for nothing mandatory is not the problem, so
  // only the upper side has thresholds. Two required fields is an email and a password.
  requiredFieldsWarn: 4,
  requiredFieldsAlert: 7,
  // A single unlabelled field is a field somebody has to guess at, so the warn is at one.
  fieldsWithoutLabelWarn: 1,
  fieldsWithoutLabelAlert: 3,
  // One step is a plain form. Three is a wizard on a landing page.
  formStepsWarn: 2,
  formStepsAlert: 4,
  // One dead link on a landing page is one path a visitor can take that goes nowhere.
  deadCtasWarn: 1,
  deadCtasAlert: 3,
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
  requestCountAlert: 150,
  // Read by rankBelow, and only on a page that has testimonials at all: a quote with nobody behind
  // it is the form of proof that proves least. One attributed quote is already the good side.
  testimonialAttributionWarn: 0,
  // Mobile. Calibrated against real pages rather than against the 44px rule in the abstract: a
  // carousel's dots, a row of social icons and an icon-only close button put a well built page in
  // the high teens on their own, so an alert at ten would have called almost every site broken. The
  // finding is "hard to use with a thumb", not "one control is two pixels short".
  tapTargetsWarn: 8,
  tapTargetsAlert: 20,
  tinyTextWarn: 5,
  tinyTextAlert: 20,
  // A page of the site at or under this many words, read from its HTML. Looser than wordCountWarn,
  // because a contact or a login page is short on purpose.
  thinPageWords: 150
} as const

// The sparkline's own coordinate space, scaled by the viewBox. Padding leaves room for the end dot
// and its surface ring so neither is clipped at the edge.
export const TREND_CHART = { width: 240, height: 48, padding: 6, dotRadius: 4 } as const

export const TREND_SCORE_MAX = 100

// How far back the trend reads. An owner who runs the page again after each round of changes gets a
// dozen points out of this, which is longer than any conversation about one page.
export const SNAPSHOT_HISTORY_MAX = 12

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


// How much of the page's own text a prompt may carry.
//
// At roughly four characters a token this is about 12k tokens against a 200k window, and the cost
// of a generation call is dominated by its 16k of output either way. A tighter budget would hand
// every prompt the top third of a long page without buying anything. See docs/ai-pipeline.md.
export const PROMPT_TEXT_MAX_CHARS = 48_000

// The same budget for a neighbour page, and deliberately a fraction of it.
//
// A pricing table and a docs index are short; what makes them long is a changelog or an API
// reference, and a generation that reads twenty thousand characters of endpoint documentation is
// spending its window on the least useful page of the site. The page the reader pasted is the
// subject and keeps the whole budget above.
export const NEIGHBOUR_TEXT_MAX_CHARS = 6_000

// How many sections at the end of a page are protected when the middle has to be dropped. Pricing,
// FAQ and the closing call to action live there, which is exactly what a tail truncation throws away
// first.
export const PROMPT_SECTIONS_KEEP_TAIL = 3

// Both languages in one list, like STRUCTURE_PATTERNS: the page's language is not known until the
// scrape, and a Portuguese stopword is never an English keyword. Accents kept -- pt-BR needs them.
export const KEYWORD_STOPWORDS = [
  'a', 'about', 'after', 'all', 'also', 'always', 'an', 'and', 'any', 'are', 'as', 'at', 'be',
  'been', 'before', 'but', 'by', 'can', 'do', 'does', 'each', 'for', 'from', 'get', 'has', 'have',
  'here', 'how', 'if', 'in', 'into', 'is', 'it', 'its', 'just', 'like', 'make', 'may', 'more',
  'most', 'no', 'not', 'now', 'of', 'on', 'one', 'only', 'or', 'other', 'our', 'out', 'over', 'own',
  'see', 'so', 'some', 'still', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these',
  'they', 'this', 'to', 'up', 'us', 'use', 'was', 'we', 'what', 'when', 'where', 'which', 'who',
  'why', 'will', 'with', 'you', 'your',
  'agora', 'ainda', 'antes', 'ao', 'aos', 'aqui', 'as', 'assim', 'até', 'cada', 'com', 'como', 'da',
  'das', 'de', 'dela', 'dele', 'deles', 'depois', 'do', 'dos', 'e', 'ela', 'ele', 'eles', 'em',
  'entre', 'era', 'essa', 'esse', 'esta', 'este', 'eu', 'foi', 'gente', 'isso', 'já', 'la', 'lhe',
  'mais', 'mas', 'me', 'mesmo', 'meu', 'muito', 'na', 'nao', 'nas', 'não', 'nem', 'no', 'nos',
  'nossa', 'nosso', 'nós', 'num', 'numa', 'o', 'onde', 'os', 'ou', 'outra', 'outras', 'outro',
  'outros', 'para', 'pela', 'pelo', 'por', 'porque', 'qual', 'qualquer', 'quando', 'que', 'quem',
  'se', 'sem', 'sempre', 'ser', 'seu', 'seus', 'só', 'sobre', 'sua', 'suas', 'também', 'te', 'tem',
  'ter', 'teu', 'toda', 'todas', 'todo', 'todos', 'tu', 'um', 'uma', 'voce', 'você', 'vocês'
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
//
// **`auth` was English only, and it was the one key here that was.** Its neighbours all carry
// Portuguese (`perguntas`, `preco`, `planos`, `depoimentos`); this one did not, and it is the only
// thing `hasOauth` is computed from. So on any page written in Portuguese `hasOauth` was false by
// construction, and every Brazilian landing page with a form was told it has no social sign in
// whether or not it does. DEFAULT_LOCALE is pt-BR and the product is sold to Brazilian builders, so
// that was a false negative on the main market rather than an edge case -- our own page has "Entrar"
// and was counted as having nothing. See docs/readout.md.
//
// `continuar com` is here for the same reason `continue with` is: it is how the OAuth button is
// labelled, and without it "Continuar com Google" matched no provider.
//
// **Known collision, accepted deliberately: `entrar` is a substring of "entrar em contato".** A
// contact link therefore reads as an authentication entry, which costs at most one finding asked of a
// page that cannot answer it. Dropping the term instead costs the single most common Portuguese word
// for signing in, which is the bug this is fixing. `pricing` already carries the same kind of
// looseness with `price` inside `pricing`.
export const STRUCTURE_PATTERNS = {
  auth: [
    'sign in', 'signin', 'sign up', 'signup', 'log in', 'login', 'continue with', 'register',
    'entrar', 'acessar', 'cadastrar', 'cadastre', 'criar conta', 'minha conta', 'fazer login',
    'continuar com'
  ],
  faq: ['faq', "faq's", 'frequently asked', 'common questions', 'questions', 'perguntas'],
  pricing: ['pricing', 'plans', 'price', 'preco', 'precos', 'planos'],
  testimonials: ['testimonial', 'customers say', 'loved by', 'what our', 'reviews', 'depoimentos'],
  videoHosts: ['youtube.com', 'youtu.be', 'vimeo.com', 'loom.com', 'wistia', 'mux.com']
}

// What a page offers a visitor as a reason to believe it, counted rather than judged. Bilingual for
// the same reason STRUCTURE_PATTERNS is: the page's language is not known until the scrape has run.
//
// **The patterns are strings, not RegExp, because they cross into `page.evaluate`.** A RegExp does
// not survive that serialization; it arrives as an empty object and every test against it answers
// false, which would read as "this page has no trust signals" rather than as a bug.
export const TRUST_PATTERNS = {
  // Brazil's company registry number, in the only format it is ever printed in.
  cnpj: String.raw`\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}`,
  cnpjLabel: ['cnpj'],
  // The Brazilian postcode. The one address token unambiguous enough to match in free body text:
  // a street name is not distinguishable from any other line of copy.
  postcode: String.raw`\d{5}-\d{3}`,
  phone: String.raw`\(?\d{2}\)?[\s.-]\d{4,5}[\s.-]\d{4}`,
  badges: [
    'ssl',
    'site blindado',
    'reclame aqui',
    'ebit',
    'norton',
    'mcafee',
    'pci',
    'lgpd',
    'gdpr',
    'compra segura',
    'secure checkout',
    'selo',
    'verified',
    'verificado'
  ],
  privacy: ['privacy', 'privacidade'],
  terms: ['terms', 'termos', 'condicoes', 'condições'],
  socialHosts: [
    'instagram.com',
    'facebook.com',
    'linkedin.com',
    'twitter.com',
    'x.com',
    'youtube.com',
    'tiktok.com',
    'wa.me',
    'whatsapp.com'
  ]
}

// An href that goes nowhere. `#` alone and an empty href are the two a template leaves behind when a
// section was copied and never wired up; `javascript:` covers the handler that was never attached.
// How many nodes `captureSameness` walks before it stops, and how wide a "row of cards" is.
//
// The cap exists because the walk reads a computed style per element, which forces layout, and a
// generated page is routinely several thousand nodes. The counts stop being informative long before
// the walk stops being cheap: a page with forty gradients and one with four hundred are the same
// answer to a reader.
//
// Three is the card row every builder emits, and it is a count of siblings rather than a threshold.
export const SAMENESS_SAMPLE_MAX = 1500
export const SAMENESS_CARD_GRID_SIZE = 3

/**
 * The marks a page picks up from being built out of somebody else's defaults.
 *
 * **Every one of these is countable, and that is the entire reason this list looks like it does.**
 * What code can count off the DOM and the computed styles: how many gradients, how many font
 * families, how many icons share one library's path data. See docs/scraping.md.
 *
 * **They prove nothing about how the page was made, and nothing here may claim they do.** A
 * hand-written page uses a gradient and a lucide icon too. The
 * findings say what is present and the reader draws the conclusion.
 *
 * **This list rots in silence, which is the thing to remember about it.** Lucide changes a path, a
 * new builder appears, "Get Started" goes out of fashion -- and nothing breaks, no test fails, the
 * counts just quietly drop to zero. It is the same failure mode as GOOGLE_ADS_API_VERSION sitting at
 * v18 for months: the only symptom is an answer that looks plausible. Re-check it against a few real
 * generated pages when a count starts reading low.
 */
export const SAMENESS_PATTERNS = {
  // Path data prefixes that identify an icon set. Matched against the `d` attribute of a `<path>`
  // inside an inline `<svg>`, which is what every one of these libraries ships when it is imported
  // as a component rather than a sprite. Prefixes rather than whole paths: the libraries round
  // coordinates differently between releases, and a whole-path match would go stale in one version.
  iconPaths: ['M12 2', 'M12 3', 'M4 4', 'M3 3', 'M8 2', 'M21 12', 'M20 6', 'M5 12'],
  // Attributes a component-based icon leaves on the element itself. Cheaper and far more reliable
  // than path matching when present, which is why both are used and the counts are unioned.
  iconAttributes: ['data-lucide', 'lucide', 'heroicon', 'feather', 'iconify'],
  // Hosts that serve stock photography. A hero image from one of these was chosen from a grid of
  // thumbnails rather than made for the page.
  stockHosts: ['images.unsplash.com', 'unsplash.com', 'pexels.com', 'pixabay.com'],
  // `<meta name="generator">` values, and hostnames, that name the tool that produced the page.
  // Lowercased before matching. This is the only finding here that says anything about origin, and
  // it says it because the PAGE says it -- a declaration the page volunteered, not an inference.
  builders: ['lovable', 'bolt.new', 'v0.dev', 'vercel', 'framer', 'webflow', 'wix', 'squarespace', 'replit', 'bubble'],
  // Text that was never replaced. `lorem ipsum` is the classic; the rest are what a generator emits
  // when it has no real content to put somewhere.
  placeholders: ['lorem ipsum', 'your company', 'your brand', 'company name', 'john doe', 'jane doe', 'acme', 'example.com', 'seudominio', 'sua empresa', 'nome da empresa', 'placeholder'],
  // Calls to action that say nothing about what happens next. Matched on the whole trimmed label, so
  // "Get started with billing" is not one of these -- only the bare phrase is.
  genericCtas: ['get started', 'learn more', 'sign up', 'try it free', 'get started free', 'read more', 'contact us', 'comece agora', 'saiba mais', 'clique aqui', 'entre em contato', 'comecar agora', 'experimente gratis'],
  // A logo strip's usual labels, used to find the row before checking whether anything in it links
  // anywhere. Logos that link nowhere are decoration, and decoration shaped like proof.
  logoStripLabels: ['trusted by', 'as seen on', 'used by', 'our clients', 'confiam em', 'usado por', 'clientes']
} as const

export const DEAD_HREFS = ['', '#', 'javascript:void(0)', 'javascript:void(0);', 'javascript:;']

// The floor a tap target has to clear. 44 CSS pixels is the size both mobile platforms publish as
// the minimum a finger can hit reliably, and it is the number every mobile audit uses.
export const MOBILE_TAP_TARGET_MIN_PX = 44

// Below this, body copy on a phone is read by zooming. 12px is where both platforms' own guidance
// stops calling text legible at arm's length.
export const MOBILE_MIN_FONT_PX = 12

// Satori parses neither oklch() nor a CSS variable, so these mirror the tokens in globals.css as
// sRGB hex -- the only place a hex value is legitimate. Keep them in step.
//
// **They mirror the light tokens only, and there is no dark counterpart.** An unfurl is rendered once
// and served to every reader, so it has no way to know anyone's theme; a card that guessed would be
// wrong for half of them. Light is the safe guess for a card that lands in someone else's timeline,
// whatever DEFAULT_THEME says our own pages open in -- the two are unrelated decisions and moving one
// is no reason to move the other.
//
// `coral` was re-derived when the token was darkened to clear 4.5:1 against the panel. That contrast
// rule does not itself bind here, because the OG card sets its own background, but a mirror that has
// stopped matching what it mirrors is worse than no mirror.
export const OG_COLORS = {
  ink: '#1b1d24',
  paper: '#fbfbfd',
  rule: '#e2e2e7',
  mutedForeground: '#6c6f7d',
  purple: '#7c3aed',
  coral: '#d73e3f'
}

export const OG_IMAGE_SIZE = { width: 1200, height: 630 }

// Named explicitly because a page setting its own `openGraph` replaces the root layout's entirely,
// taking the file-convention image with it. See docs/seo.md.
export const DEFAULT_OG_IMAGE_PATH = '/opengraph-image'

// One measure for every surface: the navbar, the app pages and both reports. See docs/components.md.
//
// 90rem is 1440px, one step past Tailwind's largest named container (`max-w-7xl`, 80rem). **Widening
// it costs nothing below that width**, because `max-width` only binds above its own value -- a phone
// and a 1366px laptop render exactly as they did, which is why the *measure* carries no breakpoint.
//
// **The gutter does, and that is a separate question from the measure.** It was a flat `px-4` at
// every width, so a 1440px page sat 16px from the edge of the glass -- the same margin a 360px phone
// gets, where 16px is most of what there is to give. A gutter is a proportion of the room available,
// not a constant, so it steps up with the viewport. Mobile is deliberately untouched: `px-4` still
// holds until 640px.
//
// The text measures are deliberately not this number and must not be folded into it: the blog
// article and the body paragraphs stay capped near `max-w-2xl` because that is a reading measure,
// and a line of prose 1440px wide is unreadable however much room the layout has.
export const CONTAINER_CLASS = 'mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8 xl:px-12'

// Semantic token utilities from app/globals.css -- never raw Tailwind colors or hex values.
export const SECTION_BADGE_CLASS: Record<Section, string> = {
  headline: 'bg-purple/15 text-purple',
  subheadline: 'bg-purple/10 text-purple-soft',
  cta: 'bg-coral/15 text-coral',
  social_proof: 'bg-green/15 text-green',
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
  social_proof: 'border-green bg-green/15 ring-2 ring-green',
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
  social_proof: 'bg-green',
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
  objections: 'bg-purple-soft/15 text-purple-soft',
  trust: 'bg-green/15 text-green',
  pricing_clarity: 'bg-amber/15 text-amber',
  page_structure: 'bg-neutral/15 text-neutral',
  mobile: 'bg-blue/15 text-blue',
  performance: 'bg-amber/15 text-amber',
  distinctiveness: 'bg-purple-soft/15 text-purple-soft',
  indexability: 'bg-coral/15 text-coral',
  metadata: 'bg-purple/15 text-purple',
  structured_data: 'bg-blue/15 text-blue',
  ai_answerability: 'bg-green/15 text-green',
  site_health: 'bg-amber/15 text-amber',
  backlinks: 'bg-purple-soft/15 text-purple-soft',
  rankings: 'bg-neutral/15 text-neutral'
}

// The visibility generation's output budget. It covers the site, backlink and ranking errors as well as
// the page's own.
export const VISIBILITY_MAX_TOKENS = 4000

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

// The impact scale's ends, in one place because three things have to agree about them: the two Zod
// schemas that bound what a model may return, and the rail that draws a fill proportional to the
// maximum. A denominator drawn from a different number than the one the generation was held to is a
// gauge that never reaches full, or one that overflows.
export const IMPACT_SCORE_MIN = 1
export const IMPACT_SCORE_MAX = 10

// Where the impact scale is cut into the three words a reader is given. **The only place these two
// numbers appear**: the label, the chip and the rail all read `severityForImpact`, so a card cannot
// print `critical` in amber. Nothing stores a severity, because it is this function of a score that
// is stored -- see docs/readout.md.
export const IMPACT_SEVERITY_MIN: Record<Exclude<ErrorSeverity, 'low'>, number> = {
  critical: 8,
  medium: 5
}

export function severityForImpact(score: number): ErrorSeverity {
  if (score >= IMPACT_SEVERITY_MIN.critical) return 'critical'
  if (score >= IMPACT_SEVERITY_MIN.medium) return 'medium'
  return 'low'
}

export const ERROR_SEVERITY_BADGE_CLASS: Record<ErrorSeverity, string> = {
  critical: 'bg-coral/15 text-coral',
  medium: 'bg-amber/15 text-amber',
  low: 'bg-neutral/15 text-neutral'
}

export function impactScoreBadgeClass(score: number): string {
  return ERROR_SEVERITY_BADGE_CLASS[severityForImpact(score)]
}

// The score rail down the left edge of a ranked card. Same three bands as the chip above, as a
// tinted ground with a matching foreground -- see components/score-indicator.tsx.
export const ERROR_SEVERITY_RAIL_CLASS: Record<ErrorSeverity, string> = {
  critical: 'bg-coral/10 text-coral',
  medium: 'bg-amber/10 text-amber',
  low: 'bg-neutral/10 text-neutral'
}

export function impactScoreRailClass(score: number): string {
  return ERROR_SEVERITY_RAIL_CLASS[severityForImpact(score)]
}

// A default, never a state the reader is stuck in -- every row can still be closed.
export const HYPOTHESIS_EXPANDED_COUNT = 3
// Fewer: playbook cards are taller than hypothesis cards.
export const PLAYBOOK_EXPANDED_COUNT = 2

// **Three, and the number is the point.** The report already ranks everything it contains; a triage
// block that listed ten would be the same ranking again at the top of the page, which is a second
// copy rather than an entry point. Three is what somebody decides to do this week.
export const START_HERE_COUNT = 3

// The rail's active band: a target counts as current once it is under the sticky navbar and while
// most of the viewport is still below it. The top inset clears the 4rem navbar plus its breathing
// room; the bottom one is negative so a section entering from below does not steal `current` from
// the one the reader is actually reading.
export const RAIL_ACTIVE_MARGIN = '-96px 0px -55% 0px'

// Shared across every rail item so the marker is one element moving, not several cross-fading.
export const RAIL_LAYOUT_ID = 'report-rail-marker'

// The element id of one fix card, derived from its row id so the triage block and the readout's fix
// pointer can both address it. One function rather than a template string at three call sites,
// because a link and its target have to agree and two of them are in different files.
export function fixAnchor(fixId: string): string {
  return `fix-${fixId}`
}

// How far below the sticky navbar an anchored section comes to rest. Matches RAIL_ACTIVE_MARGIN's
// top inset: land a section somewhere the rail does not consider current and the marker jumps to the
// neighbour the moment the scroll settles.
export const SECTION_ANCHOR_CLASS = 'scroll-mt-24'
