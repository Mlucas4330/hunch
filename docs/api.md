# API routes

Every `/api` route authenticates itself via `getCurrentUser()`. The middleware matcher is a
performance detail, not the security boundary. See [security.md](security.md).

| Route | Auth | Notes |
| ----- | ---- | ----- |
| `GET\|POST /api/auth/[...nextauth]` | none | NextAuth catch-all |
| `POST /api/analyses` | session, quota | queues an analysis; takes an optional `competitorUrl` |
| `GET /api/analyses` | session, or embed key for `?embedKey=` | history, or one analysis' progress |
| `GET\|DELETE /api/analyses/[id]` | session + ownership | |
| `POST /api/analyses/[id]/runs` | session + ownership, quota | runs the page again: measures it and rewrites the error lists |
| `POST /api/analyses/bulk` | session, tier, rate limit `bulk`, quota | queues a list of URLs as one batch |
| `GET /api/analyses/bulk/[id]` | session + ownership | the batch's rows, for the table that polls it |
| `GET /api/analyses/bulk/[id]/csv` | session + ownership | the same rows as a spreadsheet |
| `POST /api/brand` | session | saves the agency name and logo the account's reports carry |
| `POST\|DELETE /api/billing/mercadopago/subscribe` | session, rate limit `billing` | opens the tier's preapproval and answers its `initPoint`; `DELETE` ends the caller's own |
| `POST /api/billing/mercadopago/webhook` | signature only | what the provider says happened; writes the tier and the quota |
| `GET /brand/[file]` | none | serves an uploaded logo; not under `/api`, see [security.md](security.md#uploads-post-apibrand-and-appbrandfileroutets) |
| `GET /api/health` | none | Railway's deploy probe, imports nothing: see [deployment.md](deployment.md#healthcheck) |

The operator screen sets quotas through a server action, `setQuotaAction` in
`lib/actions/accounts.ts`, not through a route. It re-checks the role itself. See
[invariants.md](invariants.md#admin_email-grants-the-role-usersrole-authorizes-the-request).

## Analyses

### `POST /api/analyses`

```json
{ "url": "https://example.com", "competitorUrl": "https://optional-second-page.com" }
```

Chain: session -> rate limit -> guard both URLs -> quota -> insert the row with `user_id` ->
`startRun`, which records the run and queues its job.
Answers `202 { embedKey, id }`.

- **Both URLs go through `assertPublicUrl`** before anything is written, because both are pointed at
  a real browser. See [security.md](security.md).
- **The quota is read from the rows**, `quotaFor` in `lib/quota.ts`, and checked before the insert.
  An exhausted quota answers `403 quota_exhausted`.
- **Without Redis there is no queue**, and the run and the row are deleted so nothing counts against
  the quota:
  `503 queue_unavailable`.

The job (`runAnalysis` in `lib/run-analysis.ts`) then runs:

1. `measurePage`: the scrape, the robots.txt fetch and PageSpeed Insights, in parallel.
2. **Persist the measurement** and a `page_snapshots` row, in one transaction.
3. `generateFromMeasurement`: the competitor, the neighbour pages, then the three error generators in
   one `Promise.all`.
4. Replace the error lists on the analysis, in one transaction, and mark the run finished.

**The two writes are two writes.** The client navigates on `measured`, so the reader reaches the
report with the PageSpeed section while the lists are still being written.

**A failure writes the run's `failed_at`.** From the `catch`, a scrape that threw included, and when all
three generators came back empty. A short list from one of them is still a finished report.

**The measurement write is skipped when the run already stored one**, so a requeued job does not
append a second snapshot for the same run.

Errors: `401` no session · `403 quota_exhausted` · `422` invalid or unsupported URL (including one
resolving to a private address) · `429` rate limited · `503` no queue · `500` failure.

### `GET /api/analyses`

History, paginated via `?page=1&limit=10`, through `listAnalysesForUser`. `page` is what was
**served**: a number past the end is clamped to the last page, and anything that is not a positive
integer reads as page one.

```json
{ "analyses": [ "...AnalysisRow[]" ], "total": 12, "page": 1, "pages": 2 }
```

### `GET /api/analyses?embedKey=`

Progress for one analysis, readable by whoever holds the key, because the report is shared by link.
It answers `id`, `owned`, `measured`, `generated`, `failed` and `state`, plus what the waiting screen
draws: `url`, `screenshotUrl`, `score`, `crawledPages` and `steps`.

**The five extra fields are what the run has already produced**, so they are null or empty until it
has. `score` is `pageSpeedScore`, the same average the report opens with, and `crawledPages` counts
the pages the crawl read. **A call that failed stays null and never becomes a zero**, under the rule
in [invariants.md](invariants.md#unknown-is-never-reported-as-negative). `steps` is `RUN_STEP`, read
from Redis, and an empty list means no Redis rather than no progress. See
[report.md](report.md#the-wait).

**`state` is what a caller should switch on**, and it comes from `analysisStateFor`, the same helper
the report renders from. The values are `ANALYSIS_STATE`: `measuring`, `generating`, `rerunning`,
`failed`, `ready`. See [report.md](report.md).

### `GET /api/analyses/[id]` and `DELETE`

One analysis with its errors, or its deletion. `404` if not found **or not owned**.

### `POST /api/analyses/[id]/runs`

"Run again". The same job as a new analysis, on the same row: it measures the page, appends a
snapshot, and replaces the four error lists, so the report behind the link stays one document with a
history of scores. It spends one run of the month, exactly like a new analysis.

Chain: session -> rate limit (`analysis`) -> ownership -> no run in flight -> quota -> `startRun`.
Answers `202 { runId }`.

- **One run at a time per analysis.** A latest run whose job is still queued or running answers
  `409 run_in_progress`. A latest run left unfinished with no job behind it was lost to a restart; it
  is marked failed so it stops counting, and the new run starts.
- **The job's ref is the run, not the analysis.** `enqueue` hands back an existing job for as long as
  its status lives, so a job keyed on the analysis could not run again inside `JOB_TTL_MS`.
- **The previous lists stay until the new ones land**, and a run that fails leaves them in place.

Errors: `401` no session · `403 quota_exhausted` · `404` unknown or unowned id · `409 run_in_progress`
· `429` rate limited · `503 queue_unavailable`.

## Bulk

`POST /api/analyses/bulk` runs in this order: session, rate limit, **tier**, parse, `assertPublicUrl`
on every URL, quota, then one analysis and one `startRun` per URL.

- **The tier is checked here and not only in the UI.** `canBulkGenerate` reads the stored
  `users.plan_tier`; the nav hiding the link and the page answering `notFound()` are conveniences.
  Same three-place discipline as `isAdmin`. See [invariants.md](invariants.md).
- **One bad URL refuses the whole batch**, before anything is inserted: a half-accepted batch leaves
  the caller to work out which lines took, having already paid for them.
- **`BULK_URLS_MAX` is well under `QUEUE_MAX_DEPTH`.** See [scraping.md](scraping.md).
- The quota check is the friendly refusal; the atomic charge inside `startRun` is the boundary, and a
  run that cannot be paid for stops the loop with the batch keeping what already started.

The CSV is written with a BOM, because Excel in pt-BR reads UTF-8 without one as Latin-1 and mangles
every accent. Header labels come from the dictionary; the data does not.

## Billing

**A `TEST-` access token cannot produce a checkout anybody can open.** Everything on this side
succeeds, the reader is redirected, and Mercado Pago answers "Esta página não existe", because the
subscription was created in sandbox while `init_point` points at the live site. The application's own
`sandbox_mode` flag is what decides it. `mercadoPagoSandbox()` logs a warning at startup, since
nothing in the API response says any of this.

**`back_url` comes from `billingReturnUrl()`, not from `siteOrigin()`.** Mercado Pago refuses URLs
its validator dislikes and answers "Invalid value for back_url, must be a valid URL" for every one of
them, which names neither rule. Two were measured against the live API: `http://localhost:3000` is
refused, so the checkout cannot be exercised from a developer's machine without `BILLING_RETURN_URL`
pointing somewhere public; and some apex domains on newer TLDs are refused where the `www` host of
the same domain is accepted. See [deployment.md](deployment.md).

`POST /api/billing/mercadopago/subscribe` takes a `tier` and a single-use `cardToken`. **The amount
is read from `PLAN` on the server**, so a caller editing the request can only ever buy the tier they
named, and the webhook matches the confirmed amount back against the same map through
`planTierForAmount`. The provider answers `authorized`, so the quota is written in the same request
and nobody is redirected anywhere. With no `MERCADOPAGO_ACCESS_TOKEN` the route answers
`503 billing_unavailable` and an operator still sets quotas by hand; a refused card answers `402`.

**Three things the provider refuses, each measured against the live API rather than guessed:**

- **A payer who is also the collector.** Nobody subscribes to themselves.
- **Mixing a real account with a test one**, in either direction: "Both payer and collector must be
  real or test users".
- **`back_url`, which is required even here.** There is no redirect in this flow and the field is
  never visited, but the request is refused without one, and refused again if the URL has a shape its
  validator dislikes. See [deployment.md](deployment.md).

`DELETE` ends the caller's own subscription, and **takes no id**: `subscriptionFor` looks the row up
by the session, so there is no field to aim at somebody else's. The provider is called first and the
row written second, because writing `cancelled` and then failing to reach Mercado Pago would stop the
quota of somebody who is still being charged.

The webhook is **unauthenticated by design and signed instead**. `verifyWebhookSignature` is the whole
of its authorization and every failure of it refuses; the delivery is then claimed in `payment_events`
keyed on the id **and** the type, and the claim is released before any 500 so the retry can work. Only
`authorized` writes a quota, and it writes an absolute number. See
[invariants.md](invariants.md#access-is-a-quota-read-from-the-row-written-by-the-subscription-or-by-an-operator).

## Brand

### `POST /api/brand`

Multipart form data: `name`, `logo` (file) and `removeLogo`, because the name and the logo are saved
together from one form.

Chain: session -> rate limit (`brand`) -> name length -> logo size -> logo type -> write the file ->
update the row -> delete the previous file. Answers `{ brandName, brandLogoUrl }`.

- An empty `name` saves as `null`. `removeLogo=1` clears the logo and wins over a file in the same
  request.
- **The type is sniffed from the file's bytes**, never from its declared `Content-Type`. See
  [security.md](security.md#uploads-post-apibrand-and-appbrandfileroutets).
- **No `BRAND_DIR` means no upload**, answered as `503 brand_storage_unavailable` rather than a crash.
  Saving the name alone still works.

Errors: `401` no session · `422 name_too_long` · `422 logo_too_large` · `422 unsupported_logo` · `429`
rate limited · `503 brand_storage_unavailable`.
