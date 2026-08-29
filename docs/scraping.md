# Scraping

`lib/scrape.ts`. Pages are JS-rendered, so this is Puppeteer and not a fetch. Every URL is guarded
before and during the load — see [security.md](security.md).

`scrapePage` returns `html`, `elements` and **three readouts**: `PageStructure` (what the page does),
`PageSeo` (what it declares about itself) and `PagePerformance` (what it cost to load). All three are
persisted; [readout.md](readout.md) is what turns them into something a reader sees.

## Rendering: navigation is not paint

`waitUntil: 'networkidle2'` reports that the sockets went quiet, which a client-rendered page
satisfies while its skeleton is still the only thing painted. Both capture paths therefore call
**`settlePage`** before reading the DOM: it polls `document.body.innerText` length every
`SCRAPE_SETTLE_POLL_MS` and returns once the text has stopped changing by more than
`SCRAPE_SETTLE_TEXT_TOLERANCE` **and** is at least `SCRAPE_SETTLE_MIN_TEXT_LENGTH` long.

Both halves of that condition are load-bearing: a page carrying a countdown or a live counter never
goes perfectly still, and a stable but skeleton-sized sample means the frame has not painted rather
than that the page is finished. The wait is bounded by `SCRAPE_SETTLE_TIMEOUT_MS` and fail-soft — a
page that never settles is analysed on what it did render instead of failing the scrape.

`SCRAPE_SETTLE_TIMEOUT_MS` is deliberately generous at 25s. A page that renders fast settles in about
two polls and never touches that budget, so raising it costs only the pathological case, while too
tight a budget fails *intermittently* — far worse to diagnose. It is calibrated against a measured
target: an app whose API backend cold-started held a 13-character "Carregando..." skeleton for ~8s
past `networkidle2`, and full scrapes of it ranged 8.6s to 11.2s across runs.

Without the wait, a slow page reaches generation as a spinner and the model correctly refuses to
invent hypotheses about it — which surfaces as `AnalysisOutputSchema`'s `min(5)` rejecting the output
**after** a full Sonnet call, i.e. an opaque `500`. `screenshotVariant` shares the wait for the same
reason: a selector looked up before paint reads as stale and costs the report its preview.

**The preview freezes motion and scrolls before it shoots.** Both belong to the pair rather than to the
scrape: a measurement should see the page as it is, so `scrapePage` does neither. See
[report.md](report.md#the-beforeafter-wipe).

**`awaitPaint` is the screenshot's version and is not interchangeable.** `settlePage` answers "has the
text stopped changing", which is right for reading copy and wrong for taking a picture: a page whose
text is final can still be painting webfonts and lazy images, and a fallback face reads as a broken
preview. It awaits `document.fonts.ready` plus every pending `document.images` entry, bounded by
`SCRAPE_ASSET_READY_TIMEOUT_MS` and fail-soft, then settles for `SCRAPE_PAINT_SETTLE_MS`.

**Viewport is 1280x800**, matching `screenshotVariant`. Both the visibility filter in `captureElements`
and `aboveFoldCtaCount` are measured against it, so it cannot be left at Puppeteer's 800x600 default
without calling a normal hero "below the fold".

**"Above the fold" needs both bounds.** `top < innerHeight` is also true of everything *above* the
viewport, and an off-canvas menu parks its whole contents at a negative `top` — so a page with a
closed drawer used to report a dozen calls to action nobody can see. Both passes require
`top >= 0 && top < innerHeight`.

## The phone pass

`scrapePage` measures the page twice, and the second pass costs **a page load, not a browser slot**.
After the desktop capture it sets `MOBILE_USER_AGENT`, switches to `SCRAPE_VIEWPORT_MOBILE`
(390x844, `isMobile`, `deviceScaleFactor: 3`) and reloads inside the same `withBrowserSlot`. A second
slot would double an analysis's claim on `SCRAPE_MAX_CONCURRENT_PAGES` for a measurement that needs
no second page.

The reload is not decoration. A bare `setViewport` re-lays the page out, but does not re-run a
user-agent branch or re-request images at phone sizes, so the layout measured would be a layout no
phone receives.

**`PageMobile` carries geometry and no load numbers, and that is a rule rather than an omission.**
The reload runs on a connection the desktop pass already opened, so its TTFB skips DNS and the TLS
handshake and every timing after it inherits the head start. Measured that way a page reports
painting *faster* on a phone than on a laptop — not a floor with a caveat on it, simply backwards.
Timings stay in the `load` group, measured once, with the caveat they already carry. See
[invariants.md](invariants.md#the-readout-says-what-was-counted-never-what-it-will-produce).

`captureMobile`'s visibility test is stricter than the desktop one, and has to be: a phone layout
routinely keeps its whole navigation in the DOM translated off to one side, where `display` and
`visibility` say nothing about it. It also requires the element to intersect the viewport
horizontally and to have non-zero opacity. Tap targets additionally exclude `display: inline`, because
a link inside a sentence is prose rather than something anyone aims a thumb at.

## `PageStructure` — what the page does

A flat record: `hasOauth`, `formFieldCount`, `hasFaq`, `hasPricing`, `hasTestimonials`, `hasVideo`,
`hasStickyCta`, `bodyLinkCount`, `aboveFoldCtaCount`, `navLinkCount`, `sectionCount`, `wordCount`,
plus what the form asks for (`requiredFieldCount`, `fieldsWithoutLabel`, `formSteps`, `hasSubmit`,
`hasClientValidation`, `deadCtaCount`) and what the page offers as a reason to believe it (`hasCnpj`,
`testimonialWithAttributionCount`, `clientLogoCount`, `trustBadgeCount`, `hasPrivacyPolicy`,
`hasTerms`, `hasPhysicalAddress`, `hasPhone`, `hasSocialLinks`).

**Everything after `wordCount` is optional on the type, and that is load bearing.** The column is a
`jsonb` written since before those fields existed, so a row measured last month carries the object
and none of the keys. `undefined` there means *not measured*, which is a different fact from `0`, and
`measuredFindings` guards every one of them with `!== undefined` rather than a truthiness check —
zero is a real and common answer for most of them. Reporting a finding of zero for a page nobody
counted it on reports unknown as negative, which
[invariants.md](invariants.md#unknown-is-never-reported-as-negative) forbids outright.

**The form is read, never operated.** Steps, required fields and missing labels all come off the DOM.
Nothing clicks, types or submits: sending a stranger's form would write a fake lead into their CRM
every time somebody ran an analysis, fire their automations, and on a checkout page start a charge.

Every signal is **deliberately conservative**: a false negative costs one redundant suggestion, a
false positive silently drops a real fix. Three rules follow from how it is measured:

- **A provider name alone is never social sign in.** A dev tool links to GitHub in its nav. The same
  control must also read as an auth action, matched against `STRUCTURE_PATTERNS.auth`.
- **`bodyLinkCount` is named for what it counts.** It is every short clickable outside
  nav/header/footer, including a feature card's "Learn more", so it must never be presented to the
  model as a CTA count.
- **A pattern crossing `page.evaluate` is a string, never a `RegExp`.** A RegExp does not survive that
  serialization; it arrives as an empty object and every test against it answers `false`, which reads
  as "this page has no trust signals" rather than as a bug. `TRUST_PATTERNS` declares them with
  `String.raw` so the escaping is the regex's own — a quoted `'\d'` is an unknown escape that
  collapses to the letter, and that is exactly how the CNPJ check once answered false on a page
  printing one.

This readout is serialized straight into the playbook prompt and is that prompt's **only** ground
truth, which is what bounds what the playbook may claim — see
[invariants.md](invariants.md#a-generated-evidence-carries-a-number-only-from-a-page-this-code-measured).

There was once a `reference_pages` corpus behind an extra quantitative evidence block. It was removed
along with its hand-curated ingest, and re-adding one means re-adding the honesty contracts too: a
signal only quoted when a majority of the corpus does it, and a fail-quiet read so an empty corpus
never costs the analysis.

## `PageSeo` — what the page declares about itself

Almost entirely the `<head>` that `preprocessHtml` strips before any model sees the page. Fields:
`title`, `metaDescription`, `canonical`, `robotsMeta`, `lang`, `h1Count`, `imageCount`,
`imagesMissingAlt`, `internalLinkCount`, `hasOgTitle` / `hasOgDescription` / `hasOgImage`, and
`jsonLdTypes` (every `@type` in the page's JSON-LD, `@graph` included).

An unparseable JSON-LD block is **skipped rather than thrown**: a broken block is a finding, not a
reason to lose the scrape.

`PageStructure` is deliberately left alone by this — its contract is "what the page DOES", so metadata
there would be tokens no playbook rule reads. `generateVisibility` is handed `PageSeo` plus exactly two
`PageStructure` fields (`hasFaq`, `wordCount`).

## `PagePerformance` — what the page cost to load

Read from the Performance API on the page already open (`navigation`, `paint`,
`largest-contentful-paint` and `resource` entries) **after** `settlePage`, because LCP is not final
until the largest element has painted. It costs no browser slot and no extra navigation.

**LCP is the exception and must stay one.** `getEntriesByType('largest-contentful-paint')` returns
nothing, on every page — LCP is not in the performance timeline. The only way to receive the entries
the browser already recorded is a `PerformanceObserver` with `buffered: true`, which delivers them on
a later task, which is what `SCRAPE_LCP_FLUSH_MS` waits for. Reading it the timeline way fails
**silently as a null**, so the headline load metric is simply absent and nothing errors. If `lcpMs`
ever starts coming back null across the board again, this is why.

Every field is `number | null`, and a null is skipped rather than defaulted — see
[readout.md](readout.md).

Two limits are inherent to measuring here, and both are stated in the UI copy rather than only in code
(see [invariants.md](invariants.md#the-readout-says-what-was-counted-never-what-it-will-produce)):

- It is measured from the deploy's network, so it is a **floor** a real visitor never beats.
- `transferredBytes` **understates** the page. `SCRAPE_ALLOWED_RESOURCE_TYPES` blocks `media`, and on
  top of that a cross-origin response without `Timing-Allow-Origin` reports `transferSize: 0` — so the
  figure is a sum over what the browser was *allowed to tell us*, which is why it renders as
  "at least".

`captureSeo` also returns `headings`, the visible text of every `h1`-`h6` in document order, bounded by
`SEO_HEADINGS_MAX` and `SEO_HEADING_MAX_CHARS`. Order is load-bearing: `lib/keywords.ts` treats the
first entry as the H1. The caps are what keep a nav-generated wall of `h3`s out of the jsonb column.

## `robots.txt` — `fetchCrawlerAccess` in `lib/robots.ts`

Returns `{ status, blockedAgents, blocksAll, sitemaps }`. Four things are load-bearing:

- **Three states, not two.** See
  [invariants.md](invariants.md#unknown-is-never-reported-as-negative).
- **Redirects are followed by hand**, re-validating each hop with `assertPublicUrl` and bounded by
  `ROBOTS_MAX_REDIRECTS`. `redirect: 'follow'` would let a `302` walk the fetch to a private address
  the pre-flight check never saw — the hole `openGuardedPage`'s interception closes for the scrape.
  Refusing redirects outright would be safe too, but would answer `unknown` for every apex that
  redirects to www.
- **Fail-soft throughout**: every failure path resolves to `unknown`. A site whose robots.txt cannot
  be read still gets its analysis.
- **It uses `fetch`, not a browser**, so it takes no `withBrowserSlot` slot, and it runs inside the
  scrape, so it never becomes what makes an analysis slow.

It is persisted to `analyses.crawler_access` and read twice from there: by the visibility prompt, and
by the readout's `visibility` group. Feeding a prompt was its only job once, which meant the one thing
we actually measured about AI discoverability existed nowhere a reader could see it.

## Browser lifecycle and the concurrency cap

`launchBrowser()` is the only place a browser is obtained, and it has two modes. With `BROWSER_URL`
set it `connect()`s to the dedicated browser container; unset, it launches Chrome in-process, which is
what local dev, `npm run preview:screenshot` and the e2e suite use.

`releaseBrowser()` is the mirror, and exists because a connected browser is **shared**: it closes the
page always — otherwise every scrape leaks a tab until the container OOMs — then `disconnect()`s when
remote and `close()`s when local. Calling `browser.close()` on the shared browser would take scraping
down for every later request.

Chrome's DevTools endpoint refuses a `Host` header that is not an IP or `localhost` (its own
DNS-rebinding guard), so `connectToBrowser` resolves `BROWSER_URL`'s hostname before connecting.
Pointing puppeteer straight at a service name fails. Railway's internal DNS answers with **IPv6**, and
a bare v6 literal is not a valid URL host, so the resolved address is bracketed when `family === 6`.
`connect()` is retried once after `BROWSER_CONNECT_RETRY_DELAY_MS`, resolving the hostname inside each
attempt because a restarted container can return on a different internal address.

That resolution is also what makes the browser container's forwarder work, and the two must be read
together. `getWSEndpoint` returns `webSocketDebuggerUrl` **verbatim** — puppeteer never rewrites its
host — and Chrome builds that URL from the `Host` header it was sent. So the address the app dials is
the address it gets handed back: dial the resolved IP, and Chrome echoes a ws URL on that same IP,
which routes back through the forwarder. This is the same mechanism as the rebinding guard above, seen
from the other side, and it is why nothing here may "simplify" by passing the service name through.

**`BROWSER_URL` must be `http` and must carry `:9222`.** Both failures are far louder than their
cause: an `https` value dies as `ERR_TLS_CERT_ALTNAME_INVALID`, because the hostname was already
replaced by an IP no certificate lists; a missing port silently becomes 443.

**`withBrowserSlot` caps how many pages exist against that shared browser at once**
(`SCRAPE_MAX_CONCURRENT_PAGES`). Without it, a burst of previews on a public report can OOM that
container — and its restart kills every in-flight scrape with it, so an unauthenticated route could
take the paid analyses down.

The counter lives on `globalThis` for the same reason the Redis client does: Next re-evaluates modules
on every edit in dev and splits server bundles per route, so a module-scope counter risks being
per-bundle — a cap that silently is not one.

Three rules hold it together:

- **Both call sites now wait.** `SCREENSHOT_QUEUE_MAX_WAIT_MS` used to be 5s, because the reader was
  holding the HTTP connection and a preview that gave up degraded to a retry button. **Nobody is
  holding that connection any more** — see the queue below — so giving up early would throw away work
  no one is waiting on. It matches `SCRAPE_QUEUE_MAX_WAIT_MS` now, and the asymmetry that justified
  two different literals is gone with the reason for it.
- **Nothing may await `scrapePage` / `screenshotVariant` while holding a slot.** Nothing does today
  (`analyze.ts` fans out flat), but a nested call self-deadlocks at the cap and presents as an
  analysis that simply hangs.
- **`assertPublicUrl` runs before the slot is taken**, so a refused URL never spends capacity and a
  throw from it cannot leak one.

The cap is per process, which only equals per deploy because `.railway/railway.ts` pins `numReplicas: 1` (the
screenshot volume requires it). Scaling `app` would multiply the real tab count; Redis is already
available if a cross-process cap is ever genuinely needed.

## The job queue — `lib/queue.ts`

**It exists to separate two waits that used to be one.** A render holds a browser slot for as long as
it takes; a reader holds a connection for as long as they are willing. While those were the same
wait, the slot wait had to fit inside the reader's patience — which is why a preview gave up after
five seconds and a busy moment showed a button that looked broken.

Now `POST /api/report/screenshot` returns the instant the job is queued, a worker in this process
drains it, and the client polls `GET` on the same route.

**The worker is in-process, and that is a constraint rather than a preference.** A separate Railway
service costs money, and the screenshot volume pins the app to `numReplicas: 1` — so "in this
process" and "in this deploy" are the same sentence today. It is pinned to `globalThis` like the
browser pool and the Redis client, for the same reason: Next re-evaluates modules per edit and splits
bundles per route, so a module-scope singleton risks being one per bundle.

### The worker runs `QUEUE_DRAIN_CONCURRENCY` jobs at once

**It used to drain serially, and the reason written down for that was wrong.** The argument was that
`withBrowserSlot` already caps how many pages exist at once, so a second limiter here would either
fight it or hide it. The cap does still do exactly that and none of this changes it.

What the argument missed is that **most of an owned analysis holds no slot at all**. It scrapes,
releases the slot, and then spends 30-60s in three Sonnet calls competing for nothing — with the
entire queue stopped behind it. The throughput ceiling was one job at a time, never the three tabs,
and at one analysis every 60-120s a burst of ad traffic filled the queue faster than it drained.

So the two limits were separated: **the slot cap limits Chromium, and this limits jobs in flight.**
Scrape-heavy work now waits at `withBrowserSlot`, where the wait is bounded by
`SCRAPE_QUEUE_MAX_WAIT_MS`, instead of at the head of the list where nothing bounded it.

`reap` still depends on `queueDraining` admitting one drain at a time. Reaping on sight is sound only
while this process holds nothing in the processing list, and it holds nothing precisely because every
worker releases its id in a `finally` and no second drain is running — so `reap` stays where it is,
before any worker starts, inside the flag.

### Four statuses, and the last two are the whole point

`queued` / `running` / `ready` / `unavailable`. **"Still working" and "this can never work" used to
reach the client as the same `error`**, so a preview that lost a race looked identical to one that was
impossible — a manual hypothesis, a stale selector, an unwritable volume. The runner says which by
resolving with a null url; only `unavailable` offers a retry.

### The job id is the thing, never a token

`<kind>:<ref>`, and for a screenshot the ref is the `variantId`. Two readers opening the same preview
therefore share one job rather than racing to render the same variant twice and orphaning a file —
the duplicate render [report.md](report.md) describes is closed by construction rather than by luck.

### A job in flight survives a restart

It did not, once, and the trade was written down as acceptable: an id was popped off the list before
it ran, so a process dying under it left nothing holding the work, and the client polled a `running`
job until its TTL lapsed and then read `unavailable`. That was fine while the only job was a
screenshot — idempotent, cheap, free to ask for again.

**It stopped being fine the moment a job spent a credit.** `POST /api/analyses` charges before it
enqueues, and `refundCredit` only fires when the generation throws, never when the process dies under
it — so a restart mid-drain lost the analysis *and* the money, with nothing left to say it had
happened.

So `drain` moves the id to `queue:processing` with `LMOVE` instead of popping it, removes it in a
`finally` (both terminal answers are answers the client can read, so both release the claim), and
`reap` puts back whatever a dead process left behind.

**`reap` is correct only because there is exactly one process.** `.railway/railway.ts` pins
`numReplicas: 1`, and the screenshot volume is what pins it, so anything sitting in the processing
list at startup was orphaned by definition. The day a second replica exists this becomes a bug of the
worst kind — it would requeue a job another replica is running right now — and the fix then is a
per-entry timestamp and a reaper that only takes entries held longer than any job can legitimately
take.

It runs from `drain`, not at module load, and that ordering matters: `registerRunner` is called at the
module scope of the route that owns the work, and that route is what imports `lib/queue.ts`. At import
time the runner map is empty and a reaped job would be answered `unavailable` by a worker that had
simply not learned its handler yet. The cost is that an orphan waits for the next enqueue.

A requeued job runs its handler a second time, so **the handler has to be able to say "already
done"** — `runAnalysis` returns early on a row that already holds its results, or the reader gets
every hypothesis twice. The credit is not at risk either way: it is spent by the route, not the job.

### Three rules that hold it together

- **Postgres wins over Redis.** `GET` reads `variants.screenshot_url` before it reads the job, so a
  finished render whose job TTL has lapsed still answers `ready`. Redis holds the in-flight answer;
  the row holds the durable one.
- **The queue has a ceiling** (`QUEUE_MAX_DEPTH`) and answers `unavailable` past it. An unbounded
  queue against one browser container is the outage it was supposed to prevent. **The ceiling has to
  stay inside `ANALYSIS_WAIT_MAX_MS`**: a depth that takes longer to drain than the client waits
  produces jobs whose reader has already given up, and past `JOB_TTL_MS` the answer they were waiting
  for expires before the work runs. Both are derived from how long a job actually takes, which is why
  `queue.job_finished` records it.
- **Polling has its own rate limit.** `job_status` is deliberately loose and deliberately not
  `screenshot`: at `JOB_POLL_INTERVAL_MS` a single preview would burn the render quota on its own and
  stop the job it is waiting for.

### Redis down falls back to rendering inline

The route does the work in the request, exactly as it did before the queue. That keeps local dev
without `REDIS_URL` working and keeps a Redis outage from taking previews out entirely, and it is why
the client still sets `PREVIEW_REQUEST_TIMEOUT_MS` on the `POST` — the only path where that request
is long.

**This is the opposite call from the one the anonymous analysis route will make, on purpose.** A
preview costs one browser slot for someone already holding a valid embed key; an unmetered public
analysis is a bill. Same infrastructure, opposite failure direction, and both are deliberate.

## Running the scraper outside the Next build

Functions handed to `page.evaluate()` are serialized as source, so esbuild's `__name` keepNames helper
— injected when tsx runs a script — is not defined in the page. `openGuardedPage` declares
`window.__name` as an identity function, which is what lets the scraper run under
`npm run preview:screenshot` at all.

## Applying a variant to the live DOM — `applyVariantCopy`

`screenshotVariant` swaps copy in **without touching the element's markup**. It used to do
`el.textContent = copy`, which deletes every child node — and the children are exactly what the
preview exists to show, because `captureElements` targets the innermost block element with its inline
children folded in, so a selector usually lands on something like
`<h1>The <span class="gradient">fastest</span> way to ship</h1>`. That assignment took the gradient
span, the `<br>`, the icons and all their CSS with it, and the preview came back unstyled.

The routine walks the element's text nodes (`TreeWalker`, `SHOW_TEXT`) and writes only into those, so
every element wrapper survives by construction. Three rules make the result readable:

- **Proportional distribution.** The new words are spread across the text nodes in proportion to the
  fragment lengths they replace, so a styled fragment keeps a share of the copy and still renders. One
  word is reserved for each fragment still to come, so a span whose share rounds to zero does not go
  empty; the last node takes the remainder, so rounding never drops a word.
- **Whitespace-only text nodes are never written to.** They are the layout gaps between inline
  fragments, and rewriting them glues words together. Each fragment's original leading and trailing
  whitespace is re-applied around its chunk for the same reason. Where the page had no whitespace
  between two fragments a separator is added, because the split point there is ours, not the page's.
- **The control-copy check stays ahead of the mutation.** Once one node is rewritten there is no
  original text left to compare, and a stale selector would report a successful swap of the wrong
  element instead of the `mismatch` the caller degrades on.

Without an `emphasis` the split follows the *original* fragment sizes, so a span wraps whichever words
fall there. Strictly better than the span disappearing, and it is the fallback for everything below.

### Placing the emphasis

When the variant carries an `emphasis` ([ai-pipeline.md](ai-pipeline.md#the-model-chooses-the-emphasis-for-the-line-it-wrote-never-the-line-it-replaced)),
those words go into the styled fragment and the words either side are shared out proportionally among
the nodes either side. The styled fragment is the first text node whose parent is not the target
element itself — that is what "inside a `<strong>`" means structurally.

**Nothing here ever creates an element.** Bolding a word the page has no wrapper for would mean
inserting a `<strong>` into a tree the host framework rendered, which is the `removeChild` family of
failures the whole text-node design exists to avoid. So the emphasis only ever *redistributes among
nodes that already exist*, and that is why it silently falls back rather than trying harder.

It falls back to the proportional split whenever the emphasis cannot be honoured exactly:

- the element has no styled fragment at all;
- the emphasis is not a whole-word substring of the copy — including the case where an operator edited
  the copy at launch and edited those words away;
- it is the entire line, which is not an emphasis;
- the words either side have no node to go to (the styled fragment is first and the emphasis is not,
  or it is last and the emphasis is not). Dropping words is never acceptable, so the whole placement is
  abandoned instead.

One consequence worth expecting: when the emphasis lands at the end of the new line, the text node
*after* the styled fragment is written empty. The `<strong>` has not moved in the DOM, but the bold is
now visually last.

### Fitting the copy back into its box

The swap ends in `fitToBox`, and the outcome it returns says what the page did with the new words:
`ok`, `fitted` or `overflow` — all three mean the swap happened, which is why callers ask
`isApplied(outcome)` rather than comparing to `ok`.

**Wrapping to another line is not a break.** A hero that grows from two lines to three reflows, and
the reader is looking at the real thing; shrinking the type there would misreport the page and throw
away the designer's typography for nothing. A break is text the CSS *cuts off*, and that is what is
detected, in three forms: `scrollWidth` past `clientWidth` (a `nowrap` or ellipsis rule), `scrollHeight`
past `clientHeight` (a fixed height), or the element's bottom past the bottom of an ancestor whose
`overflow-y` is `hidden` or `clip`.

Only then is the element's own computed `font-size` stepped down by `FIT_STEP_RATIO` until it fits.
`FIT_MIN_SCALE` is where that stops: past it the preview is no longer a picture of the page, so the
original size is restored and the outcome is `overflow` — reported to the reader rather than hidden,
because copy that does not fit is a fact about the recommendation, not a rendering failure. See
[report.md](report.md#post-apireportscreenshot).


### How much copy an element can hold

`captureElements` returns `capacity` on every `PageElement`: the characters that fit in the box, which
is what the generation prompts spend as a ceiling ([ai-pipeline.md](ai-pipeline.md)). Fitting at
capture time is a net, not a plan — the copy should have fitted before anyone opened a browser.

The average character width is **measured**, off the text already rendered in that element (a `Range`
over its contents, summing the client rects), never assumed from the font size: a condensed display
face and a wide serif differ by more than any constant survives. Lines are `clientWidth / charWidth`;
how many of them are allowed is the one judgement call:

- Inside an ancestor that clips, the real free height down to that ancestor's bottom edge.
- Otherwise the element's current height plus `VARIANT_GROWTH_LINES`. Unclipped copy can grow without
  breaking anything, but a headline allowed to double still lands as a wall of text where the
  designer drew one line.

The floor is always the text already there, so an element can never be given a budget smaller than the
copy it currently holds.

Its only automated coverage is `e2e/dom/apply-variant-copy.spec.ts` — see
[development.md](development.md).
