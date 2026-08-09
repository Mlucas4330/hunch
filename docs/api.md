# API routes

Every `/api` route authenticates itself via `getCurrentUser()`. The middleware matcher is a
performance detail, not the security boundary — see [security.md](security.md).

| Route | Auth | Notes |
| ----- | ---- | ----- |
| `GET\|POST /api/auth/[...nextauth]` | — | NextAuth catch-all |
| `POST /api/analyses` | session | the core pipeline |
| `GET /api/analyses` | session | history, free capped at 3 |
| `GET /api/analyses/[id]` | session + ownership | |
| `POST /api/analyses/[id]/measure` | session + ownership | backfills the readout |
| `PATCH /api/hypotheses/[id]` | session + ownership | `status` only |
| `GET\|POST /api/hypotheses/[id]/variants` | session + ownership | the two alternates |
| `GET /api/usage` | session | |
| `POST /api/billing/webhook` | Stripe signature | grants the plan |
| experiments + tracking | see [experiments.md](experiments.md) | |
| `POST /api/report/screenshot`, `POST /api/waitlist` | embed key / open | see [report.md](report.md) |
| `GET /api/cron/*` | `CRON_SECRET` | see [experiments.md](experiments.md) |
| `GET /api/health` | — | Railway's deploy probe, imports nothing — see [deployment.md](deployment.md#healthcheck) |

## Analyses

### `POST /api/analyses`

Chain: usage gate -> Puppeteer scrape -> preprocess HTML -> detect market -> competitor research +
robots.txt in parallel -> Claude (hypotheses + playbook + visibility audit in parallel) -> persist.

```json
{ "url": "https://example.com", "brief": "optional business details", "competitorUrls": ["https://rival.com"] }
```

`brief` (optional, all plans) is stored on the analysis and passed into generation so variants come
back as finished copy instead of `[placeholders]`.

`competitorUrls` (optional, max 3) is the paid **Competitor mode**, honored only when
`user.plan !== 'free'` — a free user's URLs are dropped server-side and it auto-searches instead. When
provided, `analyzeLandingPage` scrapes those pages for the competitive brief instead of running a web
search, and `analyses.competitors` is set to them.

```json
{
  "analysis": {
    "id": "uuid",
    "url": "https://example.com",
    "created_at": "timestamp",
    "hypotheses": [ "...HypothesisRow[]" ],
    "flowFixes": [ "...FlowFixRow[]" ]
  }
}
```

`flowFixes` holds both kinds, `flow` first then `visibility`, each ranked by impact with `position`
counted from 0 within its own kind. **Either family can be empty** — the playbook when its generation
failed, the visibility audit for that reason or because the page genuinely has nothing left to fix.
Both are additions to the analysis, never preconditions for it, and they ride the same
`persist_failed` catch as everything else in the transaction.

`analyses.market` is written from `output.market`. **Nothing changes in `BodySchema`**: the market is
measured from the page, not supplied by the client, exactly like `goalCandidates` and `researchBrief`.

Errors: `403` free tier limit reached · `422` invalid or unsupported URL (including one resolving to a
private address) · `429` rate limited · `502` scrape failed · `500` Claude or DB failure.

### `GET /api/analyses`

History. Free users: last 3. Paid: paginated via `?page=1&limit=10`. Reads through
`listAnalysesForUser` — see [data-model.md](data-model.md).

```json
{ "analyses": [ "...AnalysisRow[]" ], "total": 12, "page": 1 }
```

### `GET /api/analyses/[id]`

One analysis with all hypotheses. `404` if not found **or not owned**.

### `POST /api/analyses/[id]/measure`

Fills `structure` / `seo` / `performance` on an analysis generated **before those columns existed**,
so its report stops rendering no readout at all. Runs `measurePage` (`lib/analyze.ts`) — a scrape and
nothing else. No model call, no new rows, no re-ranking; `locale` and `market` stay pinned to what the
hypotheses were written for. Response: `{ measured: true }`.

**Idempotent**: an analysis that already carries `structure` is returned untouched, so a double click
or a reload never buys a second browser.

Errors mirror `POST /api/analyses` because the failures are the same: `422 invalid_url` (a stored URL
that now resolves privately), `502 scrape_failed`, `500 measure_failed`, plus `404` for an unknown or
unowned id and `429` from the `measure` rate limit.

Two things it deliberately does **not** do:

- **It does not touch `competitor_structures`.** Outside paid Competitor mode nobody ever opened those
  pages — see
  [invariants.md](invariants.md#a-comparison-exists-only-where-the-competitor-page-was-actually-opened).
  A backfilled analysis renders the findings grid and no comparison, exactly like a real auto-search
  analysis.
- **It does not spend the monthly allowance**, and it is its own `RATE_LIMIT_KIND` rather than reusing
  `analysis` for that reason: it completes an analysis the user already paid for and buys no
  generation. The rate limit alone is the gate.

## Hypotheses

### `PATCH /api/hypotheses/[id]`

`{ "status": "testing" }`. Validates against `HYPOTHESIS_STATUS`. Returns the updated row.

### `POST /api/hypotheses/[id]/variants`

Writes the two alternate challengers the analysis deliberately skipped. Ownership via
`hypotheses -> analyses`.

**Idempotent**: a hypothesis that already has `VARIANTS_PER_HYPOTHESIS` (3) variants is returned
unchanged, so a reload or a double fetch never appends duplicates. Otherwise it runs one small
`generateObject` over `AlternateVariantsSchema`, seeded with the hypothesis plus the analysis's stored
`research_brief` and `brief` — **no second web search** — and inserts the results at positions 1 and 2.

`locale` **and `market`** are read from the stored analysis rather than re-derived, per
[invariants.md](invariants.md#generated-content-is-pinned-to-the-locale-it-was-written-in).

Response: `{ variants: VariantRow[] }`, all three, ordered by position.

### `GET /api/hypotheses/[id]/variants`

The hypothesis's variants ordered by position, generating nothing.

## Usage and plan capability

### `GET /api/usage`

```json
{ "analyses_count": 2, "limit": 3, "plan": "free" }
```

The free allowance is monthly and rolls **lazily** in `lib/usage.ts` rather than on a schedule. Every
read and every write asks whether `users.usage_period_start` is still the current window; once it has
lapsed the count reads as 0 and the next analysis restarts the window. **No cron is involved**, so a
missed job can never leave a user permanently capped.

```typescript
if (hasReachedFreeLimit(user)) {
    return Response.json({ error: 'limit_reached' }, { status: 403 })
}
```

Beside it live the two named capability checks, so neither is written as `plan !== 'free'` at each
call site:

- **`canExport(plan)`** — export is a paid-plan capability.
- **`canWhiteLabel(plan)`** — decides whether a report renders as the owner's deliverable or as our
  lead magnet. Two surfaces answer to it; see
  [invariants.md](invariants.md#white-label-hangs-off-one-boolean-on-four-independent-surfaces).

`loadReport` (`lib/report.ts`) carries the owner's plan to the unauthenticated public report, and it
selects **`user: { columns: { plan: true } }`** rather than `user: true`. That is a boundary, not an
optimization: everything a server component reads reaches the RSC payload, so the whole `users` row
would publish the owner's email and `stripe_customer_id` inside the report they sent to their own
client. `reportIsWhiteLabelled()` beside it is the one derivation, so the page, its metadata and its
OG card cannot disagree — `loadReport` is `cache()`d, so all three cost one query.

## Billing

**The buyer never touches a billing screen here.** The sale is closed on a call and the seller sends a
Stripe payment link — see
[invariants.md](invariants.md#there-is-no-self-serve-checkout-and-no-published-price). What is left is
everything that *grants* the plan: the `plan` column, `canWhiteLabel` / `canExport`, and the one route
below.

`checkout` and `portal` were deleted along with `lib/stripe-client.ts`, the `@stripe/*-js` packages and
the Stripe entries in the CSP. Nothing had called any of it since `/billing` went away, and a dormant
authenticated route that mints a subscription is a liability, not an option kept open. Reopening the
shop window later means writing the route back, not flipping a flag.

### `POST /api/billing/webhook`

**Must be excluded from NextAuth middleware.** Verify the signature with
`stripe.webhooks.constructEvent` against the **raw** body before processing.

| Event | Effect |
| ----- | ------ |
| `checkout.session.completed` | create `subscriptions` row, update `users.plan` |
| `customer.subscription.updated` | update `subscriptions.status` and `plan` |
| `customer.subscription.deleted` | set `plan` back to `free`, mark subscription `canceled` |

**Idempotency and ordering are two separate guards.** Every event is claimed into `stripe_events`
(PK = `event.id`, `onConflictDoNothing`) *before* any work; a delivery that claims nothing returns
`200` untouched, so Stripe's retries are no-ops. Ordering is guarded separately, because idempotency
does not cover it: an `updated` whose `event.created` predates that subscription's recorded `deleted`
is skipped rather than re-granting the plan the cancellation revoked.

**Entitlement is never granted from metadata alone.** `metadata.plan` is writable from the Stripe
dashboard, so it is accepted only when it is a real `SUBSCRIPTION_PLAN` value and otherwise falls
through to the price id — which is why the payment link must charge `STRIPE_PRICE_ID`.

**The user is resolved in three steps, and the payment link is the reason there are three.** A link
carries no `userId`, so the first two ways of identifying the buyer are empty on a first purchase:

1. `users.stripe_customer_id` matching the subscription's customer — the only hit on every event
   *after* the first, which is why step 3 writes it
2. `metadata.userId`, accepted only when it parses as a uuid **and** resolves to a real row. Reachable
   from the Stripe dashboard, and a non-uuid value there would otherwise crash the route on a `uuid`
   column
3. the Stripe customer's email against `users.email`, case-insensitively

Step 3 is the one that promotes a payment-link sale, and it is why `syncSubscription` writes
`users.stripe_customer_id` on every sync: `customer.subscription.updated` and `.deleted` carry no
email, so without the backfill a renewal or a cancellation could not find the account the purchase
already promoted.

**A buyer who pays from an email that is not their login email is not resolved**, and nothing about
that is visible in the app — the route logs `no user for subscription` and returns `200`. Confirm the
promotion after a sale rather than assuming it; the fix is to set the payment's email to the account's,
or to write `users.stripe_customer_id` by hand.

`lib/stripe.ts` pins `apiVersion` — the webhook reads `item.current_period_end`, whose shape has moved
between versions, so following the account default turns an SDK upgrade into silent breakage.
