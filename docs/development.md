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

npm run seed:pulse                                           # plant domains for the landing board
npm run seed:pulse -- --clear                                # and take them out again
```

`seed:pulse` exists because **the landing board counts domains, not analyses**. Every test run measures
`example.com`, `publicLeaderboard` keeps one entry per domain, and one entry is below
`PULSE_MIN_ENTRIES` — so the section correctly refuses to render and there is nothing to look at. The
script plants enough distinct hostnames to see the sphere, tags every row `seed:pulse`, and `--clear`
removes exactly those. **Local only.** The board's entire claim is that every chip is a page this tool
measured, so planting rows anywhere real is the one thing it must never do — see
[invariants.md](invariants.md#the-public-board-carries-a-domain-and-a-score-and-nothing-else).

The first three are the gates and can go red. `preview:screenshot` **is not a test** — it asserts
nothing, cannot fail, and is not in CI, which is why it is not named like one.

`.github/workflows/ci.yml` is the only thing running `typecheck`, `npm test` and the e2e suite before a
push goes live: Railway ships whatever is on `main` and fails a deploy only if the build itself fails.

## Environment

- **`ADMIN_EMAIL` and `ADMIN_PASSWORD` must be set** for the e2e suite to sign in. The suite sets
  `ALLOW_CREDENTIALS_LOGIN` for itself; see [security.md](security.md).
- **`REDIS_URL` is now required to run an analysis at all.** It used to be optional, and the note here
  used to say so. `POST /api/analyses` enqueues with **no inline fallback** — running a scrape inside
  the request is the unmetered path the fail-closed limit exists to prevent — so no Redis means every
  analysis answers `503 queue_unavailable`, refunds the credit and deletes the row. Nothing in the UI
  names Redis, so it shows up as an Analyze button that returns you to the dashboard. `docker compose`
  already runs one: set `REDIS_URL=redis://localhost:6379`. `.github/workflows/ci.yml` runs the same
  image as a service for exactly this reason -- it did not, and the whole `chromium` project died at
  `auth.setup.ts` with nothing in the log naming Redis.
- **Setting it also turns rate limiting on, and `analysis` is 5/hour**, which is the reason
  `.env.example` used to leave it empty. Note the budget counts **requests, not analyses**: the
  limiter runs before the body is parsed, so a rejected URL or a queue failure spends a token too.
  Five an hour is easy to hit while iterating.
- **`E2E_FIXTURES=1` skips rate limiting entirely**, which is what lets the suite run: it creates six
  analyses on one account and would otherwise take a `429` on the sixth. The budgets exist to cap what
  a route costs, and under fixtures a route costs nothing — no browser opens and no tokens are spent.
  See `lib/rate-limit.ts`.
- A misconfigured `REDIS_URL` in production looks exactly like a working one, so **confirm it with a
  real `429`** rather than by reading the config.
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

**The suite drives `next dev`, so a route's first hit pays for its compile, and that is why a URL is
awaited rather than asserted.** `expect(page).toHaveURL()` is capped at the 5s expect timeout, which a
credentials sign in followed by a first render does not always fit inside — the symptom is a snapshot
showing the submit button still `[disabled]`, because `useFormStatus` is telling the truth and the
request simply has not come back. `page.waitForURL()` inherits the 60s test timeout instead, which is
what every navigation after an action uses. `toHaveURL` is right for a URL that has already settled,
which is what the remaining five assert.

`auth.setup.ts` pays the same cost deliberately and once, outside any test's timeout, for the three
routes that creating an analysis crosses.

**CI runs against an empty database, and a laptop almost never does.** The dashboard is shorter with no
history behind it, which is enough to change what is above the fold and what an animation moves.
`e2e/brief-wizard.spec.ts` failed on CI for two runs while passing locally for exactly that reason, and
it now waits for the disclosure's height transition to settle before it measures anything. Reproduce a
CI-only failure by pointing `DATABASE_URL` at a fresh database and running `npm run db:migrate` into it
first; a suite that only passes on a populated one is a suite that will fail on the next push.

### Two projects

**`chromium`** is the product suite: it signs in through the credentials hatch and drives real routes.

**The e2e server is pointed at Mercado Pago on purpose.** `playwright.config.ts` sets both halves of
the credential pair to dummies, so `mercadoPagoEnabled()` picks the Brick over Stripe checkout and
`e2e/checkout-brick.spec.ts` has something to open. Nothing reaches Mercado Pago: the spec stubs the
SDK at its own URL and no test submits the form.

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

The credentials hatch forces that user to `admin` (`auth.ts`), which is the only role there is besides
`user` — there are no plans and no `pro`. `auth.setup.ts` then buys the run `E2E_CREDITS` through
`grantCredits`, never by updating `users.credits`, so the suite exercises the path that actually
charges. **An analysis spends a credit for everyone, admin included**, and there is no exemption by
role.

**The free, walled shape is no longer checked by hand.** `e2e/free-analysis.spec.ts` drains the
balance to zero, runs an analysis, and asserts the three things that define the free half: the reader
lands on `/r/<embedKey>` rather than being refused, the row came back with `user_id` null and
`structure` populated (so no model was called), and the report shows the unlock wall without claiming
zero changes. It restores whatever balance it took, because the rest of the suite needs it.

What still cannot be reached from here is a **second, non-admin account**: every signed-in path the
suite drives is the same row. The role gate is covered from the other direction instead —
`e2e/admin-credits.spec.ts` demotes that row mid-session and expects the operator screen to answer
404 with the token untouched.

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
