# Live A/B tests

The whole loop: launch a test, serve it to the customer's page, count, decide. Everything about
running a test lives on its own tab of the analysis screen, because testing is the step that comes
**after** the work is won and access to the site exists — see [analysis-ui.md](analysis-ui.md).

It never appears on the public report: a prospect reading someone else's teardown installs no snippet.

## Launching — `POST /api/experiments`

Launches a live test for a chosen `(hypothesis, variant)`. Ownership via `hypotheses -> analyses`.

```json
{ "hypothesisId": "uuid", "variantId": "uuid", "goalSelector": "a.cta", "splitPercent": 50, "durationDays": 14, "variantCopy": "edited copy" }
```

Two gates:

- **Free users may have only `FREE_EXPERIMENTS_LIMIT` (1) `running` experiment** -> `403 limit_reached`.
- **On any plan, a hypothesis that already has a `running` experiment** -> `409 already_running`. Two
  live tests on one hypothesis means two experiments racing to rewrite the same element, and the
  snippet cannot choose between them.

In a transaction: snapshots `control_copy` / `variant_copy` / `selector`, inserts the experiment plus
its two `experiment_stats` rows, and flips the variant and hypothesis to `testing`.

`durationDays` must be 7, 14 or 30 (default 14); `endsAt` is `now + durationDays`. `variantCopy`
(optional) lets the user edit at launch and is snapshotted instead of the stored variant copy — the
**control copy is never editable**.

`goalSelector` is what a conversion actually *is*. The run-a-test screen always sends one, preselected
from `analyses.goal_candidates`. Without it the snippet records impressions and no conversions, so the
test can never produce a result — and it records **no conversions at all** rather than counting a
click on the swapped element, so a result is never manufactured from the wrong event.

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

One tag per landing page, keyed on `analyses.embedKey`, installed once from the Tests tab. The same
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
- **Bucketing is sticky** — the same visitor always sees the same arm.
- **The conversion listener is delegated from the document**, because a CTA that appears later would
  otherwise never carry one.
- **Accepted, not fixed:** the original copy is briefly visible before the swap. Cloaking it would mean
  hiding an element whose selector the snippet does not know until its config arrives.

## Tracking routes (public)

**Unauthenticated + CORS `*`; excluded from auth middleware (`/api/track` in the matcher).** Both are
best-effort and answer even on bad input so the host page never breaks.

### `GET /api/track/config?key=<embedKey>`

Returns the analysis's live experiments as
`[{ experimentId, selector, controlCopy, variantCopy, splitPercent, goalSelector }]`.

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
- **Warns when the experiment has no `goalSelector`**: it is recording visitors but can never record a
  conversion, so a 0% rate there is not a real result.
- Status -> pill colour from `EXPERIMENT_STATUS_BADGE_CLASS`: `running` amber, `completed` green,
  `stopped` gray.
