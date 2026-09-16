# Deployment

The whole project is declared in `.railway/railway.ts`, Railway's **Infrastructure as Code**. One file
holds every service, its builder and its variables, and `railway config apply` reconciles the project
against it. The `railway` package is a devDependency for the types, and `tsconfig.json` includes
`.railway/**/*.ts` so `npm run typecheck` covers it.

**Omitting something means deleting it.** The file is the whole desired state, so a service, a variable
or a volume that is not in it is removed on the next apply. Read `railway config plan` before applying;
a destructive diff needs `--confirm-destructive` when applying non-interactively.

**No secret is in the file.** Every credential is declared as `preserve()`, which keeps the value
already set in Railway.

Nothing in this repo builds or pushes an app image: Railway builds it with **Railpack**. Nixpacks is
deprecated and must never be named again.

## Services

| Service | Source | Notes |
| ------- | ------ | ----- |
| `app` | repo, Railpack | public domain, `brand-volume` mounted at `/data` |
| `browser` | repo, `Dockerfile.browser` | **no variables, no public domain** |
| `postgres` | `postgres()` helper | |
| `redis` | `redis()` helper | rate limit counters and the job queue |

**The four cron services are gone from the file**, so the first apply after they were removed deletes
them. That diff is destructive and needs `--confirm-destructive`.

**`brand-volume` now holds two things**: the agency logos under `BRAND_DIR` and the phone screenshots
under `SCREENSHOT_DIR`, both at `/data`. It was raised to 3 GB when the screenshots arrived. There is
no prune cron: a run deletes the screenshots its own snapshots superseded, and the current picture of
each analysis is kept for good so an old shared report never goes blank. See
[scraping.md](scraping.md).

**`BILLING_RETURN_URL`** is where Mercado Pago sends the reader back, and it exists because the
provider will not accept every URL this app answers on. Measured against the live API:
`http://localhost:3000` is refused outright, and so is the apex `https://hunch.solutions`, while any
subdomain of it is accepted. The error says only "Invalid value for back_url", naming neither rule.

**Nobody is ever sent there.** The card is entered on our own page and the subscription comes back
authorised, so this URL is a field the API demands rather than a page anyone visits. It still has to
satisfy the validator, which is why it exists as a variable at all.

**It should still be a host that serves the app.** `www.hunch.solutions` is accepted by the API and
resolves nowhere, which is fine while nothing redirects and a trap the day something does. The
service's own Railway domain is both accepted and served, and needs no DNS of its own.

**The access token must be the production one (`APP_USR-`), from an application whose `sandbox_mode`
is false.** A `TEST-` token creates subscriptions whose checkout page does not open, and the app logs
a warning at startup when it sees one. See [api.md](api.md).

**`MERCADOPAGO_ACCESS_TOKEN` and `MERCADOPAGO_WEBHOOK_SECRET`** are what the subscription needs. The
secret is shown by Mercado Pago when the notification URL is registered, and it has to point at
`/api/billing/mercadopago/webhook`. With neither set the checkout answers `503` and an operator sets
quotas by hand, which is the state the app shipped in before.

## Bringing a project up

`railway link` the project, then **`railway config pull` first**: a clean import must plan to zero
changes. Merge the `build` and `deploy` blocks back on top of what it brought, then `railway config
plan` and `railway config apply`.

**Fill in the `preserve()` values** on `app` in the dashboard, from `.env.example`: `ANTHROPIC_API_KEY`,
`PAGESPEED_API_KEY`, the auth variables and `ADMIN_EMAIL`. **Two of them are per-environment origins
and must not be copied**: set both `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to this deploy's public origin.

`PUPPETEER_SKIP_DOWNLOAD=true` is set because production connects to the `browser` service over CDP
and never launches Chrome itself.

**`PAGESPEED_API_KEY`** is a Google Cloud API key with the PageSpeed Insights API enabled. Without it
every analysis is saved with no PageSpeed section and logs `pagespeed.failed`.

**`SE_RANKING_API_KEY`** is a Data API key from the SE Ranking dashboard (API > Dashboard), on a credit
wallet. Without it every analysis is saved with no backlink or ranking card and logs
`seranking.failed`. See [readout.md](readout.md#se-ranking-fetchseoindex-in-libserankingts).

**`BRAND_DIR`** is `/data/brand`, on the `brand-volume` the file mounts on `app`. Set it in the
dashboard, because the file declares it as `preserve()`. Without it the name still saves and a logo
upload answers `503`.

- **The volume holds every agency's logo.** Removing it from the file deletes it on the next apply, and
  every branded report loses its logo.
- **A service with a volume does not overlap its releases**, so `app` is briefly down while a deploy
  swaps it.

### Domains

`app` declares `hunch.solutions`. **Never list the generated `*.up.railway.app` host there**, and
**check the domain's target port in the dashboard before applying**: a domain with no `port` compiles
to `8080`.

### The browser

`browser` gets **no variables and no domain**, and `app` reaches it through
`BROWSER_URL = http://${{ browser.RAILWAY_PRIVATE_DOMAIN }}:9222`, with both the `http://` and the
`:9222` spelled out. See [scraping.md](scraping.md#browser-lifecycle-and-the-concurrency-cap).

**It stays a separate service on purpose.** Its empty environment is the whole mitigation for its
missing sandbox ([security.md](security.md)).

## The browser image

`Dockerfile.browser` is Chromium plus `scripts/browser-entrypoint.sh`, which starts a `socat`
forwarder on 9222 and then `exec`s Chrome on **9223**, loopback:

- **`--remote-debugging-address` binds one family**, and Railway's internal DNS answers with IPv6.
  `socat` listens on v6 with `ipv6only=0` and answers both.
- **Chrome ignores the flag often enough to matter.**

**`DevTools listening on ws://127.0.0.1:9223` is the healthy line.** A custom start command in the
dashboard overrides the `ENTRYPOINT` and undoes all of this silently.

The `browser` service carries **no `healthcheckPath`**: Chrome rejects a CDP probe from a hostname, and a
failing healthcheck would roll back every deploy.

## The build

Railpack detects Node from `package.json`, installs from `package-lock.json`, runs `build`, and starts
with `startCommand`.

- **The Node version comes from `engines.node`.**
- **Railpack installs Chromium's apt dependencies whenever it sees `puppeteer`**, even though `app`
  never launches a browser. Live with it rather than moving puppeteer to devDependencies.

## Healthcheck

`healthcheckPath` is `/api/health`: a route that imports nothing and answers `200 ok`. **It deliberately
does not check the database**, because Railway only probes until the deploy goes live.

**It is not `/`**: that route reads the session, which goes through `auth()` and the database, so a
missing `AUTH_SECRET` or an unreachable database would fail the deploy with no error pointing at either.

- **The route must stay out of the middleware matcher.**
- **`next start` binds `0.0.0.0` and reads `PORT`.** Never pass `-p` or `-H`.

The timeout is 300s, because migrations plus a cold boot are the slow part.

## Logs: `lib/log.ts`

One JSON line per event on stdout. Event names are the `LOG_EVENT` enum.

| Event | Field | What it answers |
| --- | --- | --- |
| `queue.enqueued` | `depth` | How much work was already ahead of this job |
| `scrape.slot_acquired` | `waitMs`, `queued` | Whether `SCRAPE_MAX_CONCURRENT_PAGES` is binding |
| `queue.job_finished` | `ms` | How long a job takes, which sizes `QUEUE_MAX_DEPTH` |
| `pagespeed.failed` | `status`, `reason`, `retrying` | PageSpeed Insights answered with an error, timed out, or no key is set. `retrying` marks a 5xx that gets another try |
| `crawl.finished` | `pages`, `truncated`, `ms`, `status` | Whether `CRAWL_BUDGET_MS` or `CRAWL_PAGE_MAX` is what stops the crawl |
| `crawl.failed` | `error` | The crawl threw, and the report has no site card |
| `seranking.failed` | `path`, `status`, `reason` | An SE Ranking call failed, timed out, or no key is set |

## Things that are easy to get wrong

- **`NEXT_PUBLIC_*`, `CSP_ENFORCE` and `DATABASE_URL` are read at build time**, not just at runtime.
- **An empty variable is not an unset one.** Railway keeps a cleared variable, so `process.env.X` is
  `''` and every `??` fallback is skipped. Delete the variable instead of blanking it.
- **`AUTH_URL` must be this deploy's own public origin.** Copied from `.env.example` it sends Google a
  localhost `redirect_uri`; absent, Auth.js builds URLs from the container's origin; **blank, every auth
  request answers `UntrustedHost`**.
- **`AUTH_TRUST_HOST=true` is required** behind Railway's proxy.
- **`browser` gets no public domain and no TCP proxy.** Anyone reaching CDP controls that browser.
- **No secrets in project-level shared variables.** Railway propagates those into every service.
- **`scripts/browser-entrypoint.sh` must stay LF.** `.gitattributes` pins `*.sh`.
- **A variable's value is write-only to IaC, so declaring a literal drifts forever.** The file declares
  references and `preserve()`, never a literal value.
- **`ON_FAILURE` cannot be written, because it is the default.**
- **On Windows, `npm i -g @railway/cli` does not put `railway.exe` on the PATH.** Put
  `%APPDATA%\npm\node_modules\@railway\cli\bin` on it, or install the native CLI.
- **Rate limiting fails open.** Confirm with a real 429 rather than by reading the config.

## CI

Pin the plan and apply that exact file:

```
railway config plan --out railway-plan.json
railway config apply --plan railway-plan.json --yes --confirm-destructive
```

Nothing in this repo does that yet: the apply is run by hand.

## Migrations

Schema changes reach production through `preDeployCommand`, which runs `npm run db:migrate` before any
traffic moves to the new release. `drizzle-kit` is a **regular dependency** for that reason.

Railway overlaps the old and new releases, so **write migrations that are safe against the previous
one.** `0044_quota_and_pagespeed`, `0045_drop_billing_columns` and `0046_runs_replace_verdicts` are
the exception: they drop the credit, lead, variant and payment tables, the verdict columns and
`analyses.failed_at`, all of which the previous release still reads. `0046` backfills one run per
owned analysis before dropping `failed_at`. Deploy them in a quiet window, and back up the database
first if that data matters.

## Keeping the browser image patched

Rebuild it periodically. Chrome runs unsandboxed there, so an outdated Chromium is what turns that
trade-off into a real risk.
