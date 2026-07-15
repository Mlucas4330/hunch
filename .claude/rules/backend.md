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
- id          (uuid, PK)
- user_id     (FK -> users.id)
- url         (text)
- brief       (text, nullable: optional business details the founder supplied for finished copy)
- competitors (jsonb, nullable: { name, url }[] benchmarked against)
- embed_key   (uuid, unique: public opaque key the snippet uses; never expose analyses.id)
- created_at  (timestamp)

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
- status         (enum: HYPOTHESIS_STATUS, default: pending)
- created_at     (timestamp)

variants
- id             (uuid, PK)
- hypothesis_id  (FK -> hypotheses.id)
- copy           (text)
- evidence       (text, nullable: competitor pattern this variant borrows/beats)
- position       (int: AI rank within the hypothesis; position 0 = recommended challenger)
- status         (enum: VARIANT_STATUS, default: proposed)
- created_at     (timestamp)

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
```

**Relations**

```
users       1 -> N  analyses
analyses    1 -> N  hypotheses
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
-> Claude API -> persist -> return.

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
    "hypotheses": [ ...HypothesisRow[] ]
  }
}
```

Errors:

- `403` - free tier limit reached
- `422` - invalid or unsupported URL
- `502` - Puppeteer scrape failed
- `500` - Claude API or DB failure

**Usage gate logic:**

```typescript
if (user.plan === 'free' && user.analyses_count >= 3) {
    return Response.json({ error: 'limit_reached' }, { status: 403 })
}
```

`GET /api/analyses`
Returns analysis history. Free users: last 3. Paid: paginated.

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
Body `{ key, experimentId, arm, type }` (`arm` in `EXPERIMENT_ARM`, `type` in `TRACK_EVENT`),
sent via `navigator.sendBeacon` as a `text/plain` blob (stays a CORS simple request).
Verifies the experiment belongs to `key` and is `running`, then increments the matching
`experiment_stats` counter. Returns `204`.

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

Verify signature with `stripe.webhooks.constructEvent` before processing.

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
    section: z.enum(SECTIONS),
    problem: z.string(),
    current_copy: z.string(),
    variants: z.array(VariantSchema).length(3),
    impact_score: z.number().int().min(1).max(10),
    effort_score: z.number().int().min(1).max(10),
    rationale: z.string()
})

const CompetitorSchema = z.object({ name: z.string(), url: z.string() })

const AnalysisOutputSchema = z.object({
    competitors: z.array(CompetitorSchema).max(4),
    hypotheses: z.array(HypothesisSchema).min(5).max(8)
})
```

### 2b. Competitor research (web search)

Before structured generation, run a web-search step with the official Anthropic SDK
(`@anthropic-ai/sdk`, tool `web_search_20250305`) using `COMPETITOR_RESEARCH_PROMPT` to find 2-3
real competitor landing pages and summarize their positioning into a brief. The brief is passed
into `generateObject` so variants are grounded in competitors, and each variant carries an
`evidence` line naming the competitor pattern it borrows. Degrades gracefully to an empty brief
(no `ANTHROPIC_API_KEY` / failure) so generation still succeeds. Skipped when `E2E_FIXTURES=1`.

When the user supplies `competitorUrls` (paid Competitor mode), this web-search step is skipped:
`analyzeLandingPage` scrapes those pages and concatenates the cleaned copy into the brief instead.
A founder `brief` (when present) is appended to the generation prompt so variants use those real
facts and come back finished rather than as `[placeholder]` templates.

### 3. Call

```typescript
const result = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    schema: AnalysisOutputSchema,
    system: SYSTEM_PROMPT,
    prompt: `Landing page copy:\n\n${cleanedPageContent}\n\nCompetitive research brief:\n\n${brief}`
})

const { competitors, hypotheses } = result.object
```

### 4. System prompt (core IP - iterate carefully)

Focus on: grounding every hypothesis/variant in the competitor brief, specificity of claims, CTA
strength, social proof quality, value proposition clarity, friction reduction. Return 5-8
hypotheses ranked by impact score descending, each with 3 evidence-bearing variants **ordered
strongest-first** so `variants[0]` is the recommended challenger (there is no manual variant-picking
circuit; the UI proposes `variants[0]` and the user approves/swaps before launching a test).

---

## Middleware - `middleware.ts`

Protect all `/dashboard`, `/analyses`, and `/billing` routes with NextAuth session check.
Exclude `/api/billing/webhook` from auth middleware - Stripe calls it directly.
Exclude `/api/track` and `/embed.js` too - the snippet on the customer's site calls them
cross-origin without a session.
