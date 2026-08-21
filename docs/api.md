# API routes

Every `/api` route authenticates itself via `getCurrentUser()`. The middleware matcher is a
performance detail, not the security boundary — see [security.md](security.md).

| Route | Auth | Notes |
| ----- | ---- | ----- |
| `GET\|POST /api/auth/[...nextauth]` | — | NextAuth catch-all |
| `POST /api/analyses` | **session optional** | queues the pipeline; anything unpaid gets the measured half only |
| `GET /api/analyses` | session, or embed key for `?embedKey=` | history, or one analysis' progress |
| `GET /api/analyses/[id]` | session + ownership | |
| `POST /api/analyses/[id]/measure` | session + ownership | measures the page again, appending a snapshot |
| `GET\|POST /api/hypotheses/[id]/variants` | session + ownership | the two alternates, on demand from the analysis screen |
| `POST /api/billing/checkout` | session | opens a Checkout Session for a credit pack |
| `POST /api/billing/webhook` | Stripe signature | grants credits for a paid session |
| `POST /api/billing/mercadopago` | session | creates the payment the Payment Brick collected |
| `POST /api/billing/mercadopago/webhook` | Mercado Pago signature | grants credits for an approved payment |
| `POST /api/analyses/claim` | session | hands anonymous analyses to the account that just signed in |
| `POST\|GET /api/report/screenshot` | embed key | queues a preview and reports on it — see [report.md](report.md) |
| `GET /api/pulse` | — | the landing page's ranked board and live feed, domain and score only |
| `GET /api/cron/prune-screenshots` | `CRON_SECRET` | see [deployment.md](deployment.md) |
| `GET /api/health` | — | Railway's deploy probe, imports nothing — see [deployment.md](deployment.md#healthcheck) |

**Routes that were removed with the agency framing:** `GET /api/usage` (no plans, no allowance),
`POST /api/brand` (no white-label), `POST /api/waitlist` (no lead capture),
`POST /api/report/view` (no open tracking) and `GET /api/cron/remeasure` (it swept paid plans, and
without plans a sweep is browser time nobody asked for — re-measuring is the owner's click).

## Analyses

### `POST /api/analyses`

Chain: rate limit -> Puppeteer scrape -> preprocess HTML -> detect market -> robots.txt -> Claude
(hypotheses + playbook + visibility audit in parallel) -> persist.

```json
{ "url": "https://example.com", "brief": "optional business details" }
```

`brief` (optional) is stored on the analysis and passed into generation so variants come back as
finished copy instead of `[placeholders]`.

**There is no `no_credits` refusal.** A signed in caller with an empty balance is answered `202` like
everyone else, with `owned: false` and an ownerless analysis behind it: the measured half only, zero
model tokens, and the unlock wall on the report. The route used to delete the row and answer `402`,
which made holding a session strictly worse than not having one — the same person got a free readout
signed out and nothing signed in.

The order matters and is not obvious from reading it: the row is inserted **ownerless whoever is
signed in**, because `spendCredit` writes a ledger row naming the analysis it paid for and cannot do
that before one exists. `user_id` is then written only if a credit was actually taken, and always
before the job is queued, since `runAnalysis` reads that column to decide whether to call a model. So
"spend before the work" still holds: nothing has been enqueued at that point.

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
measured from the page, not supplied by the client, exactly like `structure`.

Errors: `422` invalid or unsupported URL (including one resolving to a private address) · `429` rate
limited · `502` scrape failed · `500` Claude or DB failure.

### `GET /api/analyses`

History, paginated via `?page=1&limit=10`. Reads through
`listAnalysesForUser` — see [data-model.md](data-model.md).

```json
{ "analyses": [ "...AnalysisRow[]" ], "total": 12, "page": 1, "pages": 2 }
```

`page` is what was **served**, not what was asked for: a number past the end is clamped to the last
page rather than answered with an empty list, and anything that is not a positive integer reads as
page one. Both callers go through `parsePaging`, so the dashboard and this route cannot disagree —
see [analysis-ui.md](analysis-ui.md#paging).

### `GET /api/analyses/[id]`

One analysis with all hypotheses. `404` if not found **or not owned**.

### `POST /api/analyses/[id]/measure`

Fills `structure` / `seo` / `performance` / `crawler_access` on an analysis generated **before those
columns existed**, so its report stops rendering no readout at all. Runs `measurePage`
(`lib/analyze.ts`) — a scrape plus the robots.txt fetch, and nothing else. No model call, no new rows,
no re-ranking; `locale` and `market` stay pinned to what the hypotheses were written for. Response:
`{ measured: true }`.

**It is a re-measure, not a backfill, and is deliberately not idempotent.** It rewrites the columns and
appends a `page_snapshots` row in one transaction, which is what a trend is made of. The `measure` rate
limit (10/hour) is what holds the browser cost — an idempotency guard would have blocked the second
measurement, which is the only one worth having.

Errors mirror `POST /api/analyses` because the failures are the same: `422 invalid_url` (a stored URL
that now resolves privately), `502 scrape_failed`, `500 measure_failed`, plus `404` for an unknown or
unowned id and `429` from the `measure` rate limit.

One thing it deliberately does **not** do:

- **It is its own `RATE_LIMIT_KIND` rather than reusing `analysis`**: it buys no generation, only
  browser time. The rate limit alone is the gate.

## Hypotheses

### `PATCH /api/hypotheses/[id]`

`{ "status": "testing" }`. Validates against `HYPOTHESIS_STATUS`. Returns the updated row.

### `POST /api/hypotheses/[id]/variants`

Writes the two alternate challengers the analysis deliberately skipped. Ownership via
`hypotheses -> analyses`.

**Idempotent**: a hypothesis that already has `VARIANTS_PER_HYPOTHESIS` (3) variants is returned
unchanged, so a reload or a double fetch never appends duplicates. Otherwise it runs one small
`generateObject` over `AlternateVariantsSchema`, seeded with the hypothesis plus the analysis's stored
`brief` and inserts the results at positions 1 and 2.

`locale` **and `market`** are read from the stored analysis rather than re-derived, per
[invariants.md](invariants.md#generated-content-is-pinned-to-the-locale-it-was-written-in).

Response: `{ variants: VariantRow[] }`, all three, ordered by position.

### `GET /api/hypotheses/[id]/variants`

The hypothesis's variants ordered by position, generating nothing.

## Pulse

### `GET /api/pulse`

What the landing page polls. Answers `{ leaderboard, pulse }` from `publicLeaderboard()` and
`analysisPulse()` in `lib/analyses.ts`, both wrapped in `unstable_cache` for `PULSE_CACHE_SECONDS`.

A leaderboard entry is `{ domain, score }`; a feed entry is `{ domain, state, score, at }`, where
`state` is `running` for a row with no measurement yet and `done` for one with a score. **The route
may never widen either shape** — see
[invariants.md](invariants.md#the-public-board-carries-a-domain-and-a-score-and-nothing-else).

**Fails open**, like everything except `POST /api/analyses`: a poll costs one cached read and opens no
browser, so Redis being down here is a landing page without ambience rather than an unmetered bill —
which is the only thing that earns `failClosed`. See
[invariants.md](invariants.md#rate-limiting-fails-open-except-where-failing-open-is-the-bill). It
spends the `job_status` budget for the reason that kind exists: cheap polling must not spend an
allowance sized for work.

A query that throws answers `200` with two empty arrays. The caller is a decoration on a marketing
page; there is nothing for it to report and nothing for it to retry.

## Billing

Two providers sell the same three credit packs, and **neither of them touches a credit table**. Each
verifies a payment, works out what it bought, and calls `grantCredits` — see
[invariants.md](invariants.md#credits-are-granted-by-one-internal-path-and-no-provider-code-touches-the-tables).

Mercado Pago is the one that can charge in BRL against a CPF, so it is what sells today; Stripe stays
wired for when there is a company behind it. `mercadoPagoEnabled()` decides which checkout the packs
open, and the decision is made on the server.

Both webhooks **must be excluded from NextAuth middleware**, and both claim their delivery into
`payment_events` before doing any work.

### `POST /api/billing/checkout`

Session required. Opens a Stripe Checkout Session for one pack, with `customer_email` pinned to the
signed-in account — **the email is never taken from the body**, or anyone could buy credits into
someone else's account. A pack whose price id is unset answers `503` rather than selling nothing.

### `POST /api/billing/webhook`

Verifies the signature with `stripe.webhooks.constructEvent` against the **raw** body, claims the
event into `payment_events` (`provider = 'stripe'`, `event_id = event.id`, `onConflictDoNothing`), and
for a `checkout.session.completed` whose `payment_status` is `paid` sums the line items through
`creditsForPrice` and grants. The price id is the only input trusted: metadata is dashboard-editable.

### `POST /api/billing/mercadopago`

Session required, rate limited on the `billing` kind. Takes `{ pack, payment }` where `payment` is
whatever the Payment Brick collected, and creates the payment with three fields the server decides
rather than the browser:

- `transaction_amount` from `CREDIT_PACKS.amountBrl` — **the Brick submits an amount and it may not be
  believed**
- `external_reference` from the session's user id, which is how the webhook knows whom to credit;
  Mercado Pago's `payer.email` is the buyer's account address and is frequently a different one
- `notification_url`, so the delivery arrives where the signature is checked

It answers the payment's status plus the Pix QR when there is one, and **grants nothing** — a card
approved in this response is still credited by the webhook, so there is one path that moves a balance
instead of two that have to agree.

### `POST /api/billing/mercadopago/webhook`

Verifies `x-signature` against `MERCADOPAGO_WEBHOOK_SECRET` (see
[security.md](security.md#mercado-pago-webhook-signature)) and refuses anything unproven with `400`.
Notifications outside the `payment` topic are acknowledged and ignored.

The claim is keyed `<payment id>:<topic>`, because a Pix payment notifies once pending and again once
approved and collapsing those two would throw away the delivery carrying the money. It then **reads
the payment back from the provider's API** — the notification body is an unsigned claim that something
happened to an id — and grants only when the status is `approved` and the amount matches a pack.

On an exception it releases the claim before answering `500`, so the retry can redo the work: a claim
that survives a failure turns every retry into a no-op and loses a paid credit.
