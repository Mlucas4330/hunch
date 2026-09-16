# Scraping

`lib/scrape.ts`. Pages are JS-rendered, so this is Puppeteer and not a fetch. Every URL is guarded
before and during the load. See [security.md](security.md).

`scrapePage` returns `html`, `elements` and the readouts: `PageStructure` (what the page does),
`PageSeo` (what it declares about itself), `PagePerformance` (what it cost to load), `PageMobile` and
`PageSameness`. All of them are persisted, and all of them are prompt input: the reader sees PageSpeed
Insights and the AI crawler card instead. See [readout.md](readout.md).

## PageSpeed Insights runs beside the scrape

`measurePage` in `lib/analyze.ts` runs `scrapePage`, `measureSite` (robots.txt, then the site crawl)
and `fetchPageSpeed` in parallel. PageSpeed Insights is a plain `fetch` to Google, so it takes no browser slot, and it is
fail-soft: a failure resolves to `null` and the scrape carries on.

## Rendering: navigation is not paint

`waitUntil: 'networkidle2'` reports that the sockets went quiet, which a client-rendered page
satisfies while its skeleton is still the only thing painted. Both capture paths therefore call
**`settlePage`** before reading the DOM: it polls `document.body.innerText` length every
`SCRAPE_SETTLE_POLL_MS` and returns once the text has stopped changing by more than
`SCRAPE_SETTLE_TEXT_TOLERANCE` **and** is at least `SCRAPE_SETTLE_MIN_TEXT_LENGTH` long.

Both halves of that condition are load-bearing: a page carrying a countdown or a live counter never
goes perfectly still, and a stable but skeleton-sized sample means the frame has not painted. The wait
is bounded by `SCRAPE_SETTLE_TIMEOUT_MS` and fail-soft: a page that never settles is analysed on what
it did render.

`SCRAPE_SETTLE_TIMEOUT_MS` is generous at 25s. A page that renders fast settles in about two polls and
never touches that budget, while too tight a budget fails *intermittently*. It is calibrated against an
app whose API backend cold-started and held a "Carregando..." skeleton for ~8s past `networkidle2`.

Without the wait, a slow page reaches generation as a spinner and the model correctly refuses to write
anything about it, **after** a full Sonnet call, so the tokens are spent either way.

**Viewport is 1280x800.** Both the visibility filter in `captureElements` and `aboveFoldCtaCount` are
measured against it, so it cannot be left at Puppeteer's 800x600 default.

**"Above the fold" needs both bounds.** `top < innerHeight` is also true of everything *above* the
viewport, and an off-canvas menu parks its whole contents at a negative `top`. Both passes require
`top >= 0 && top < innerHeight`.

## The phone pass

`scrapePage` measures the page twice, and the second pass costs **a page load, not a browser slot**.
After the desktop capture it sets `MOBILE_USER_AGENT`, switches to `SCRAPE_VIEWPORT_MOBILE`
(390x844, `isMobile`, `deviceScaleFactor: 3`) and reloads inside the same `withBrowserSlot`.

The reload is not decoration. A bare `setViewport` re-lays the page out, but does not re-run a
user-agent branch or re-request images at phone sizes.

**`PageMobile` carries geometry and no load numbers.** The reload runs on a connection the desktop pass
already opened, so its TTFB skips DNS and the TLS handshake, and a page would report painting *faster*
on a phone than on a laptop.

`captureMobile`'s visibility test is stricter than the desktop one: a phone layout routinely keeps its
whole navigation in the DOM translated off to one side. It also requires the element to intersect the
viewport horizontally and to have non-zero opacity. Tap targets exclude `display: inline`.

## The screenshot and the element boxes

Both are taken at the end of the phone pass, in the same slot and the same layout, and **both are
wrapped**: a page that will not paint into a PNG still has a readout worth sending, so a failure here
is logged as `scrape.screenshot_failed` and costs the report its picture and nothing else.

`captureElementRects` re-measures the selectors `captureElements` produced, because those were
measured at `SCRAPE_VIEWPORT` and the same element is somewhere else entirely on a phone. A selector
that now matches nothing is skipped: a responsive layout may drop an element, and a box for something
the phone never showed would frame empty space.

**The picture is taken at `SCREENSHOT_SCALE_FACTOR`, which is 1, not at the viewport's
`deviceScaleFactor` of 3.** The 3 exists so the tap target audit measures what a phone measures; a
full page shot of a long landing page at 3x is megabytes per run on a volume shared with every brand
logo, to feed a crop read a few hundred pixels wide.

Superseded snapshot screenshots are deleted at the end of the run that superseded them, which is why
there is no cron: the current picture on `analyses` is kept for good. See
[data-model.md](data-model.md).

## `PageSameness`: what the page has in common with every other one

The last of the desktop reads, run after `capturePerformance` so it cannot push the LCP flush later,
and before the user agent switches to a phone. **No extra navigation and no extra browser slot.**

`captureSameness` counts gradients, rendered typefaces, icons whose path data belongs to a known set,
three-card rows, emoji in headings, generic button labels, placeholder text, an unlinked logo strip, a
declared builder, and a stock hero image. The structure prompt reads them as context under
`samenessRules()`. See [ai-pipeline.md](ai-pipeline.md).

Three things about the implementation, all of which fail quietly rather than loudly:

- **It reads `getComputedStyle` and never `document.styleSheets[i].cssRules`.** The second throws
  `SecurityError` on a cross-origin stylesheet, and nearly every real page loads one from a CDN.
- **The patterns cross as strings**, per the rule below. `SAMENESS_PATTERNS` holds arrays of literals
  and the one regex it needs (the emoji range) is built inside the evaluate.
- **`SAMENESS_SAMPLE_MAX` bounds the walk at 1500 nodes**, because reading a computed style forces
  layout and a generated page is routinely thousands of elements.

`e2e/dom/capture-sameness.spec.ts` is where this is actually tested: `getComputedStyle` needs a
browser.

## `PageStructure`: what the page does

A flat record: `hasOauth`, `formFieldCount`, `hasFaq`, `hasPricing`, `hasTestimonials`, `hasVideo`,
`hasStickyCta`, `bodyLinkCount`, `aboveFoldCtaCount`, `navLinkCount`, `sectionCount`, `wordCount`,
plus whether the page is where you sign in (`hasAuthForm`), what the form asks for
(`requiredFieldCount`, `fieldsWithoutLabel`, `formSteps`, `hasSubmit`, `hasClientValidation`,
`deadCtaCount`) and what the page offers as a reason to believe it (`hasCnpj`,
`testimonialWithAttributionCount`, `clientLogoCount`, `trustBadgeCount`, `hasPrivacyPolicy`,
`hasTerms`, `hasPhysicalAddress`, `hasPhone`, `hasSocialLinks`).

**Everything after `wordCount` is optional on the type, and that is load bearing.** The column is a
`jsonb` written since before those fields existed. `undefined` there means *not measured*, which is a
different fact from `0`, and `measuredFindings` guards every one of them with `!== undefined`. See
[invariants.md](invariants.md#unknown-is-never-reported-as-negative).

### `hasAuthForm` is a different question from `hasOauth`

`hasOauth` says the page offers Google or GitHub. `hasAuthForm` says **this page is where you sign
in**, as opposed to a page that merely links to one. It is true when an auth-labelled control sits
inside a `<form>`, when a visible password field exists, or when a provider was detected.

**`closest('form')` is the whole distinction.** A header link points at a URL this analysis never
opened, and counting it once got a product that already offered Google and GitHub sign in told it had
none.

**`STRUCTURE_PATTERNS.auth` carries Portuguese.** `continuar com` is in the list for the same reason
`continue with` is. The list accepts one known collision: `entrar` is a substring of "entrar em
contato", which costs at most one error asked of a page that cannot answer it.

**The form is read, never operated.** Nothing clicks, types or submits: sending a stranger's form would
write a fake lead into their CRM every time somebody ran an analysis.

Every signal is **conservative**: a false negative costs one redundant error, a false positive silently
drops a real one. Three rules follow:

- **A provider name alone is never social sign in.** The same control must also read as an auth action.
- **`bodyLinkCount` is named for what it counts.** It is every short clickable outside
  nav/header/footer, so it must never be presented to the model as a CTA count.
- **A pattern crossing `page.evaluate` is a string, never a `RegExp`.** A RegExp arrives as an empty
  object and every test against it answers `false`. `TRUST_PATTERNS` declares them with `String.raw`
  so the escaping is the regex's own.

This readout is serialized into the structure prompt as its ground truth about the page.

## `PageSeo`: what the page declares about itself

Almost entirely the `<head>` that `preprocessHtml` strips before any model sees the page. Fields:
`title`, `metaDescription`, `canonical`, `robotsMeta`, `lang`, `h1Count`, `imageCount`,
`imagesMissingAlt`, `internalLinkCount`, `hasOgTitle` / `hasOgDescription` / `hasOgImage`, and
`jsonLdTypes` (every `@type` in the page's JSON-LD, `@graph` included).

An unparseable JSON-LD block is **skipped rather than thrown**. `generateVisibility` is handed
`PageSeo`, the composed page text, and the `PageStructure` counts that describe the whole page. See
[ai-pipeline.md](ai-pipeline.md).

`captureSeo` also returns `headings`, the visible text of every `h1`-`h6` in document order, bounded by
`SEO_HEADINGS_MAX` and `SEO_HEADING_MAX_CHARS`. Order is load-bearing: `lib/keywords.ts` treats the
first entry as the H1.

## `PageSection`: the page in first-level blocks

`captureSections` returns the visible children of `main` (or `body`), each with its first heading and
its text. **The set is exactly what `sectionCount` counts.**

It exists so a prompt that cannot carry the whole page can drop the **middle** rather than the tail. A
block with no heading reports `null` rather than borrowing the previous one. `preprocessHtml` flattens
and does not truncate; the budget belongs to the prompt builder.

## `PagePerformance`: what the page cost to load

Read from the Performance API on the page already open, **after** `settlePage`. It costs no browser
slot and no extra navigation. The reader sees PageSpeed Insights instead; these timings feed the
structure prompt.

**LCP must be read with a `PerformanceObserver` and `buffered: true`.**
`getEntriesByType('largest-contentful-paint')` returns nothing on every page, and the observer
delivers on a later task, which is what `SCRAPE_LCP_FLUSH_MS` waits for. If `lcpMs` ever comes back
null across the board, this is why.

Every field is `number | null`, and a null is skipped rather than defaulted.

## `robots.txt`: `fetchCrawlerAccess` in `lib/robots.ts`

Returns `{ status, blockedAgents, blocksAll, sitemaps, disallowed }`, where `disallowed` is the
`Disallow` paths of the `*` group, which the site crawl will not open. Four things are load-bearing:

- **Three states, not two.** See
  [invariants.md](invariants.md#unknown-is-never-reported-as-negative).
- **Redirects are followed by hand** in `guardedFetch`, re-validating each hop with `assertPublicUrl`
  and bounded by `ROBOTS_MAX_REDIRECTS`. See [security.md](security.md).
- **Fail-soft throughout**: every failure path resolves to `unknown`.
- **It uses `fetch`, not a browser**, so it takes no `withBrowserSlot` slot.

It is persisted to `analyses.crawler_access` and read three times: by the visibility prompt, by the
report's AI crawler card, and by the site crawl for its sitemaps and rules.

## Site crawl: `crawlSite` in `lib/crawl.ts`

Up to `CRAWL_PAGE_MAX` pages of the reader's site, read with `guardedFetch` and **never with a
browser**, so it takes no `withBrowserSlot` slot. `measureSite` starts it once robots.txt is in. A throw
stores `null` and logs `crawl.failed`; the analysis carries on without the site card.

- **Where the URLs come from.** The entry page first, then the sitemaps robots.txt declares (or
  `CRAWL_SITEMAP_DEFAULT_PATH`), following one level of sitemap index and at most
  `CRAWL_SITEMAP_FILES_MAX` files, then the same-origin links on every page read. `source` says
  whether a sitemap answered.
- **What bounds it.** `CRAWL_PAGE_MAX`, `CRAWL_CONCURRENCY` fetches at a time, `CRAWL_PAGE_TIMEOUT_MS`
  and `CRAWL_PAGE_MAX_BYTES` per page, and `CRAWL_BUDGET_MS` on the wall clock. `truncated` says a limit
  stopped it before the queue ran out.
- **What it reads.** `parseCrawledPage` takes the title, the meta description, whether the canonical
  names another URL, noindex from the meta tag or `X-Robots-Tag`, the H1 count and the word count out of
  the HTML with regular expressions. It is pure and tested against stored HTML in `lib/crawl.test.ts`.
- **Same origin only, and the `*` group's `Disallow` is respected.** `Allow` is not read, so the crawl
  opens fewer pages than the rules permit, never more.

**The HTML is read without running JavaScript.** A site that builds its text in the browser sends a
shell with no headings and no words. `siteContentReadable` compares the entry page's word count with
what the browser counted, and below `CRAWL_RAW_TEXT_RATIO_MIN` no content finding is judged.

**The entry page decides whether the crawl is `unknown`.** The browser already loaded it, so a plain
fetch that gets anything but a 2xx is a site refusing clients that are not browsers. Both rules are in
[invariants.md](invariants.md#unknown-is-never-reported-as-negative).

## What a batch costs the queue

`BULK_URLS_MAX` is 10, and it is a number about this pipeline rather than about the form.

- **`QUEUE_MAX_DEPTH` is 50 and `QUEUE_DRAIN_CONCURRENCY` is 3**, against one browser with
  `SCRAPE_MAX_CONCURRENT_PAGES` slots on a single pinned replica. A batch large enough to fill the
  queue parks every interactive analysis behind it, including other accounts'.
- **Each run makes three `generateObject` calls**, so a saturated queue is up to nine concurrent
  Sonnet requests. A 429 inside one of them surfaces as an empty list, which `runAnalysis` records as
  a failed run: no report, and no charge. That is the failure mode to watch when raising the cap.
- **PageSpeed is not the binding constraint** at one call per run. The browser is.
- **SE Ranking is the real money**: about 310 credits per run, so a batch of ten is roughly 3,100.

**Time a real batch on staging before raising it**, and write the numbers here.

## Neighbour pages

`scrapePageText` opens one page for its words and does none of the rest: no structure, no SEO, no
performance, and **no phone pass**. It takes its own browser slot and passes `assertPublicUrl` like
every other outbound URL: same origin does not dispense with the guard, since a `302` leaves the origin.

They are opened sequentially and after the reader's page, because the slots are shared across every
analysis running at once. Each failure is swallowed with a warning.

`SITE_PAGE_MAX` is two, bounded by how long the reader waits. See [ai-pipeline.md](ai-pipeline.md).

## Browser lifecycle and the concurrency cap

`launchBrowser()` is the only place a browser is obtained, and it has two modes. With `BROWSER_URL`
set it `connect()`s to the dedicated browser container; unset, it launches Chrome in-process, which is
what local dev and the e2e suite use.

`releaseBrowser()` is the mirror: it closes the page always, otherwise every scrape leaks a tab until
the container OOMs, then `disconnect()`s when remote and `close()`s when local.

Chrome's DevTools endpoint refuses a `Host` header that is not an IP or `localhost`, so
`connectToBrowser` resolves `BROWSER_URL`'s hostname before connecting. Railway's internal DNS answers
with **IPv6**, so the resolved address is bracketed when `family === 6`. `connect()` is retried once
after `BROWSER_CONNECT_RETRY_DELAY_MS`, resolving inside each attempt.

That resolution is also what makes the browser container's forwarder work. `getWSEndpoint` returns
`webSocketDebuggerUrl` **verbatim**, and Chrome builds that URL from the `Host` header it was sent. Dial
the resolved IP, and Chrome echoes a ws URL on that same IP, which routes back through the forwarder.
Nothing here may "simplify" by passing the service name through.

**`BROWSER_URL` must be `http` and must carry `:9222`.** An `https` value dies as
`ERR_TLS_CERT_ALTNAME_INVALID`; a missing port silently becomes 443.

**`withBrowserSlot` caps how many pages exist against that shared browser at once**
(`SCRAPE_MAX_CONCURRENT_PAGES`). Without it, a burst of analyses can OOM that container, and its
restart kills every in-flight scrape with it.

The counter lives on `globalThis` for the same reason the Redis client does: Next re-evaluates modules
on every edit in dev and splits server bundles per route.

Two rules hold it together:

- **Nothing may await `scrapePage` while holding a slot.** A nested call self-deadlocks at the cap and
  presents as an analysis that simply hangs.
- **`assertPublicUrl` runs before the slot is taken**, so a refused URL never spends capacity.

The cap is per process, which only equals per deploy because `.railway/railway.ts` pins
`numReplicas: 1`.

## The job queue: `lib/queue.ts`

**It exists to separate two waits.** A scrape holds a browser slot for as long as it takes; a reader
holds a connection for as long as they are willing. `POST /api/analyses` returns the instant the job
is queued, a worker in this process drains it, and the client polls `GET /api/analyses?embedKey=`.

**The worker is in-process.** The app is pinned to `numReplicas: 1`, so "in this process" and "in this
deploy" are the same sentence. It is pinned to `globalThis` like the browser pool and the Redis client.

### The worker runs `QUEUE_DRAIN_CONCURRENCY` jobs at once

**This is not the browser cap and does not overlap with it.** Most of an analysis holds no slot at all:
it scrapes, releases the slot, and then spends 30-60s in three Sonnet calls. So **the slot cap limits
Chromium, and this limits jobs in flight.** Scrape-heavy work waits at `withBrowserSlot`, bounded by
`SCRAPE_QUEUE_MAX_WAIT_MS`.

`reap` depends on `queueDraining` admitting one drain at a time, so it runs before any worker starts,
inside the flag.

### Four statuses

`queued` / `running` / `ready` / `unavailable`. `unavailable` means the work can never succeed for this
input, which the runner says by resolving with `ok: false`.

### The job id is the thing, never a token

`<kind>:<ref>`, and for an analysis the ref is the run id. A requeued run is one job, and "Run again"
is a new one: `enqueue` hands back a finished job for as long as its status lives, so a job keyed on
the analysis could not run twice inside `JOB_TTL_MS`.

### A job in flight survives a restart

`drain` moves the id to `queue:processing` with `LMOVE` instead of popping it, removes it in a
`finally`, and `reap` puts back whatever a dead process left behind. Without it a restart mid-drain
lost the analysis with nothing left to say it had happened.

**`reap` is correct only because there is exactly one process.** Anything in the processing list at
startup was orphaned by definition. The day a second replica exists this requeues a job another
replica is running, and the fix then is a per-entry timestamp.

It runs from `drain`, not at module load: at import time the runner map is empty, and a reaped job
would be answered `unavailable` by a worker that had not learned its handler yet.

A requeued job runs its handler a second time, so **the handler has to be able to say "already done"**:
`runAnalysis` returns early on a run that already finished or failed.

### Two rules that hold it together

- **The queue has a ceiling** (`QUEUE_MAX_DEPTH`) and answers `unavailable` past it. **The ceiling has
  to stay inside `ANALYSIS_WAIT_MAX_MS`**, or the queue accepts jobs whose reader has already given up.
  Both are derived from how long a job takes, which is why `queue.job_finished` records it.
- **Polling has its own rate limit.** `job_status` is deliberately loose.

### Redis down means no analysis

`POST /api/analyses` has no inline fallback: without Redis it deletes the row and answers `503`.

## Running the scraper outside the Next build

Functions handed to `page.evaluate()` are serialized as source, so esbuild's `__name` keepNames helper,
injected when tsx runs a script, is not defined in the page. `openGuardedPage` declares `window.__name`
as an identity function.

## How much copy an element can hold

`captureElements` returns `capacity` on every `PageElement`, measured off the text already rendered in
that element (a `Range` over its contents, summing the client rects). `resolveTarget` returns it with a
match. Nothing in generation spends it as a budget any more, since nothing writes replacement copy.
