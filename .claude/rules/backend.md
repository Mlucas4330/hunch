## Database schema

```
users
- id                 (uuid, PK)
- email              (text, unique)
- name               (text)
- avatar_url         (text, nullable)
- plan               (enum: SUBSCRIPTION_PLAN, default: free)
- stripe_customer_id (text, nullable)
- analyses_count     (int, default: 0)   <- free tier usage gate
- usage_period_start (timestamp, default now: start of the current monthly allowance window)
- created_at         (timestamp)

subscriptions
- id                     (uuid, PK)
- user_id                (FK -> users.id)
- stripe_subscription_id (text, unique)
- plan                   (enum: SUBSCRIPTION_PLAN)
- status                 (text: active | canceled | past_due)
- current_period_end     (timestamp)
- created_at             (timestamp)

analyses
- id              (uuid, PK)
- user_id         (FK -> users.id)
- url             (text)
- brief           (text, nullable: optional business details the founder supplied for finished copy)
- competitors     (jsonb, nullable: { name, url }[] benchmarked against)
- goal_candidates (jsonb, nullable: { text, selector }[] clickable elements captured during the
                   scrape; the conversion-goal picker offers these)
- research_brief  (text, nullable: the competitor research output, kept so the on-demand alternate
                   variants are grounded without paying for a second web search)
- embed_key       (uuid, unique: public opaque key the snippet uses; never expose analyses.id)
- locale          (enum: LOCALE, default: en -- the language the AI wrote this analysis in, pinned
                   at creation so later alternates match the hypotheses already stored)
- created_at      (timestamp)

hypotheses
- id             (uuid, PK)
- analysis_id    (FK -> analyses.id)
- section        (enum: SECTIONS)
- problem        (text)
- current_copy   (text)
- impact_score   (int, 1-10)
- effort_score   (int, 1-10)
- rationale      (text)
- selector       (text, nullable: DOM anchor captured during scrape for client-side apply)
- target         (enum: HYPOTHESIS_TARGET, default: manual) <- `auto` only when current_copy
                  resolves to exactly one element; only `auto` can run as a live test or preview
- status         (enum: HYPOTHESIS_STATUS, default: pending)
- created_at     (timestamp)

flow_fixes                      <- the flow playbook, one row per structural fix
- id           (uuid, PK)
- analysis_id  (FK -> analyses.id)
- category     (enum: FLOW_CATEGORY -- the conversion blocker removed, not a page section)
- title        (text: short imperative, e.g. "Offer login with Google")
- problem      (text: one sentence on what the current flow costs the visitor)
- steps        (jsonb: string[], 2-5 concrete implementation actions)
- impact_score (int, 1-10)
- effort_score (int, 1-10)
- evidence     (text, nullable: cites the reference corpus aggregate when one was available)
- position     (int: impact desc, assigned at insert)
- created_at   (timestamp)

No variants, no target, no status: nothing here is a single-element text swap, so there is nothing
for the embed snippet to apply and nothing to A/B. A founder ships the steps by hand.

reference_pages                 <- the corpus the playbook is grounded in; NOT user data
- id          (uuid, PK)
- url         (text, unique)
- name        (text)
- structure   (jsonb: PageStructure -- the same shape captured from an analysed page, which is what
               makes matching an analysis against the corpus a field-by-field diff)
- copy_digest (text: preprocessHtml(html) truncated; for auditing rows, not for generation)
- source      (text: provenance, e.g. 'saaslandingpage')
- scraped_at  (timestamp: refreshed on re-ingest)
- created_at  (timestamp)

No user FK and no relations. Populated only by `npm run ingest:references`.

variants
- id             (uuid, PK)
- hypothesis_id  (FK -> hypotheses.id)
- copy           (text)
- evidence       (text, nullable: competitor pattern this variant borrows/beats)
- position       (int: 0 = the recommended challenger, written during the analysis; 1 and 2 are the
                  alternates, written on demand by POST /api/hypotheses/[id]/variants)
- status         (enum: VARIANT_STATUS, default: proposed)
- screenshot_url (text, nullable: Vercel Blob URL of the variant applied to the live page)
- created_at     (timestamp)

waitlist                        <- leads captured by the public report's paywall
- id         (uuid, PK)
- email      (text, unique)
- phone      (text, nullable)
- embed_key  (uuid, nullable: which report the lead came from; not a FK)
- created_at (timestamp)

experiments
- id            (uuid, PK)
- analysis_id   (FK -> analyses.id)
- hypothesis_id (FK -> hypotheses.id)
- variant_id    (FK -> variants.id: the single challenger against the control copy)
- status        (enum: EXPERIMENT_STATUS, default: running)
- selector      (text, nullable: snapshot from hypothesis at launch)
- control_copy  (text: snapshot of original copy)
- variant_copy  (text: snapshot of challenger copy)
- goal_selector (text, nullable: element whose click counts as a conversion)
- split_percent (int, default 50: % of visitors bucketed into the variant arm)
- duration_days (int, default 14: fixed test window, one of EXPERIMENT_DURATIONS 7/14/30)
- started_at    (timestamp)
- ends_at       (timestamp, nullable: started_at + duration_days; cron finalizes past this)
- stopped_at    (timestamp, nullable)
- created_at    (timestamp)

experiment_stats
- id            (uuid, PK)
- experiment_id (FK -> experiments.id)
- arm           (enum: EXPERIMENT_ARM)
- impressions   (int, default 0)
- conversions   (int, default 0)
- unique(experiment_id, arm)   <- one row per arm, counters incremented atomically

experiment_events               <- dedupe ledger behind experiment_stats
- id            (uuid, PK)
- experiment_id (FK -> experiments.id)
- visitor_id    (uuid: sticky per-browser id minted by the snippet, not a user)
- arm           (enum: EXPERIMENT_ARM)
- type          (enum: TRACK_EVENT)
- created_at    (timestamp)
- unique(experiment_id, visitor_id, arm, type)  <- a counter only moves on a fresh insert

stripe_events                   <- webhook idempotency + ordering
- id               (text, PK: the Stripe event id)
- type             (text)
- subscription_id  (text, nullable: lets ordering be judged per subscription)
- event_created_at (timestamp: event.created, not our clock)
- received_at      (timestamp)
```

**Relations**

```
users       1 -> N  analyses
analyses    1 -> N  hypotheses
analyses    1 -> N  flow_fixes
analyses    1 -> N  experiments
hypotheses  1 -> N  variants
experiments 1 -> N  experiment_stats
users       1 -> 1  subscriptions
```

## API routes

### Auth

`GET|POST /api/auth/[...nextauth]`
Standard NextAuth catch-all. Handles Google OAuth callback, session creation, and user upsert into `users` on first login.

### Analyses

`POST /api/analyses`
Core route. Chain: check usage gate -> Puppeteer scrape -> preprocess HTML -> competitor research
-> corpus evidence -> Claude API (hypotheses + playbook in parallel) -> persist -> return.

Request:

```json
{ "url": "https://example.com", "brief": "optional business details", "competitorUrls": ["https://rival.com"] }
```

`brief` (optional, all plans) is stored on the analysis and passed into generation so variants come
back as finished copy instead of `[placeholders]`. `competitorUrls` (optional, max 3) is the paid
**Competitor mode**: honored only when `user.plan !== 'free'` (free users' URLs are dropped
server-side and it auto-searches instead). When provided, `analyzeLandingPage` scrapes those pages
for the competitive brief instead of web search, and `analyses.competitors` is set to them.

Response:

```json
{
  "analysis": {
    "id": "uuid",
    "url": "https://example.com",
    "created_at": "timestamp",
    "hypotheses": [ ...HypothesisRow[] ],
    "flowFixes": [ ...FlowFixRow[] ]
  }
}
```

`flowFixes` is `[]` when playbook generation failed. It is an addition to the analysis, never a
precondition for it, and it rides the same `persist_failed` catch as everything else in the
transaction.

Errors:

- `403` - free tier limit reached
- `422` - invalid or unsupported URL (including one that resolves to a private address)
- `429` - rate limited
- `502` - Puppeteer scrape failed
- `500` - Claude API or DB failure

**Usage gate logic:** the free allowance is monthly and rolls **lazily** in `lib/usage.ts` rather
than on a schedule. Every read and every write asks whether `users.usage_period_start` is still the
current window; once it has lapsed the count reads as 0 and the next analysis restarts the window.
No cron is involved, so a missed job can never leave a user permanently capped.

```typescript
if (hasReachedFreeLimit(user)) {
    return Response.json({ error: 'limit_reached' }, { status: 403 })
}
```

`canExport(plan)` lives beside it: export is a paid-plan capability.

`GET /api/analyses`
Returns analysis history. Free users: last 3. Paid: paginated. Both this route and the dashboard
server component read through `listAnalysesForUser` in `lib/analyses.ts`, so the free history cap
cannot drift between the page and the route that feeds it.

Query params: `?page=1&limit=10`

Response:

```json
{
  "analyses": [ ...AnalysisRow[] ],
  "total": 12,
  "page": 1
}
```

`GET /api/analyses/[id]`
Returns one analysis with all hypotheses. Returns `404` if not found or not owned by the requesting user.

### Hypotheses

`PATCH /api/hypotheses/[id]`
Updates `status` only. Validates against `HYPOTHESIS_STATUS` enum.

Request:

```json
{ "status": "testing" }
```

Response: updated hypothesis row.

`POST /api/hypotheses/[id]/variants`
Writes the two alternate challengers the analysis deliberately skipped. Ownership via
`hypotheses -> analyses`. **Idempotent**: a hypothesis that already has `VARIANTS_PER_HYPOTHESIS`
(3) variants is returned unchanged, so a reload or a double fetch never appends duplicates.
Otherwise it runs one small `generateObject` over `AlternateVariantsSchema`, seeded with the
hypothesis plus the analysis's stored `research_brief` and `brief` (no second web search), and
inserts the results at positions 1 and 2.

Response: `{ variants: VariantRow[] }` (all three, ordered by position).

`GET /api/hypotheses/[id]/variants`
Returns the hypothesis's variants ordered by position, without generating anything.

### Experiments (live A/B tests)

`POST /api/experiments`
Launches a live test for a chosen `(hypothesis, variant)`. Ownership via
`hypotheses -> analyses`. **Gate**: free users may have only `FREE_EXPERIMENTS_LIMIT` (1)
experiment with `status='running'` at a time -> `403 limit_reached`. In a transaction:
snapshots `control_copy` / `variant_copy` / `selector`, inserts the experiment + its two
`experiment_stats` rows, and flips the variant and hypothesis to `testing`.

Request:

```json
{ "hypothesisId": "uuid", "variantId": "uuid", "goalSelector": "a.cta", "splitPercent": 50, "durationDays": 14, "variantCopy": "edited copy" }
```

`durationDays` must be 7, 14, or 30 (default 14); `endsAt` is set to `now + durationDays`.
`variantCopy` (optional) lets the user edit the copy at launch; when present it is snapshotted as the
experiment's `variant_copy` instead of the stored variant copy (control copy is never editable).
`goalSelector` is what a conversion actually is: the run-a-test screen always sends one, preselected
from `analyses.goal_candidates`. Without it the snippet records impressions and no conversions, so
the test can never produce a result.

Response: `{ experiment: ExperimentWithResult, embedKey }`.

`GET /api/experiments?analysisId=<uuid>`
Lists the user's experiments (optionally scoped to one analysis), each with a computed
`result` (two-proportion z-test from `lib/stats.ts`). `result.recommendation` is one of
`EXPERIMENT_RECOMMENDATION` (`ship_variant` | `keep_control` | `inconclusive`), derived from
significance + leader.

`GET /api/experiments/[id]`
Returns one experiment with its live `result`. `404` if not owned.

`PATCH /api/experiments/[id]`
Body `{ action: 'stop' | 'declare_winner' | 'discard' }`. `stop` -> `stopped`;
`declare_winner` -> `completed` + variant `winner` + hypothesis `completed`;
`discard` -> `stopped` + variant `rejected`.

### Tracking (public - snippet)

**Unauthenticated + CORS `*`; excluded from auth middleware (`/api/track` in the matcher).**
Both routes are best-effort and answer even on bad input so the host page never breaks.

`GET /api/track/config?key=<embedKey>`
Returns the analysis's `running` experiments as
`[{ experimentId, selector, controlCopy, variantCopy, splitPercent, goalSelector }]`.

`POST /api/track/event`
Body `{ key, experimentId, arm, type, visitorId }` (`arm` in `EXPERIMENT_ARM`, `type` in
`TRACK_EVENT`), sent via `navigator.sendBeacon` as a `text/plain` blob (stays a CORS simple
request). Verifies the experiment belongs to `key` and is `running`, then increments the matching
`experiment_stats` counter. Returns `204`.

`visitorId` is a sticky uuid the snippet mints per browser. It is inserted into `experiment_events`
first, and the counter moves **only when that insert is fresh** -- the unique index is what makes an
arm un-inflatable by anyone holding the (necessarily public) embed key, and what stops a reload from
double-counting. The field is optional so a snippet cached from before it shipped keeps reporting.

### Public report (outreach surface)

**Unauthenticated + CORS `*`; excluded from auth middleware (`api/waitlist`, `api/report`).**
Both back `/r/[embedKey]`, which anyone with the link can open. Authorization is the opaque
`embedKey` alone, and neither route leaks whether an unknown key exists.

`POST /api/report/screenshot`
Body `{ embedKey, hypothesisId }`. Renders the landing page with the recommended variant swapped
in and uploads the PNG to Vercel Blob, caching the URL on `variants.screenshot_url`. Returns
`{ url }`, with `url: null` whenever a preview is not possible (manual target, stale selector,
missing Blob config) so the report degrades to copy-only instead of breaking.

**User-initiated, one request per click.** The report used to fire this on mount for every visible
hypothesis, so opening a cold report launched `REPORT_PREVIEW_LIMIT` browsers before anyone had
scrolled to them. The button in `components/variant-preview.tsx` is what triggers it now.

`POST /api/waitlist`
Body `{ email, phone?, embedKey? }`. Inserts a lead with `onConflictDoNothing`. Returns `201`.
Read back by the admin-only `/admin/leads` page; there is no other way to see these rows.

### Cron (auto-finalize)

`GET /api/cron/finalize-experiments`
Triggered daily by Vercel Cron (`vercel.json`). Authenticates via
`Authorization: Bearer <CRON_SECRET>` -> `401` otherwise. Marks every `running` experiment with
`ends_at <= now()` as `completed` (+ `stopped_at`) and its hypothesis `completed`, then returns
`{ finalized: n }`. Excluded from auth middleware (`api/cron` in the matcher). Sub-daily schedules
require a paid Vercel plan.

### Billing

`POST /api/billing/checkout`
Creates Stripe Checkout session.

Request:

```json
{ "plan": "solo" }
```

Response:

```json
{ "url": "https://checkout.stripe.com/..." }
```

`POST /api/billing/portal`
Creates Stripe Customer Portal session for plan management.

Response:

```json
{ "url": "https://billing.stripe.com/..." }
```

`POST /api/billing/webhook`
Stripe webhook receiver. **Must be excluded from NextAuth middleware.**

Handled events:

- `checkout.session.completed` -> create `subscriptions` row, update `users.plan`
- `customer.subscription.updated` -> update `subscriptions.status` and `plan`
- `customer.subscription.deleted` -> set `plan` back to `free`, mark subscription `canceled`

Verify signature with `stripe.webhooks.constructEvent` against the **raw** body before processing.

**Idempotency and ordering.** Every event is claimed into `stripe_events` (PK = `event.id`,
`onConflictDoNothing`) *before* any work; a delivery that claims nothing returns `200` untouched, so
Stripe's retries are no-ops. Ordering is guarded separately, because idempotency does not cover it:
an `updated` whose `event.created` predates that subscription's recorded `deleted` is skipped rather
than re-granting the plan the cancellation revoked.

**Entitlement is never granted from metadata alone.** `metadata.plan` is writable from the Stripe
dashboard, so it is accepted only when it is a real `SUBSCRIPTION_PLAN` value and otherwise falls
through to the price id. The user is resolved from `users.stripe_customer_id` matching the
subscription's customer, with `metadata.userId` as a fallback that must still resolve to a real row.

`lib/stripe.ts` pins `apiVersion` -- the webhook reads `item.current_period_end`, whose shape has
moved between versions, so following the account default turns an SDK upgrade into silent breakage.

### Usage

`GET /api/usage`
Returns usage data for the current user.

Response:

```json
{
    "analyses_count": 2,
    "limit": 3,
    "plan": "free"
}
```

## AI pipeline

### 1. Preprocess scraped HTML

Strip scripts, styles, and meta tags. Extract semantic text only:

```
H1: ...
Subheadline: ...
CTA button: ...
Feature: ...
Testimonial: ...
Pricing: ...
```

### 2. Zod schema (matches DB schema exactly)

```typescript
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { SECTIONS } from '@/lib/enums'

const VariantSchema = z.object({ copy: z.string(), evidence: z.string() })

const HypothesisSchema = z.object({
    section: z.enum(SECTIONS).catch(SECTION_FALLBACK),
    problem: z.string(),
    current_copy: z.string(),
    variants: z.array(VariantSchema).length(1),
    impact_score: z.number().int().min(1).max(10),
    effort_score: z.number().int().min(1).max(10),
    rationale: z.string()
})

const CompetitorSchema = z.object({ name: z.string(), url: z.string() })

const AnalysisOutputSchema = z.object({
    competitors: z.array(CompetitorSchema).max(4),
    hypotheses: z.array(HypothesisSchema).min(5).max(8)
})

// The two alternates, generated separately by POST /api/hypotheses/[id]/variants.
const AlternateVariantsSchema = z.object({ variants: z.array(VariantSchema).length(2) })

// `section` is the one field that degrades instead of rejecting. It only picks a badge colour, so an
// unrecognized value costs one mislabelled pill, while rejecting it throws away every other
// hypothesis in the analysis plus the generation call already paid for. `.catch` does not strip the
// enum from the JSON schema, so the model is still told the exact allowed values -- and it covers a
// missing or null value too, which is why the parsed type stays a plain `Section`.
//
// The failure it exists for is one the prompt caused: the element list handed to generation used to
// format each line as `(h2) "text"`, and the model read that tag as the section label and returned
// `section: 'h2'`. The list now uses `<tag> "text"` and `systemPrompt` says outright that an HTML tag
// is not a section value, but a schema that survives the next such slip is the actual guarantee.
//
// The score bounds and `.min(5).max(8)` deliberately do NOT degrade: those catch an analysis that is
// genuinely wrong (a page that did not render, a model refusal) and must keep rejecting.

// The flow playbook, generated by its own call in parallel with the one above. No current_copy and
// no variants: nothing here is a text swap, so `steps` carries the implementation instead.
const FlowFixSchema = z.object({
    category: z.enum(FLOW_CATEGORY),
    title: z.string(),
    problem: z.string(),
    steps: z.array(z.string()).min(2).max(PLAYBOOK_STEPS_MAX),
    impact_score: z.number().int().min(1).max(10),
    effort_score: z.number().int().min(1).max(10),
    evidence: z.string()
})

const PlaybookOutputSchema = z.object({
    fixes: z.array(FlowFixSchema).min(PLAYBOOK_MIN).max(PLAYBOOK_MAX)
})
```

**Only one variant is generated during the analysis.** Generation is output-token-bound, and three
variants across 5-8 hypotheses meant writing up to 24 copy + evidence pairs while Screen 1 shows
only `variants[0]`. The alternates are written on demand when someone opens the run-a-test screen,
which keeps them off the analysis critical path. `variantCopyRules(language)` in `lib/ai/prompt.ts`
is shared by both prompts so an alternate obeys exactly the same copy rules as the recommendation.
`writingRules(language)` sits one level below it, holding the output-language and typography rules
that `variantCopyRules` and `playbookPrompt` both compose, so those can never drift between the
things one analysis produces.

**Copy length is a measured per-element ceiling, not prose guidance.** `variantWordBudget(words)` in
`lib/text.ts` is `max(words + VARIANT_WORD_BUDGET_FLOOR, ceil(words * VARIANT_WORD_BUDGET_RATIO))`,
and every line of the "Page elements" list carries its own ceiling: `<tag> "text" (max N words)`. The
prompt used to only say "match the element's length", with one qualitative rule that constrained
labels and CTAs and said nothing about a headline -- which is how a six word hero title came back as
a 50 word paragraph. The alternates call never sees the element list, so
`generateAlternateVariants` computes the ceiling from `currentCopy` with the same function; an
alternate is never held to a different standard than the recommendation beside it.

This is deliberately **not** `TARGET_MATCH_MAX_WORD_RATIO`. That one guards a matching heuristic,
where being wrong means previewing the wrong element, so it stays tight; a writing budget has to
leave room for a genuinely better line. The floor exists because a pure ratio is nonsense at the
short end: a 2-word CTA at 1.5x is 3 words, which forbids "Start free, no card required".

The overshoot guard `warnOverLength` is **log-only**, by design. A `.max()` on `copy` in
`VariantSchema` would fail the whole 16k-token `generateObject` with no retry wrapper, turning one
long headline into an opaque `500` that costs the user the entire analysis; truncating would ship a
headline cut mid-clause to a prospect on the public report; and regenerating puts a second Sonnet
call on the critical path for a soft rule. Logging makes the ceiling's effectiveness measurable in
production, which is what has to come before escalating it. The fixtures in `lib/ai/fixtures.ts` all
fit their own ceilings, so they stay a correct reference rendering of the rule.

### 2a. Structural readout and the reference corpus

`scrapePage` returns a `PageStructure` alongside `html` and `elements`: a flat record of what the
page *does* (`hasOauth`, `formFieldCount`, `hasFaq`, `hasPricing`, `hasTestimonials`, `hasVideo`,
`hasStickyCta`, `bodyLinkCount`, `aboveFoldCtaCount`, `navLinkCount`, `sectionCount`, `wordCount`).
Every signal is deliberately conservative: a false negative costs one redundant suggestion, a false
positive silently drops a real fix. Two rules follow from how it is measured:

- A provider name alone is never social sign in (a dev tool links to GitHub in its nav). The same
  control must also read as an auth action, matched against `STRUCTURE_PATTERNS.auth`.
- `bodyLinkCount` is named for what it counts. It is every short clickable outside nav/header/footer,
  including a feature card's "Learn more", so it must never be presented to the model as a CTA count.

`scrapePage` sets a 1280x800 viewport, matching `screenshotVariant`. Both the visibility filter in
`captureElements` and `aboveFoldCtaCount` are measured against it, so it cannot be left at
Puppeteer's 800x600 default without calling a normal hero "below the fold".

Navigation alone is not a rendering signal. `waitUntil: 'networkidle2'` reports that the sockets went
quiet, which a client-rendered page satisfies while its skeleton is still the only thing painted, so
both capture paths call `settlePage` before reading the DOM: it polls `document.body.innerText`
length every `SCRAPE_SETTLE_POLL_MS` and returns once the text has stopped changing by more than
`SCRAPE_SETTLE_TEXT_TOLERANCE` *and* is at least `SCRAPE_SETTLE_MIN_TEXT_LENGTH` long. Both halves of
that condition are load-bearing: a page carrying a countdown or a live counter never goes perfectly
still, and a stable but skeleton-sized sample means the frame has not painted rather than that the
page is finished. The wait is bounded by `SCRAPE_SETTLE_TIMEOUT_MS` and fail-soft -- a page that
never settles is analysed on what it did render instead of failing the scrape.

`SCRAPE_SETTLE_TIMEOUT_MS` is deliberately generous (25s). A page that renders fast settles in about
two polls and never touches that budget, so raising it costs only the pathological case -- while too
tight a budget fails *intermittently*, which is far worse to diagnose. The number is calibrated
against a measured target: an app whose API backend cold-starts held a 13-character "Carregando..."
skeleton for ~8s past `networkidle2`, and full scrapes of it ranged 8.6s to 11.2s across runs.

Without it a slow page reaches generation as a spinner, and the model correctly refuses to invent
hypotheses about it -- which surfaces as `AnalysisOutputSchema`'s `min(5)` rejecting the output after
a full Sonnet call, i.e. an opaque `500`. `screenshotVariant` shares the wait for the same reason: a
selector looked up before paint reads as stale and costs the report its preview.

`structuralEvidence(structure)` in `lib/references.ts` turns that readout into a prompt block by
diffing it against `reference_pages`. It reports only in the direction that produces a
recommendation: what proven pages do that this page does not. Two contracts hold it honest:

- **Majority only.** A signal is quoted only when more than `REFERENCE_MAJORITY_RATIO` of the corpus
  does it. The corpus is landing pages, so anything living a click deeper (a signup form's OAuth
  buttons) is legitimately sparse, and a minority count would read as an argument *against* the fix.
- **Fail-quiet.** Returns `''` on an empty corpus or any DB failure. An un-ingested database costs
  the playbook its counts, never the analysis.

The corpus is populated only by `npm run ingest:references` (`scripts/ingest-references.ts`) from the
committed `db/seeds/reference-pages.json`. `saaslandingpage.com` serves 403 to automated fetches, so
the gallery is browsed by hand and only the product pages themselves are scraped, through the same
`scrapePage` (and therefore the same `assertPublicUrl` guard) the app already uses. A page that fails
to scrape drops out rather than aborting the batch.

One non-obvious constraint the CLI exposed: functions handed to `page.evaluate()` are serialized as
source, so esbuild's `__name` keepNames helper (injected when tsx runs the script) is not defined in
the page. `openGuardedPage` declares `window.__name` as an identity function, which is what lets the
scraper run outside the Next build at all.

### 2d. Applying a variant to the live DOM (`applyVariantCopy`)

`screenshotVariant` swaps the copy in **without touching the element's markup**. It used to do
`el.textContent = copy`, which deletes every child node -- and the children are exactly what the
preview exists to show, because `captureElements` targets the innermost block element with its inline
children folded in, so a selector usually lands on something like
`<h1>The <span class="gradient">fastest</span> way to ship</h1>`. That assignment took the gradient
span, the `<br>`, the icons and all their CSS with it, and the preview came back unstyled.

The routine walks the element's text nodes (`TreeWalker`, `SHOW_TEXT`) and writes only into those, so
every element wrapper survives by construction. Three rules make the result readable:

- **Proportional distribution.** The new words are spread across the text nodes in proportion to the
  fragment lengths they replace, so a styled fragment keeps a share of the copy and still renders.
  One word is reserved for each fragment still to come, so a span whose share rounds to zero does not
  go empty; the last node takes the remainder, so rounding never drops a word.
- **Whitespace-only text nodes are never written to.** They are the layout gaps between inline
  fragments, and rewriting them glues words together. Each fragment's original leading and trailing
  whitespace is re-applied around its chunk for the same reason. Where the page had no whitespace
  between two fragments a separator is added, because the split point there is ours, not the page's.
- **The control-copy check stays ahead of the mutation.** Once one node is rewritten there is no
  original text left to compare, and a stale selector would report a successful swap of the wrong
  element instead of the `mismatch` the caller degrades on.

The accepted trade-off: the split follows the *original* fragment sizes, so a span may wrap a
different word than the designer chose. Strictly better than the span disappearing.

`awaitPaint` runs after the swap and after every screenshot. `settlePage` answers "has the text
stopped changing", which is right for reading copy and wrong for taking a picture: a page whose text
is final can still be painting its webfonts and lazy images, and a fallback face reads as a broken
preview. It awaits `document.fonts.ready` plus every pending `document.images` entry, bounded by
`SCRAPE_ASSET_READY_TIMEOUT_MS` and fail-soft, then settles for `SCRAPE_PAINT_SETTLE_MS`.

`SCRAPE_ALLOWED_RESOURCE_TYPES` includes `preflight` for the same reason: a cross-origin stylesheet
or webfont served behind CORS never issues its real request once the `OPTIONS` is aborted, so
blocking it renders the page unstyled. It is not a hole in the guard -- the request handler runs
`isPublicUrl` on a preflight like any other request, and the byte cap still applies.

### 2c. Playbook generation

`generatePlaybook` runs a second `generateObject` over `PlaybookOutputSchema`, in `Promise.all` with
the hypothesis call, so it costs no additional latency on the critical path. It is fed the structure
JSON, the corpus evidence block, and the founder brief. It resolves to `[]` on any failure rather
than rejecting, which is what keeps a playbook failure from taking the analysis down with it.

The prompt's load-bearing rules: never recommend adding something the readout says is already there;
every `steps` entry is one concrete action on the founder's own site (never advice, never replacement
copy); and `evidence` may make a quantitative claim only when corpus evidence was actually supplied,
never an invented statistic or benchmark.

### 2b. Competitor research (web search)

Before structured generation, run a web-search step with the official Anthropic SDK
(`@anthropic-ai/sdk`, tool `web_search_20250305`) using `COMPETITOR_RESEARCH_PROMPT` to find 2-3
real competitor landing pages and summarize their positioning into a brief. The brief is passed
into `generateObject` so variants are grounded in competitors, and each variant carries an
`evidence` line naming the competitor pattern it borrows. It is also persisted to
`analyses.research_brief` so the on-demand alternates never re-run the search. Degrades gracefully
to an empty brief (no `ANTHROPIC_API_KEY` / failure) so generation still succeeds. Skipped when
`E2E_FIXTURES=1`.

This step runs on `RESEARCH_MODEL` (`claude-haiku-4-5`), not the generation model: it is
search-and-summarize, not strategy. Two constraints come with that choice and must hold — Haiku
rejects the `effort` parameter, and it supports only the basic `web_search_20250305` tool variant
(the `_20260209` dynamic-filtering variant needs Sonnet 4.6 or newer). `max_uses` is
`RESEARCH_MAX_SEARCHES` (3); each use is a serial round trip, so more of them buys latency rather
than coverage.

When the user supplies `competitorUrls` (paid Competitor mode), this web-search step is skipped:
`analyzeLandingPage` scrapes those pages concurrently and concatenates the cleaned copy into the
brief instead. A URL that fails to scrape drops out of the brief rather than failing the batch.
A founder `brief` (when present) is appended to the generation prompt so variants use those real
facts and come back finished rather than as `[placeholder]` templates.

### 3. Call

```typescript
const result = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    schema: AnalysisOutputSchema,
    system: systemPrompt(AI_OUTPUT_LANGUAGE[locale]),
    prompt: `Landing page copy:\n\n${cleanedPageContent}\n\nCompetitive research brief:\n\n${brief}`
})

const { competitors, hypotheses } = result.object
```

### 4. System prompt (core IP - iterate carefully)

Focus on: grounding every hypothesis/variant in the competitor brief, specificity of claims, CTA
strength, social proof quality, value proposition clarity, friction reduction. Return 5-8
hypotheses ranked by impact score descending, each with **one** evidence-bearing variant: the
single challenger it most recommends testing (there is no manual variant-picking circuit; the UI
proposes `variants[0]` and the user approves/swaps before launching a test).

**Every hypothesis is a single-element text swap.** The prompt used to route structural ideas into a
hypothesis whose rationale began `"Manual change:"`; that convention is gone. Structural ideas are
flow fixes now, and `systemPrompt` explicitly instructs the model to drop such an idea and spend the
slot on a copy change rather than smuggling it in. Do not reintroduce a structural escape hatch here.
`playbookPrompt` is the other half of this core IP and iterates just as carefully.

### 5. Output language

`systemPrompt`, `alternateVariantsPrompt`, and `playbookPrompt` take a language name (`AI_OUTPUT_LANGUAGE[locale]`) and
instruct the model to write `problem`, `rationale`, `copy`, and `evidence` in it, as a native speaker
would rather than as a word-for-word translation. `POST /api/analyses` passes the caller's UI locale
and stores it on `analyses.locale`; the alternates route reads that stored value rather than the
current UI locale, so alternates match the hypotheses they sit beside.

`current_copy` is the one exception: it quotes the page's exact characters in whatever language the
page is written in, because the embed matches on it.

The prompt's typographic rule (no dashes of any kind, straight quotes, no ellipsis character, no
arrows) restricts **punctuation only**. It must never be phrased as "plain ASCII" again - that
silently forbids the accented characters Portuguese requires. The competitor research brief stays in
whatever language the search returns; generation translates its substance into the target language.

---

## Middleware - `middleware.ts`

Protect all `/dashboard`, `/analyses`, `/billing`, and `/admin` routes with NextAuth session check.
Exclude `/api/billing/webhook` from auth middleware - Stripe calls it directly.
Exclude `/api/track` and `/embed.js` too - the snippet on the customer's site calls them
cross-origin without a session.
Exclude `/api/waitlist` and `/api/report` as well - they back the public `/r/[embedKey]` report,
which is read by prospects who have no session.

Middleware gates **pages only**. Every `/api` route authenticates itself via `getCurrentUser()`, so
the matcher's exclusion list is a performance detail, not the security boundary - never treat a
route as protected because it is missing from that list.

---

## Outbound request guard - `lib/url-guard.ts`

Scraping points a browser at a URL the user chose, and the result is read back to them through the
dashboard and the public report. That makes an unguarded `page.goto` a read-SSRF, not a blind one.

`assertPublicUrl(raw)` throws `UnsafeUrlError` unless the URL is `http(s)`, on an allowed port, and
resolves - via **every** address DNS returns, not just the first - to a public one. Private, loopback,
link-local, CGNAT, unique-local and multicast ranges are all refused, as are `.localhost`, `.local`
and `.internal`. `POST /api/analyses` maps `UnsafeUrlError` to `422`, distinct from a `502` scrape
failure.

That check alone is bypassable, so `openGuardedPage()` in `lib/scrape.ts` re-applies it to every
request the page makes through `setRequestInterception`. This is what actually closes DNS rebinding
and a `302` to the metadata endpoint; the pre-flight check cannot see either. It also caps response
bytes and drops resource types a text scrape does not need.

`launchBrowser()` is the only place a browser is obtained. The Chrome sandbox is on unless
`PUPPETEER_ALLOW_NO_SANDBOX=1`, because the renderer parses pages we do not control while sharing a
process env with the DB and API credentials.

## Rate limiting - `lib/rate-limit.ts`

Distinct from the plan quotas: those are what a tier allows, these are what the infrastructure will
absorb. Backed by Upstash Redis, because serverless invocations share no memory.

`enforceRateLimit(kind, identifier)` returns a `429` with `Retry-After` or `null`, so a guarded route
reads as one early return. Kinds are the `RATE_LIMIT_KIND` enum; windows live in `RATE_LIMITS`, so a
kind without a window fails typecheck. **Fails open** when the Upstash env vars are absent - local
dev and the e2e suite run unlimited, and a missing variable is never an outage.

Identity is the user id on authenticated routes, the IP on `waitlist`, the embed key on
`track/config` (one landing page's traffic arrives from many addresses), and key + IP on
`track/event` and `report/screenshot`.

## Security headers - `next.config.ts`

HSTS, `nosniff`, `DENY` framing, `Referrer-Policy` and `Permissions-Policy` are enforced on every
route. The CSP ships as `Content-Security-Policy-Report-Only` until `CSP_ENFORCE=1`: Next inlines
its bootstrap script and Tailwind inlines styles, so the policy needs `'unsafe-inline'` without a
nonce, and shipping it enforced-but-wrong breaks the app. `/embed.js` is exempted - it is meant to
be loaded by any customer's page.

---

## Auth - `auth.ts`

Google OAuth is the real sign-in path. A `Credentials` provider exists **only** as a local and e2e
escape hatch, behind `credentialsLoginAllowed()` in `lib/auth-policy.ts`: it needs both
`NODE_ENV !== 'production'` **and** an explicit `ALLOW_CREDENTIALS_LOGIN=1`. `NODE_ENV` alone was
never a deploy boundary - the e2e server and any staging container run as `development` while still
being reachable. The sign-in page reads the same predicate, so the form is never offered when it
cannot work. `e2e/auth.setup.ts` depends on it, and `playwright.config.ts` sets the flag for itself.

Credentials are compared through `secretsMatch()` (`lib/secure-compare.ts`), which hashes both sides
and uses `timingSafeEqual`; the cron route's `CRON_SECRET` check uses the same helper. Sign-in
attempts are rate limited per IP.

The `signIn` callback refuses an OAuth profile with `email_verified === false`: user rows are keyed
on email, so an unverified assertion would otherwise land on someone else's account. Sessions are
JWTs with `SESSION_MAX_AGE_SECONDS` - they cannot be revoked server-side, so lifetime is the only
bound on a stolen token.

`/admin` is gated in `app/(app)/admin/layout.tsx` via `isAdmin()`, so a page added under that segment
is operator-only by default. `/admin/leads` repeats the check, because the waitlist rows it shows are
third-party PII. Middleware only guarantees *a* session, not the operator's.

---

## Internationalization - `lib/i18n/`

Server-side, cookie-driven, no route segment. `getLocale()` reads the `LOCALE_COOKIE` and falls back
to `DEFAULT_LOCALE`; `dictionaryFor(locale)` returns the matching dictionary from
`lib/i18n/dictionaries` (`en`, `pt-BR` - the `LOCALE` enum). Server components call `getDictionary()`
directly; client components read the dictionary passed down by `components/i18n-provider.tsx` via
`useI18n()`. `t()` handles interpolation and plurals, and `formatDate` / `formatNumber` /
`formatDecimal` wrap `Intl` so locale formatting never happens ad hoc.

The `setLocale` server action in `lib/actions/locale.ts` writes the cookie and calls
`revalidatePath('/', 'layout')`. Every user-facing string belongs in a dictionary, never inline.
