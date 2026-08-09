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

**`awaitPaint` is the screenshot's version and is not interchangeable.** `settlePage` answers "has the
text stopped changing", which is right for reading copy and wrong for taking a picture: a page whose
text is final can still be painting webfonts and lazy images, and a fallback face reads as a broken
preview. It awaits `document.fonts.ready` plus every pending `document.images` entry, bounded by
`SCRAPE_ASSET_READY_TIMEOUT_MS` and fail-soft, then settles for `SCRAPE_PAINT_SETTLE_MS`.

**Viewport is 1280x800**, matching `screenshotVariant`. Both the visibility filter in `captureElements`
and `aboveFoldCtaCount` are measured against it, so it cannot be left at Puppeteer's 800x600 default
without calling a normal hero "below the fold".

## `PageStructure` — what the page does

A flat record: `hasOauth`, `formFieldCount`, `hasFaq`, `hasPricing`, `hasTestimonials`, `hasVideo`,
`hasStickyCta`, `bodyLinkCount`, `aboveFoldCtaCount`, `navLinkCount`, `sectionCount`, `wordCount`.

Every signal is **deliberately conservative**: a false negative costs one redundant suggestion, a
false positive silently drops a real fix. Two rules follow from how it is measured:

- **A provider name alone is never social sign in.** A dev tool links to GitHub in its nav. The same
  control must also read as an auth action, matched against `STRUCTURE_PATTERNS.auth`.
- **`bodyLinkCount` is named for what it counts.** It is every short clickable outside
  nav/header/footer, including a feature card's "Learn more", so it must never be presented to the
  model as a CTA count.

This readout is serialized straight into the playbook prompt and is that prompt's **only** ground
truth, which is what bounds what the playbook may claim — see
[invariants.md](invariants.md#a-generated-evidence-never-carries-a-number).

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
  same `Promise.all` as competitor research — adding nothing to the critical path.

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

**`withBrowserSlot` caps how many pages exist against that shared browser at once**
(`SCRAPE_MAX_CONCURRENT_PAGES`). Without it, a burst of previews on a public report can OOM that
container — and its restart kills every in-flight scrape with it, so an unauthenticated route could
take the paid analyses down.

The counter lives on `globalThis` for the same reason the Redis client does: Next re-evaluates modules
on every edit in dev and splits server bundles per route, so a module-scope counter risks being
per-bundle — a cap that silently is not one.

Three rules hold it together:

- **The wait is asymmetric, by call site.** `screenshotVariant` passes
  `SCREENSHOT_QUEUE_MAX_WAIT_MS` and fails fast, because the client degrades to a retry button and a
  lost preview costs a prospect nothing. `scrapePage` passes `SCRAPE_QUEUE_MAX_WAIT_MS` and waits,
  because an analysis has already committed to a Sonnet call and its competitor fan-out needs several
  slots at once. Deliberately not a reserved-slot scheme — two literals do the same job.
- **Nothing may await `scrapePage` / `screenshotVariant` while holding a slot.** Nothing does today
  (`analyze.ts` fans out flat), but a nested call self-deadlocks at the cap and presents as an
  analysis that simply hangs.
- **`assertPublicUrl` runs before the slot is taken**, so a refused URL never spends capacity and a
  throw from it cannot leak one.

The cap is per process, which only equals per deploy because `railway.json` pins `numReplicas: 1` (the
screenshot volume requires it). Scaling `app` would multiply the real tab count; Redis is already
available if a cross-process cap is ever genuinely needed.

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

Accepted trade-off: the split follows the *original* fragment sizes, so a span may wrap a different
word than the designer chose. Strictly better than the span disappearing.

Its only automated coverage is `e2e/dom/apply-variant-copy.spec.ts` — see
[development.md](development.md).
