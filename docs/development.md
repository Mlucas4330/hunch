# Local development

```bash
npx auth secret      # Generate AUTH_SECRET (paste it into .env)
cp .env.example .env # Then fill in the required values

docker compose up
npm install
npm run dev
npm run db:push
```

Schema changes are tracked as migrations in `db/migrations` (`npm run db:generate`); `db:push` applies
the current schema directly for local iteration and stays local-only.

**`drizzle-kit generate` asks interactively when a table loses one column and gains another**, because
it cannot tell a rename from a drop and an add. In a non-interactive shell that fails. Generate in two
steps instead: keep the old column in the schema while generating the add, then remove it and generate
the drop.

**Run `npm run build` with no `npm run dev` server attached.** Both write to `.next`.

## Commands

```bash
npm run typecheck
npm test                 # node:test via tsx, over lib/**/*.test.ts
npm run test:e2e         # Playwright on port 3100 with E2E_FIXTURES=1
npx playwright test --project=dom   # just the DOM specs: no sign in, no database
```

`.github/workflows/ci.yml` is the only thing running `typecheck`, `npm test` and the e2e suite before a
push goes live: Railway ships whatever is on `main`.

## Environment

- **`ADMIN_EMAIL` and `ADMIN_PASSWORD` must be set** for the e2e suite to sign in. The suite sets
  `ALLOW_CREDENTIALS_LOGIN` for itself; see [security.md](security.md).
- **An account needs a quota to run an analysis.** Locally, sign in as the admin and set one at
  `/admin/accounts`, including for the admin's own address.
- **`REDIS_URL` is required to run an analysis at all.** `POST /api/analyses` enqueues with no inline
  fallback, so no Redis means `503 queue_unavailable`. `docker compose` already runs one.
- **Setting it also turns rate limiting on**, and the budget counts requests, not analyses.
- **`E2E_FIXTURES=1` skips rate limiting** and replaces the scrape, PageSpeed Insights and generation
  with the fixtures in `lib/ai/fixtures.ts`.
- **`PAGESPEED_API_KEY` unset** means every analysis is saved with no PageSpeed section and a
  `pagespeed.failed` warning in the log. Everything else still runs.
- **`BRAND_DIR`** is where uploaded logos are written, `./.brand` locally. Unset, the name still saves
  and a logo upload answers `503 brand_storage_unavailable`. The e2e suite writes to `.brand-e2e`.
- **`SCREENSHOT_DIR`** is where the phone screenshot of each measured page is written, `./.screenshots`
  locally. Unset, the run still measures everything and the report simply shows no picture and no
  markers on it. The e2e suite writes to `.screenshots-e2e`.
- **`MERCADOPAGO_ACCESS_TOKEN` unset** makes the subscribe route answer `503 billing_unavailable`, so
  the checkout buttons do nothing and quotas are set at `/admin/accounts` as before. The webhook
  refuses every delivery without `MERCADOPAGO_WEBHOOK_SECRET`, which is what you want locally.
- **`PUPPETEER_SKIP_DOWNLOAD` must stay unset locally**, where Chrome is launched in-process.
- **`E2E_FAIL_GENERATION`** (`throw`, `empty` or `copy`) makes the fixture generation fail on purpose.
  It is nested inside the `E2E_FIXTURES` branch, so no production deploy can reach it.

## The unit suite: `npm test`

Node's built-in runner through `tsx`. Colocated with the functions they cover, among them
`lib/pagespeed.test.ts` (the PageSpeed parse and the score), `lib/snapshots.test.ts`,
`lib/analysis-state.test.ts` (which of four states the report renders), `lib/readout.test.ts`,
`lib/ai/schema.test.ts`, `lib/url-guard.test.ts` and `lib/market.test.ts`.

**The suite makes no network requests, and `lib/url-guard.test.ts` must stay that way.** It asserts the
allow path with IP literals, which need no DNS lookup.

## The Playwright suite: `npm run test:e2e`

Runs on a dedicated port (3100, overridable via `E2E_PORT`) so it never reuses a running `npm run dev`.

**`DEFAULT_LOCALE` is pt-BR, and the suite pins itself to English.** `e2e/locale.ts` writes the locale
cookie into the saved state and every anonymous context. The locale test in `e2e/core.spec.ts` is the
one exception.

`retries` stays **0** so a flaky test is never silently absorbed, and `trace` is `retain-on-failure`.

**The suite drives `next dev`, so a route's first hit pays for its compile.** Navigations after an
action use `page.waitForURL()`, which inherits the 60s test timeout.

`auth.setup.ts` signs in, sets the admin's quota to `E2E_QUOTA` through `setQuota`, and runs one
analysis to pay the compile cost once. `E2E_QUOTA` is high because every run in the same month adds to
the count, and `e2e/pagination.spec.ts` plants eleven rows of its own.

**CI runs against an empty database, and a laptop almost never does.** Reproduce a CI-only failure by
pointing `DATABASE_URL` at a fresh database and running `npm run db:migrate` into it. **Measure against
the layout, never against a pixel count a font can move**: Linux resolves fonts differently.

### Two projects

**`chromium`** is the product suite: it signs in through the credentials hatch and drives real routes.

**`dom`** (`e2e/dom/`) drives a browser function against synthetic markup, with no session and no
database, and does not depend on the auth setup. It holds `capture-sameness.spec.ts`.

### What the fixture user can and cannot prove

The credentials hatch forces that user to `admin`. What cannot be reached from here is a **second,
non-admin account**. The role gate is covered from the other direction: `e2e/admin-accounts.spec.ts`
demotes that row mid-session and expects the operator screen to answer 404.

## Running the scraper outside the Next build

Functions handed to `page.evaluate()` are serialized as source, so esbuild's `__name` helper injected by
tsx is not defined in the page. `openGuardedPage` declares `window.__name` for that reason. See
[scraping.md](scraping.md).
