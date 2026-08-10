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

**Run `npm run build` with no `npm run dev` server attached** — both write to `.next`, and concurrently
they corrupt each other's chunks.

## Commands

```bash
npm run typecheck
npm test                 # node:test via tsx, over lib/**/*.test.ts
npm run test:e2e         # Playwright on port 3100 with E2E_FIXTURES=1
npx playwright test --project=dom   # just the DOM specs: no sign in, no database

npm run preview:screenshot                                   # defaults: https://vercel.com, h1
npm run preview:screenshot -- https://foo.com "h1" out-dir   # url, selector, output dir
```

The first three are the gates and can go red. `preview:screenshot` **is not a test** — it asserts
nothing, cannot fail, and is not in CI, which is why it is not named like one.

`.github/workflows/ci.yml` is the only thing running `typecheck`, `npm test` and the e2e suite before a
push goes live: Railway ships whatever is on `main` and fails a deploy only if the build itself fails.

## Environment

- **`ADMIN_EMAIL` and `ADMIN_PASSWORD` must be set** for the e2e suite to sign in. The suite sets
  `ALLOW_CREDENTIALS_LOGIN` for itself; see [security.md](security.md).
- **Rate limiting is skipped entirely while `REDIS_URL` is unset**, which is why `.env.example` leaves it
  empty: `analysis` is 5/hour, so a filled-in default would block you after five analyses of local
  development. `docker compose` runs a Redis anyway, so setting `REDIS_URL=redis://localhost:6379` is
  all it takes to exercise a real `429` — **worth doing at least once**, because a misconfigured
  `REDIS_URL` in production looks exactly like a working one and nothing in the test suite reaches that
  branch.
- **`PUPPETEER_SKIP_DOWNLOAD` must stay unset locally**, where `npm run dev`, the e2e suite and
  `preview:screenshot` all launch Chrome in-process. Production sets it; see
  [deployment.md](deployment.md).

## The unit suite — `npm test`

Node's built-in runner, driven through `tsx` (no test framework). Today `lib/market.test.ts`,
`lib/url-guard.test.ts` and `lib/readout.test.ts`, colocated with the functions they cover.

**All three exist because `E2E_FIXTURES=1` replaces the entire pipeline before a page is ever scraped**,
so the e2e suite reaches neither market detection, nor the SSRF guard, nor the measured readout.
`lib/market.test.ts` is the only automated coverage `detectMarket` has, which is why this is a CI step
rather than a convenience script.

`lib/readout.test.ts` carries the one case the whole numbers feature rests on: **every emitted value
comes from the input, never from a literal in the module.** It feeds values that appear nowhere in
`lib/readout.ts` and asserts each one came back out of the field it was read from, so a hardcoded
fallback creeping into the one place the product is allowed to state numbers fails CI rather than
shipping. See [readout.md](readout.md).

**The suite makes no network requests, and `lib/url-guard.test.ts` must stay that way.** It asserts the
allow path with **IP literals**, which `resolvesPublicly` classifies without a DNS lookup at all. It
used to use real hostnames, which bought no coverage — no public domain answers with a private address,
so the multi-address rule they were nominally there for never ran — while making a CI step fail on
someone else's DNS. **A new case here uses a literal or it does not belong in this file.**

## The Playwright suite — `npm run test:e2e`

Runs on a dedicated port (3100, overridable via `E2E_PORT`) so it never collides with or reuses a
running `npm run dev`, which would not have `E2E_FIXTURES` set.

`E2E_FIXTURES=1` swaps generation for the fixtures in `lib/ai/fixtures.ts`, which exist per locale and
are picked by the same locale the real pipeline uses. The suite sets no locale cookie, so it runs in
`DEFAULT_LOCALE` and asserts against the English fixture.

`retries` stays **0** so a flaky test is never silently absorbed. That is why `trace` is
`retain-on-failure` and not `on-first-retry`: with no retries there is no first retry, and that setting
recorded nothing.

### Two projects

**`chromium`** is the product suite: it signs in through the credentials hatch and drives real routes.

**`dom`** (`e2e/dom/`) drives a browser function against synthetic markup — no session, no request to
the app, no row in the database — and **deliberately does not depend on the auth setup**, so a broken
local database or an expired credentials hatch cannot hide a regression in the DOM routines, which are
the least forgiving code in the repo and the cheapest to check.

Today `dom` holds `apply-variant-copy.spec.ts`, the only automated coverage `applyVariantCopy` has. It
cannot live in `npm test` (it needs a real DOM) and it cannot go through `screenshotVariant` — whose
first act is `assertPublicUrl`, and that refuses loopback, so pointing it at a local fixture would mean
punching a hole in the SSRF guard to enable a test. Driving the exported function directly against
`setContent` markup avoids the guarded path entirely. Each of the four rules in
[scraping.md](scraping.md#applying-a-variant-to-the-live-dom--applyvariantcopy) has a case; reverting
the routine to `el.textContent = copy` turns four of the eight red.

### What the fixture user can and cannot prove

The credentials hatch forces that user to `pro` (`auth.ts`), so the suite can assert that **a paying
customer is never shown an upsell** and that the **unbranded, unwalled paid report** renders correctly.

It cannot reach the free, walled shape of either surface — that needs a genuinely free account and is
**checked by hand**. Anything that must hold for the free shape is verified manually.

## `preview:screenshot`

Boots a real browser against a real page and writes `before.png` / `after.png` through the same
`screenshotVariant` the public report uses. It calls neither `POST /api/report/screenshot` nor
`saveScreenshot`, so it needs no `SCREENSHOT_DIR` and writes nothing a report would later serve.

It exists because `applyVariantCopy` distributes the new copy across an element's text nodes to avoid
destroying its inline children, and **whether a gradient span or a `<br>` survived that split is only
answerable by looking at the two images**. What is assertable about that split is covered by the `dom`
project; this script is for the half no assertion can make — whether the gradient span landed on a word
that still looks good.

One non-obvious constraint applies to any script driving `scrapePage` / `screenshotVariant` outside the
Next build — see
[scraping.md](scraping.md#running-the-scraper-outside-the-next-build).
