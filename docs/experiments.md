# Live A/B tests

The whole loop: launch a test, serve it to the customer's page, count, decide. Everything about
running a test lives on its own screen, `/analyses/[id]/tests`, because testing is the step that comes
**after** the work is won and access to the site exists — see [analysis-ui.md](analysis-ui.md).

It never appears on the public report: a prospect reading someone else's teardown installs no snippet.

## Launching — `POST /api/experiments`

Launches a live test for a chosen `(hypothesis, variant)`. Ownership via `hypotheses -> analyses`.

```json
{ "hypothesisId": "uuid", "variantId": "uuid", "splitPercent": 50, "durationDays": 14, "variantCopy": "edited copy" }
```

Three gates:

- **Free users may have only `FREE_EXPERIMENTS_LIMIT` (1) `running` experiment** -> `403 limit_reached`.
- **On any plan, a hypothesis that already has a `running` experiment** -> `409 already_running`. Two
  live tests on one hypothesis means two experiments racing to rewrite the same element, and the
  snippet cannot choose between them.
- **The page must already carry the goal attribute** -> `422 goal_missing`, via `pageHasGoalTarget`
  (`lib/scrape.ts`). It runs **last**, because it opens a browser and the other two are queries.

  A test whose goal is not on the page can only ever record impressions, and it would take its whole
  window to say so. That is the failure this gate exists to prevent, and it is only possible because
  the goal is now a fixed attribute: an arbitrary selector could not be checked for meaningfully.

  **A page that cannot be reached does not block the launch.** The check is wrapped in a `try` and a
  failure is logged and ignored, because refusing on a transient network error would be worse than
  the thing being prevented. The snippet's own warning is the backstop.

In a transaction: snapshots `control_copy` / `variant_copy` / `selector`, inserts the experiment plus
its two `experiment_stats` rows, and flips the variant and hypothesis to `testing`.

`durationDays` must be 7, 14 or 30 (default 14); `endsAt` is `now + durationDays`. `variantCopy`
(optional) lets the user edit at launch and is snapshotted instead of the stored variant copy — the
**control copy is never editable**. `variants.emphasis` is snapshotted alongside it and is deliberately
**not** re-derived from an edit: an edit that removes those words leaves it matching nothing, which the
swap already treats as absent.

### A conversion is one fixed attribute, not a selector

`GOAL_ATTRIBUTE` (`data-ab-goal`, `lib/constants.ts`) is what a conversion *is*: a click on the
element the site owner marked. Nothing is chosen at launch and nothing is stored per experiment.

It replaced `experiments.goal_selector`, a CSS selector picked from `analyses.goal_candidates` that
the scrape had harvested. That was a **snapshot of markup**, so a class rename or a redesign drifted
it and the snippet then recorded impressions and never one conversion — for the test's whole window,
with nothing anywhere saying why. Marking the element inverts the contract from "we guessed how to
find your button" to "you marked your button", and nothing can drift.

**The attribute is unbranded on purpose.** It lands permanently in a white-labelled client's source
where the agency cannot strip it — see
[invariants.md](invariants.md#white-label-hangs-off-one-boolean-on-four-independent-surfaces).

The cost is that installing is **two steps**: paste the snippet, mark the element. Both live on the
`EmbedSnippet` card. This is why `product.md` no longer claims the snippet needs no code changes on
the page.

The snippet still records **no conversions at all** rather than falling back to counting a click on
the swapped element, so a result is never manufactured from the wrong event.

Response: `{ experiment: ExperimentWithResult, embedKey }`.

## Reading and ending

`GET /api/experiments?analysisId=<uuid>` lists the user's experiments, each with a computed `result`.
`GET /api/experiments/[id]` returns one. `404` if not owned.

`PATCH /api/experiments/[id]` takes `{ action: 'stop' | 'declare_winner' | 'discard' }`. Every action
ends a test, so **none of them mean anything twice**: an experiment that is not `running` answers
`409 not_running` rather than letting a completed test be flipped back to `stopped`, undoing the
verdict it already recorded.

| action | experiment | variant | hypothesis |
| ------ | ---------- | ------- | ---------- |
| `declare_winner` | `completed` | `winner` | `completed` |
| `stop` | `stopped` | `proposed` | `pending` |
| `discard` | `stopped` | `rejected` | `skipped` |
| cron finalize | `completed` | `winner` / `rejected` from `recommendation` | `completed` |

**No path may leave a row in `testing`.** All four used to, in some combination, and a hypothesis
stranded there is unreachable from every status filter in the app. `stop` returns the hypothesis to
`pending` specifically because that is the path the panel's own "stop this test and relaunch it with a
goal" note asks the user to take.

## Statistics — `lib/stats.ts`

A two-proportion z-test. `result.recommendation` is one of `EXPERIMENT_RECOMMENDATION`
(`ship_variant` | `keep_control` | `inconclusive`), derived from significance plus leader.

**Two gates, and the second is what the first cannot do alone.** Significance needs `MIN_SAMPLE` (200)
impressions per arm **and** `MIN_CONVERSIONS` (10) across both. At a normal 2-5% conversion rate, a
sample counted only in impressions clears its bar while each arm still holds a handful of conversions,
where one lucky click moves the rate by a third and the z-test happily returns p < 0.05 — a confident
`ship_variant` badge on noise, which is worse than no recommendation at all.

`normalCdf` is the Abramowitz & Stegun 7.1.26 error-function approximation; that is the provenance of
the constants in it.

The numbers are recomputed on every read and the panel polls them; the **recommendation** is what
waits for the end. See
[invariants.md](invariants.md#the-recommendation-waits-for-the-end-the-numbers-do-not).

## The snippet — `public/embed.js`

One tag per landing page, keyed on `analyses.embedKey`, installed once from the live-test screen. The same
tag serves whichever test is running.

```html
<script src="<APP_URL>/embed.js" data-key="<embedKey>"></script>
```

**It is served straight from `public/` and can never import from `lib/`.** Its few constants are
therefore duplicated locally on purpose — do not "fix" that duplication.

Rules it must keep:

- **Fail safe.** A bad selector or a network error never breaks the host page.
- **It waits for the page to actually render** before looking for its target. Navigation is not paint,
  and a client-rendered landing page reaches the snippet holding nothing but a skeleton
  (`LOCATE_TIMEOUT_MS`).
- **An impression is only recorded once the page is confirmed to hold the control copy.** A visitor
  bucketed into the variant arm on a page where the target was never found would have been shown the
  control, and counting them reports an A/A test as a real result — with a real-looking rate, p-value
  and recommendation on top of it. **Bucketing therefore happens after the element is located**, so a
  visit that could not be served never writes an arm to storage either.
- **The swap removes no node, and `swapText` is a port of `applyVariantCopy` (`lib/scrape.ts`).**
  `textContent` would delete every child, and a framework still holding references to those children
  throws `Failed to execute 'removeChild' on 'Node'` on the next unmount — taking down the host page,
  which the fail-safe rule above forbids. So a headline split across pieces
  (`<h1>Ship <span>faster</span></h1>`) keeps every piece: the variant's words are shared out across
  the existing text nodes by weight, each fragment is reserved at least one word so a styled span is
  never left empty, and whitespace-only nodes are skipped so words cannot glue together.

  **The two copies must stay in step.** `applyVariantCopy` renders the variant preview an agency
  shows its client; this one renders it to live visitors. A divergence means the preview is a picture
  of something no visitor ever saw. The snippet cannot import from `lib/`, which is the only reason
  the logic exists twice — the `[dom]` project in `e2e/dom/apply-variant-copy.spec.ts` pins the
  behaviour of the original.

  **That includes the emphasis placement**, fed by `variant_emphasis` on the config payload: the
  chosen words go into a styled fragment the page already has, and the swap falls back to the
  proportional split rather than create one — see
  [scraping.md](scraping.md#placing-the-emphasis). Creating a `<strong>` here would put an element in
  a tree the host framework rendered, which is the same `removeChild` family of failures the
  no-node-removal rule above exists to prevent, arriving from the other direction.

  **That includes `fitToBox`**, which shrinks the type only when the new copy would be *clipped* by
  the page's own CSS, never when it merely wraps — see
  [scraping.md](scraping.md#fitting-the-copy-back-into-its-box). Here it carries one extra
  responsibility the preview does not need: it remembers the element's original inline `font-size`
  and restores it before every measurement, because `keepApplied` below re-swaps on each mutation
  frame and a fit measured against its own previous output would shrink the element forever.
- **The swap is re-asserted for the life of the page.** A framework that re-renders the swapped node
  puts the control copy back while the visitor stays bucketed in the variant arm — an A/A test
  reported as a real result, which is the same failure the impression rule above exists to prevent,
  arriving later. A `MutationObserver` therefore stays connected after the first swap, coalesced to
  one check per animation frame. The steady-state check is O(1) (is the node we wrote still attached
  and still holding the variant copy?); only a **detached or reverted** node pays for `locate()`.
  That is also why `locate()` matches on the **control** copy: once the variant is in place it finds
  nothing, so re-asserting is idempotent and our own write cannot loop.
- **Bucketing is sticky** — the same visitor always sees the same arm.
- **The conversion listener is delegated from the document**, because a CTA that appears later would
  otherwise never carry one.
- **The swap waits for the page to settle, and both arms wait together.** Writing before a framework
  hydrates makes the server HTML and the client tree disagree; React answers a mismatch by discarding
  the server markup and regenerating the subtree — a console error on someone else's site plus a full
  client re-render. `whenSettled` waits for `load` and then for an idle callback.

  **Idle alone is not enough, and this was measured, not assumed.** Before the framework's bundle has
  executed the main thread is already quiet, so `requestIdleCallback` fires *ahead* of hydration and
  the mismatch happens anyway. Waiting for `load` first is what actually clears it. `SETTLE_MAX_MS`
  caps the wait, because `load` also waits for images.

  **Bucketing and the impression moved behind the same wait.** Bucketing at locate time and swapping
  after it would count a visitor who left in between as `variant` while they only ever saw the
  control; counting control early and variant late biases the sample the same way, one arm at a time.
  A visit that ends during the wait is now excluded from **both** arms, which is the same symmetric
  exclusion the not-found path gives.
- **Accepted, not fixed:** the original copy is visible before the swap, and the settle wait above
  makes that window longer. Cloaking it would mean hiding an element whose selector the snippet does
  not know until its config arrives.

### It says why it failed, without saying who it is

The snippet is installed by someone else's developer on someone else's site, so every failure mode —
CSP, an ad blocker, drifted copy, a bad goal selector — used to look identical from the outside:
nothing happened, silently. Each of those now warns.

**The default prefix is `[ab]` and names no product.** These messages land in the console of an
agency's client's site, and the report they belong to may be white-labelled — see
[invariants.md](invariants.md#white-label-hangs-off-one-boolean-on-four-independent-surfaces). Adding
`data-debug` to the tag switches the prefix to `[hunch]` and turns on per-experiment tracing (arm
assigned, swap applied, re-application, events sent). Verbose output is opt-in; the warnings are not.

The `document.currentScript` guard warns rather than returning silently, because a null there means
the tag was injected in a way that loses its attributes — which is what a bundler import or some tag
managers do, and it is unfalsifiable from the outside.

### The host site's CSP must allow two directives

```
script-src <APP_URL>; connect-src <APP_URL>;
```

`script-src` alone loads the snippet and then blocks both `/api/track/config` and
`/api/track/event` — a test that runs and records nothing. This is the first thing to check when a
live test shows no impressions, and it is why `components/embed-snippet.tsx` renders them as
troubleshooting beside the tag — with `data-debug="1"` named there too — rather than leaving them to
be discovered.

## Tracking routes (public)

**Unauthenticated + CORS `*`; excluded from auth middleware (`/api/track` in the matcher).** Both are
best-effort and answer even on bad input so the host page never breaks.

### `GET /api/track/config?key=<embedKey>`

Returns the analysis's live experiments as
`[{ experimentId, selector, controlCopy, variantCopy, variantEmphasis, splitPercent }]`. No goal is served: it is the
same fixed attribute on every page, so the snippet already knows it.

`running` alone is not enough: an experiment past its window is over whether or not the nightly cron
has reached it, so the query also applies `experimentIsLive()` from `lib/experiments.ts`. Without it an
expired-but-unfinalized test keeps mutating the customer's page until the next sweep — forever, if the
cron service was never created.

### `POST /api/track/event`

Body `{ key, experimentId, arm, type, visitorId }` (`arm` in `EXPERIMENT_ARM`, `type` in
`TRACK_EVENT`), sent via `navigator.sendBeacon` as a `text/plain` blob so it stays a CORS simple
request. Verifies the experiment belongs to `key` and is `running`, then increments the matching
`experiment_stats` counter. Returns `204`.

`visitorId` is inserted into `experiment_events` first, and **the counter moves only when that insert
is fresh**. See
[invariants.md](invariants.md#an-event-without-a-visitorid-is-dropped-never-counted).

## Cron

Both routes are `GET`, driven by the two Railway cron services (see [deployment.md](deployment.md)),
and authenticate through the shared `authorizeCron` (`lib/cron-auth.ts`) -> `401` otherwise, **before
any work**. `GET` for a mutating route is the established shape here because the caller is
`curlimages/curl`; a `POST` needs `-X` and gets forgotten. Both are excluded from auth middleware
(`api/cron` in the matcher), so a new route under this prefix inherits the exemption.

### `GET /api/cron/finalize-experiments`

Marks every `running` experiment whose window has closed as `completed` (+ `stopped_at`), its
hypothesis `completed`, and its variant `winner` or `rejected` from the computed `recommendation`.
Returns `{ finalized: n }`.

This is the **normal** way a test ends, so it is where most variants get their verdict — leaving them
in `testing` here would mean the status only ever resolved for the minority of tests someone closed by
hand.

"Window has closed" is `experimentIsOver()` from `lib/experiments.ts`, **not `ends_at <= now()`**.
`ends_at` is nullable, and that comparison on a null is null rather than false, so a row missing it
would never be finalized — it would run, and keep rewriting the customer's page, forever. The helper
falls back to the `started_at + duration_days` the row already carries, and `/api/track/config` reads
the same definition so the two can never disagree.

**This route is the only thing that ends a test.** Without the `cron-finalize` service actually created
in Railway, no experiment ever reaches its end date: free users stay permanently gated at one
concurrent test, and every landing page stays mutated.

### `GET /api/cron/prune-screenshots`

Deletes variant previews older than `SCREENSHOT_RETENTION_DAYS` and returns `{ pruned: n }`. Nothing
else ever deleted one, so the volume used to grow for the life of the deploy until `writeFile` hit
`ENOSPC` — which `/api/report/screenshot` catches and reports as `url: null`, making a full disk look
exactly like previews that simply do not work.

Four things about it are load-bearing:

- **Clears `variants.screenshot_url` before unlinking.** The failure windows are not symmetric: a row
  pointing at a missing file is the one state that renders a broken image, while an orphaned file with
  a null column just regenerates on the next click and gets retried tomorrow.
- **Matches by URL equality, not by parsing the variant id out of the filename.** `saveScreenshot`
  writes `<variantId>-<uuid>.png`, so the prefix is *available* — but a variant can own an expired file
  and a current one at once (a retry click renders twice), and deriving the id from the expired one
  would discard a screenshot that is still good.
- **Tolerates a missing directory.** `SCREENSHOT_DIR` does not exist until the first `saveScreenshot`
  calls `mkdir`, so a fresh deploy's first run must read as `{ pruned: 0 }` rather than a `500` that
  looks like a permanently broken cron.
- **Returns a count and nothing else.** A directory listing in the body would describe the volume's
  contents to anyone who ever obtained the secret.

**`screenshot_url` is deliberately not indexed.** A nightly sequential scan on that table is the
intended cost — do not add an index for it.

## The results panel — `components/experiment-panel.tsx`

- Section badge + `EXPERIMENT_STATUS` pill, the problem, and two arm tiles (Control vs Variant) each
  showing conversion rate and `conversions / impressions`; the leading arm is highlighted.
- A significance line: "Not enough data yet" / "&lt;x&gt;% lift so far, not yet significant" /
  "Significant: &lt;x&gt;% lift (p=...)". Live and recomputed on every poll.
- While `running`: an "Ends in N days" countdown (from `endsAt`; past-due -> "Finalizing..."), polling
  of `GET /api/experiments/[id]`, and Stop / Discard / Declare winner.
- When `completed` / `stopped`: the recommendation pill (`EXPERIMENT_RECOMMENDATION_*`) plus Copy
  report / Download .md built by `buildReportMarkdown` in `lib/export.ts`. Export is paid-only
  (`canExport`); free plans get an upgrade link to `CONTACT_PATH` in its place.
- Status -> pill colour from `EXPERIMENT_STATUS_BADGE_CLASS`: `running` amber, `completed` green,
  `stopped` gray.
