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
It answers `id`, `owned`, `measured`, `generated`, `failed` and `state`.

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
