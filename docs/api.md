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
| `GET\|POST /api/hypotheses/[id]/variants` | session + ownership | the two alternates, on demand from the analysis screen |
| `POST /api/billing/checkout` | session | opens a Checkout Session for a credit pack |
| `POST /api/billing/webhook` | Stripe signature | grants credits for a paid session |
| `POST /api/billing/mercadopago` | session | creates the payment the Payment Brick collected |
| `POST /api/billing/mercadopago/webhook` | Mercado Pago signature | grants credits for an approved payment, and records subscription state |
| `POST /api/billing/mercadopago/subscribe` | session | opens the monitoring preapproval; entitles nothing until the webhook confirms it |
| `DELETE /api/billing/mercadopago/subscribe` | session | cancels the caller's own subscription; takes no id |
| `POST /api/analyses/claim` | session | hands anonymous analyses to the account that just signed in |
| `POST /api/leads` | — | takes an address and emails the report's link back; gates nothing |
| `POST\|GET /api/report/screenshot` | embed key | queues a preview and reports on it — see [report.md](report.md) |
| `GET /api/pulse` | — | the landing page's ranked board and live feed, domain and score only |
| `GET /api/cron/prune-screenshots` | `CRON_SECRET` | see [deployment.md](deployment.md) |
| `GET /api/cron/remeasure` | `CRON_SECRET` | the weekly sweep; queues a re-measure per subscribed page |
| `GET /api/health` | — | Railway's deploy probe, imports nothing — see [deployment.md](deployment.md#healthcheck) |

**Routes that were removed with the agency framing:** `GET /api/usage` (no plans, no allowance),
`POST /api/brand` (no white-label), `POST /api/waitlist` (no lead capture),
`POST /api/report/view` (no open tracking) and `GET /api/cron/remeasure` (it swept paid plans, and
without plans a sweep is browser time nobody asked for — re-measuring is the owner's click).

## Analyses

### `POST /api/analyses`

Chain: rate limit -> guard both URLs -> (Puppeteer scrape ‖ robots.txt ‖ competitor scrape) ->
preprocess HTML -> detect market -> Claude (hypotheses + playbook + visibility audit in parallel) ->
persist.

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

### `POST /api/billing/mercadopago/webhook`

Verifies `x-signature` against `MERCADOPAGO_WEBHOOK_SECRET` (see
[security.md](security.md#mercado-pago-webhook-signature)) and refuses anything unproven with `400`.
It handles three topics and acknowledges everything else unread:

| Topic | What it does |
| --- | --- |
| `payment` | credits a one-off pack |
| `preapproval` | records what state a subscription is in, and **grants nothing** |
| `subscription_authorized_payment` | credits one renewal charge |

**The two subscription topics are separate because they answer separate questions.** Collapsing them
would either credit a cancellation or miss a renewal. A `preapproval` delivery carries no payment, so
it may never move a balance; a status the enum does not name leaves the row untouched rather than
guessing, because the safe direction is one extra sweep for someone who cancelled and not a sweep for
someone who never paid.

The claim is keyed `<payment id>:<topic>`, because a Pix payment notifies once pending and again once
approved and collapsing those two would throw away the delivery carrying the money. It then **reads
the payment back from the provider's API** — the notification body is an unsigned claim that something
happened to an id — and grants only when the status is `approved` and the amount matches a pack.

On an exception it releases the claim before answering `500`, so the retry can redo the work: a claim
that survives a failure turns every retry into a no-op and loses a paid credit.

## Subscriptions

### `POST /api/billing/mercadopago/subscribe`

Session required. Opens a Mercado Pago **preapproval** for `MONITORING_PLAN` and answers its id and
`init_point`, which is where the subscriber confirms it.

**The amount is sent from `MONITORING_PLAN` and never taken from the caller**, the same rule the pack
route follows, and the renewal is matched back against the same number — a charge for an amount we do
not sell buys nothing.

**It entitles nothing.** The row is written `pending`, which no sweep reads; only the webhook
confirming the provider authorised it flips that to `authorized`. Someone who opens a checkout and
walks away has bought nothing and is swept for nothing. The row is written *before* the reader is
sent anywhere, so the webhook has something to find whichever way the race falls —
`recordSubscription` upserts on `(provider, provider_ref)` for exactly that reason.

**A subscription does not hold credits.** A renewal calls `grantCredits` like any purchase, so
`users.credits` stays the single answer to what someone can spend and the ledger keeps explaining
every row in it. What `subscriptions` holds is the other half of what was bought: eligibility for the
sweep. See [invariants.md](invariants.md).

### `DELETE /api/billing/mercadopago/subscribe`

Session required. Answers `{ cancelled: true }`, `401` with no session, `404` when the caller has no
subscription or it is already cancelled, `502` when the provider could not be reached.

**It takes no id, and that is the whole authorisation story.** `subscriptionFor` looks the row up by
the session's `userId`, so there is no field anywhere a caller could put somebody else's
`preapproval_id` in. This is deliberately structural rather than an ownership check: a body-supplied
id plus a test is one forgotten line away from cancelling strangers' subscriptions. `e2e/subscription.spec.ts`
pins it.

"Nothing to cancel" and "not yours" are the same `404` on purpose — neither tells a caller anything
about a row they do not own.

**The provider is called first and the row written second, and only that order is safe.** Writing
`cancelled` and then failing to reach Mercado Pago would stop sweeping somebody who is still being
charged: they silently lose what they are paying for. The other way round leaves our row stale until
the `preapproval` webhook lands, which is the failure that repairs itself. The write here is
optimistic so the screen answers at once; `syncPreapproval` stays the writer of record.

**Cancelling stops the next charge, not the month already paid for.** `analysesDueForRemeasure` keeps
sweeping a `cancelled` row while `current_period_end` is in the future, which is why the cancel path
preserves that column rather than clearing it. A null period end never sweeps — that is a preapproval
that was never charged, so there is no paid month to honour.

### `GET /api/cron/remeasure`

`CRON_SECRET`, like the prune. Answers `{ due, queued }`.

**The filter is an active subscription, and that is the entire cost control.** Each entry opens a
real browser against a customer's site and shares `SCRAPE_MAX_CONCURRENT_PAGES` with everyone waiting
on a live analysis. The version of this that existed before the pivot filtered on a `users.plan`
column and was deleted along with plans, precisely because a sweep with nothing paying for it is
browser time nobody asked for — that argument inverts cleanly now one exists again.

Two things it does differently from the deleted version:

- **It enqueues instead of measuring in line.** The old one looped `measurePage` serially inside the
  request, taking slots without consulting the queue, so a sweep and a reader who had just clicked
  Analyze competed blindly. Going through `enqueue` means it obeys `QUEUE_MAX_DEPTH` and shares the
  drain. A full queue stops the sweep rather than displacing live work: those pages are still due
  tomorrow.
- **It uses its own job kind.** `runAnalysis` returns early on a row that already holds a
  measurement, so `analysis:<id>` for one of these pages would be a guaranteed no-op. `remeasure` is
  the kind that means "measure it again" — see [scraping.md](scraping.md).

The re-measure spends **no credit and calls no model**: it is `measurePage` plus arithmetic, which is
what a monthly fee can cover.

**The sweep runs weekly; the email does not.** Every run writes its measurement, so the report always
shows the full picture, improvements included. A message is sent only when `isWorthReporting()` says
the page got worse — a finding whose severity crossed, or a score down by `REGRESSION_SCORE_DROP`.

The reasoning is about attention, not accuracy. A weekly note saying two numbers drifted teaches a
subscriber to filter the only message this product sends, and the owner already knows about the
changes they made themselves. What they cannot know is that a tag somebody else added, a swapped CMS
image or a slower CDN pushed the page the wrong way — which is the case this fires on. What it may
then say is still bounded by the delta rule: it reports that a number got worse, never what made it
worse. See [invariants.md](invariants.md).
