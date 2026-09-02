# API routes

Every `/api` route authenticates itself via `getCurrentUser()`. The middleware matcher is a
performance detail, not the security boundary — see [security.md](security.md).

| Route | Auth | Notes |
| ----- | ---- | ----- |
| `GET\|POST /api/auth/[...nextauth]` | — | NextAuth catch-all |
| `POST /api/analyses` | **session optional** | queues the pipeline; anything unpaid gets the measured half only; takes an optional `competitorUrl` |
| `GET /api/analyses` | session, or embed key for `?embedKey=` | history, or one analysis' progress |
| `GET /api/analyses/[id]` | session + ownership | |
| `POST /api/analyses/[id]/measure` | session + ownership | measures the page again, appending a snapshot |
| `POST /api/analyses/[id]/ads` | session + ownership | writes ad groups off the terms counted on the page |
| `GET\|POST /api/hypotheses/[id]/variants` | session + ownership | the two alternates, on demand from the analysis screen |
| `POST /api/billing/checkout` | session | opens a Checkout Session for a credit pack |
| `POST /api/billing/webhook` | Stripe signature | grants credits for a paid session |
| `POST /api/billing/mercadopago` | session | creates the payment the Payment Brick collected |
| `POST /api/billing/mercadopago/webhook` | Mercado Pago signature | grants credits for an approved payment |
| `POST /api/analyses/claim` | session | hands anonymous analyses to the account that just signed in |
| `POST /api/leads` | — | takes an address and emails the report's link back; gates nothing |
| `POST\|GET /api/report/screenshot` | embed key | queues a preview and reports on it — see [report.md](report.md) |
| `GET /api/pulse` | — | the landing page's ranked board and live feed, domain and score only |
| `GET /api/cron/prune-screenshots` | `CRON_SECRET` | see [deployment.md](deployment.md) |
| `GET /api/health` | — | Railway's deploy probe, imports nothing — see [deployment.md](deployment.md#healthcheck) |

**Routes that were removed with the agency framing:** `GET /api/usage` (no plans, no allowance),
`POST /api/brand` (no white-label), `POST /api/waitlist` (no lead capture) and
`POST /api/report/view` (no open tracking).

**Routes removed with the monitoring subscription:** `POST|DELETE /api/billing/mercadopago/subscribe`
and `GET /api/cron/remeasure`. The sweep has now been added and removed twice for the same reason
both times — a scheduled re-measure is browser time nobody asked for unless something pays for it,
and what paid for it sold a weekly report on pages that do not change weekly. **Re-measuring is the
owner's click**, at `POST /api/analyses/[id]/measure`. See [product.md](product.md).

## Analyses

### `POST /api/analyses`

Chain: rate limit -> guard both URLs -> (Puppeteer scrape ‖ robots.txt) -> detect market ->
**persist the measurement** -> compose page text -> (competitor scrape ‖ Claude: hypotheses +
playbook + visibility audit, in parallel) -> persist the generation.

**The two writes are two writes, and that is the point.** `runAnalysis` used to call one function
that scraped and generated and committed everything in a single transaction at the end, so
`analyses.structure` stayed null for the whole run. `analysisProgress` therefore reported `measured`
and `generated` turning true at the same instant for an owned analysis, and **the person who had paid
waited minutes for the score that the anonymous visitor got in twenty seconds** — against the rule
that [the readout is never gated](invariants.md#the-free-half-is-what-code-counted-the-paid-half-is-what-a-model-wrote).

`measurePage` now runs for every analysis, its result is committed with the `page_snapshots` row, and
only then does an owned run continue into `generateFromMeasurement`. Three consequences:

- **The client navigates on `measured`.** `waitForAnalysis` no longer waits for `generated`, so the
  reader reaches `/r/<embedKey>` with their score while the fixes are still being written. See
  [report.md](report.md) for the five states that render there.
- **A generation failure is survivable, and rarer than it was.** The credit comes back when
  **nothing** was generated — not when one of the three calls fell short. A short set of copy
  hypotheses now ships alongside the flow and visibility fixes instead of taking them down with it;
  see [ai-pipeline.md](ai-pipeline.md). When the refund does happen the readout is already committed,
  so it is "you have your score and your credit is back" rather than three minutes of spinner ending
  in an error screen. It is also *visible*: `credit_transactions` carries a `refund` against the
  analysis, and that is what the report reads to show what happened instead of the unlock wall.
- **The measurement write is skipped when the row already has one.** A requeued job re-measures (it
  needs the page in memory to generate), and inserting a second `page_snapshots` row would put a
  bogus entry in the history the trend subtracts across. The columns keep the first measurement so
  the stored readout and the newest snapshot stay the same measurement.

The competitor scrape moved into the generation half deliberately: only a prompt ever reads it, and
measuring it first would hold the reader's own score behind a second browser slot for a page that is
not theirs.

```json
{
  "url": "https://example.com",
  "brief": "optional business details",
  "competitorUrl": "https://optional-second-page.com"
}
```

`brief` (optional) is stored on the analysis and passed into generation so variants come back as
finished copy instead of `[placeholders]`.

`competitorUrl` (optional) is a page the caller names and nothing infers. It is measured by the same
code, shown as a second column in the readout, and handed to the prompts — the one case where a
generated `evidence` may carry a number, bounded in
[invariants.md](invariants.md#a-generated-evidence-carries-a-number-only-from-a-page-this-code-measured).

Two things about it are load bearing:

- **It goes through `assertPublicUrl` exactly like `url` does**, before anything is written. A
  competitor field that skipped the guard would be a second front door onto the same SSRF: it is a URL
  this deploy points a real browser at. See [security.md](security.md).
- **Only the owned branch measures it.** An ownerless run is what makes an anonymous analysis cost one
  browser slot and zero tokens, and a second page would double the slot half of that for traffic where
  most visitors never convert. It costs no extra credit — one analysis, one credit, two pages measured.

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

### `GET /api/analyses?embedKey=`

Progress for one analysis, readable by whoever holds the key — the anonymous caller who started it has
nothing else to identify themselves with. It answers `id`, `owned`, `measured`, `generated` and
`state`.

**`state` is what a caller should switch on**, and it is why the poll can stop. The booleans say what
has landed and never why nothing more is coming, so a client watching them could not tell a generation
still running from one that threw an hour ago — it just kept asking. It comes from `analysisStateFor`,
the same helper the report renders from, so the screen and the poll cannot disagree about a row. The
values are `ANALYSIS_STATE`: `measuring`, `generating`, `failed`, `ready`, `locked`. See
[report.md](report.md).

Three columns and one hypothesis, no session: cheap enough to poll at `JOB_POLL_INTERVAL_MS`, which is
what `components/generating-sections.tsx` does instead of re-rendering the whole report route.

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

### `POST /api/analyses/[id]/ads`

Ad groups written off `analyses.keywords` by `generateAdIdeas` (`lib/analyze.ts`), stored on
`analyses.ad_ideas` and returned as `{ adIdeas }`. See
[ai-pipeline.md](ai-pipeline.md) for the prompt and [analysis-ui.md](analysis-ui.md) for the section
that renders it.

- **Owner only, and it spends no credit.** The analysis was already paid for. Charging again here
  would put a second source of truth beside the ledger about what a purchase entitles someone to,
  which is the shape
  [invariants.md](invariants.md#credits-are-granted-by-one-internal-path-and-no-provider-code-touches-the-tables)
  exists to prevent. What bounds the cost is the `ad_ideas` rate limit (10/hour), the ownership
  check, and the column: once written, the answer is read back rather than generated again.
- **Its own `RATE_LIMIT_KIND` rather than reusing `variants`.** A retry after a failed generation
  must not eat the allowance for rewriting copy, which is the thing the reader actually paid for.
- **Idempotent by column.** A row that already has `ad_ideas` returns it without calling a model, so a
  second press costs one query.
- **`422 nothing_measured` when the page has no counted terms.** The whole claim the section makes is
  that these words came off the reader's own page; with no terms there is nothing to ground it in,
  and a model asked anyway would invent the keywords a keyword tool would have sold them.
- `locale` comes from the **stored** `analyses.locale`, never the reader's current one — see
  [invariants.md](invariants.md#generated-content-is-pinned-to-the-locale-it-was-written-in).

Errors: `401` with no session, `404` for an unknown or unowned id, `422 nothing_measured`,
`500 generation_failed`, `429` from the rate limit.

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

## Leads

### `POST /api/leads`

`{ email, embedKey }`. Answers `202` on success, `422` on a malformed body, `404` on an embed key no
analysis carries, `429` past the `lead` budget.

**It gates nothing, and it must never start to.** [invariants.md](invariants.md) puts the readout
outside every wall on every surface, and an email wall in front of a measurement of the reader's own
page reads as a trick — an earlier one did exactly that and was removed for it. This asks below the
numbers, once, and takes no for an answer.

**What makes the offer honest is what it delivers.** An `embed_key` is an unguessable uuid held in
one browser's `localStorage` and nowhere else, so a cleared history really does lose the report for
good. The email is the only durable copy of that link an anonymous reader can have — the address buys
them something rather than buying us something.

Three rules hold it:

- **A lead is not a user.** The route never touches `users`, cannot grant, spend or claim anything,
  and the address lands in its own table. `users` is keyed on email and whoever presents that address
  next owns the row and its credits, which is why only a provider-verified address may create one —
  see [security.md](security.md). Nobody verified this one; it is a string a stranger typed.
- **The locale is the analysis's, not the request's.** What gets written to this person is written in
  the language they were reading, under the same rule as `analyses.locale`.
- **It is its own rate-limit kind.** Correcting a typo in an address must not spend the `analysis`
  allowance the same IP is about to need.

Sending is fail-soft (`lib/email.ts`): the row is written first, and a provider outage or a deploy
with no `RESEND_API_KEY` costs the message, never the lead.

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

It also copies the `GCLID_COOKIE` onto the buyer's row, and **this is the only route that reads that
cookie.** It happens here because this is the first moment both halves exist at once: the cookie was
written by middleware before the visitor had an account, and the webhook that reports the sale runs
with no cookies at all. It is not part of taking the payment and cannot fail one. See
[ads.md](ads.md).

### `POST /api/billing/mercadopago/webhook`

Verifies `x-signature` against `MERCADOPAGO_WEBHOOK_SECRET` (see
[security.md](security.md#mercado-pago-webhook-signature)) and refuses anything unproven with `400`.
It handles the `payment` topic, which credits a pack, and acknowledges everything else unread.

The claim is keyed `<payment id>:<topic>`, because a Pix payment notifies once pending and again once
approved and collapsing those two would throw away the delivery carrying the money. It then **reads
the payment back from the provider's API** — the notification body is an unsigned claim that something
happened to an id — and grants only when the status is `approved` and the amount matches a pack.

On an exception it releases the claim before answering `500`, so the retry can redo the work: a claim
that survives a failure turns every retry into a no-op and loses a paid credit.

It passes the **amount the provider confirmed** to `grantCredits`, which is what reports the sale to
Google Ads. The reporting is not in this route and must not move here: every path that grants ends at
`grantCredits`, and it is the ledger's own idempotency that stops a re-delivered webhook reporting one
payment twice. See [ads.md](ads.md).
