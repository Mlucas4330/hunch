# Hunch

## Overview

Founders know they should test but never know where to start. This removes the decision cost.

The user pastes their SaaS landing page URL. The tool scrapes the page, analyzes the copy, structure, and messaging, then generates a prioritized list of A/B test hypotheses. Each with a rationale, predicted impact, and suggested variant copy.

Hunch then closes the loop: with one embeddable snippet (no external analytics required), a chosen variant is applied to the live page client-side and its conversion rate is measured against the control, so the user sees a statistically-backed winner instead of a static plan.

## Tech stack

| Layer      | Choice                                        |
| ---------- | --------------------------------------------- |
| Framework  | Next.js App Router + TypeScript               |
| Auth       | NextAuth + Google OAuth                       |
| Scraping   | Puppeteer (self-hosted)                       |
| Styles     | Shadcn
| AI         | Claude API + Vercel AI SDK structured outputs |
| Database   | Postgres + Drizzle ORM                        |
| Storage    | AI JSON output in Postgres; variant screenshots on a local volume |
| Billing    | Stripe only (USD)                             |
| i18n       | Cookie-driven dictionaries (`en`, `pt-BR`)    |
| Deployment | Railway (app, dedicated browser, Postgres, Redis, cron)  |
| Market     | US-first                                      |

## Monetization tiers

| Plan | Price  | Analyses/month | Live experiments | History     | Competitor mode | Export |
| ---- | ------ | -------------- | ---------------- | ----------- | --------------- | ------ |
| Free | $0     | 3              | 1 concurrent     | Last 3 only | ❌              | ❌     |
| Solo | $29/mo | Unlimited      | Unlimited        | Full        | ✅              | ✅     |

## Functional requirements

- Paste a landing page URL and generate ranked A/B test hypotheses
- Get a ranked flow playbook alongside them: structural fixes with implementation steps (offer login
  with Google, cut the signup form, add a Q&A block, repeat the CTA after pricing), grounded in a
  measured structural readout of the page itself rather than in a guess at what it contains
- Optionally add a business brief so variants come back as finished, ready-to-ship copy
- Get a discoverability audit alongside them: what the page declares about itself (title, description,
  canonical, structured data) and what its robots.txt allows, so a founder can see whether a search
  engine and a language model can reach, read, and quote the page
- Paste competitor landing pages to ground the hypotheses (paid Competitor mode; free auto-searches
  in the market the page itself sells into)
- Browse ranked hypotheses, each with an AI-recommended challenger to test (no manual variant-picking)
- Run one test at a time from a focused screen: approve/swap/edit the challenger, then launch
- Swap the recommendation for one of two alternates, written on demand on the run-a-test screen
- Choose what counts as a conversion, from the CTAs captured during the scrape
- Sign up, log in, log out via Google OAuth
- Switch language between English and Brazilian Portuguese
- Track analysis history (dashboard)
- Update hypothesis status (pending -> testing -> completed -> skipped)
- Launch a live A/B test from a chosen variant, choosing a 7 / 14 / 30-day window
- Install a one-line tracking snippet on the landing page
- Auto-apply the variant copy client-side (no code changes on the user's site)
- Measure conversion rate and statistical significance per test
- Auto-finalize a test at its end date (daily cron) and produce a report with a recommendation
- Declare a winner or stop a running test
- Share a public report link (`/r/<embedKey>`). On a free plan it is our lead magnet: branded, with
  the top fixes previewed and the rest behind a waitlist wall. On a paid plan it is the customer's
  **deliverable** -- no mark of ours, no wall, nothing blurred -- because the reader is an agency
  handing it to their own client
- Ask to talk from the landing page, which publishes no price
- Nudge free plans toward the paid one with a dismissible prompt on the analysis they just generated,
  selling the unbranded report rather than volume
- **No self-serve checkout.** A plan is granted by a sale closed by a person and invoiced through
  Stripe; the webhook promotes the account. `/billing`, the checkout dialog and the published price
  are gone, and every paid-plan prompt points at the landing page's contact section instead
- Export hypotheses (paid plan)
- Usage gate for free tier (hard block at 3 analyses/month; 1 concurrent live test)

## Non-functional requirements

- Scraping must handle JS-rendered pages (Puppeteer)
- A flow fix is never recommended for something the page already does: the scrape captures a
  structural readout (social sign in, form length, FAQ, pricing, sticky CTA) and the playbook prompt
  is bound to it
- **A number may reach the reader through code, never through a token a model wrote.** This is the
  one line separating the measured readout from every other claim the product makes. `lib/readout.ts`
  counts facts off the scraped page -- form fields, above-fold CTAs, images with no alt text, LCP,
  transferred bytes -- and renders them as a labelled value; the sentence around each one lives in
  the dictionary and the value is interpolated into it. Nothing measured is ever put into a prompt,
  and nothing generated is ever presented as a measurement. The rule below about `evidence` is
  therefore unchanged and unrelated: it governs what a model may assert, this governs what a
  measurement may state, and the two never share a sentence
- The readout says what was counted, never what it will produce. "Your LCP is 4.2s" is a
  measurement; "this is costing you 12% of signups" is a prediction nobody measured, and it is the
  sentence that would burn the report's credibility the first time it did not come true. The load
  numbers additionally declare their own limits: they are measured from the deploy's network, so
  they are a **floor** a real visitor never beats, and `transferredBytes` is labelled "at least"
  because `SCRAPE_ALLOWED_RESOURCE_TYPES` blocks media and a page with a hero video really did
  transfer more than was counted
- The competitor comparison exists only where competitors were actually opened: paid Competitor mode
  already scrapes those pages for the research brief, so keeping the `PageStructure` it already
  measured costs nothing. The auto-search path's competitors are URLs a model cited without anyone
  loading them, and comparing against those would be exactly the invented number the rule above
  exists to prevent -- so that path stores none and the table does not render
- A flow fix's `evidence` never carries a number. The only measurement the playbook has is the
  readout of the one page in front of it, so a percentage, a conversion lift or a count of what other
  companies do would be invented; the prompt requires the CRO mechanism instead
- The market a page sells into is **measured from the page**, not taken from the UI locale: a `.br`
  domain or a Portuguese `lang` attribute decides it, and nothing else does. Weaker signals were
  deliberately left out — a BRL price appears on plenty of global pricing tables — because the two
  directions of error are not symmetric. Missing a Brazilian page costs one unfocused competitor
  search, which is what already happened before the market existed; marking a US page Brazilian
  rewrites the whole analysis around the wrong country and shows the reader nothing that explains it.
  The market is passed as `user_location` on the competitor web search and pinned to
  `analyses.market`, so an alternate written later is held to the market its hypothesis was written
  for, exactly as `locale` works
- **The market is a filter on what may be recommended, never a fact the model knows.** The analysis
  measured one page and nothing about any country, so the prompts may rule an idea out (do not offer
  a Brazilian founder a trust seal nobody there recognizes) but may never state what buyers in a
  market expect, prefer, or do. That claim would be invented exactly like a number in `evidence`
- The visibility audit measured the page, **not the index**. A finding never promises a ranking or a
  citation, never estimates traffic, and never says whether any model currently mentions the product
   — none of that was measured. Its `evidence` argues the mechanism (a crawler cannot read a price
  that exists only inside an image), under the same no-quantitative-claim rule as the playbook
- Unknown is never reported as negative. `robots.txt` resolves to `found`, `absent`, or `unknown`,
  and `unknown` (a network failure or an unreadable response) is excluded from the prompt's findings
  rather than presented as a missing file or a block — "we could not check" and "they block AI
  crawlers" are opposite conclusions
- The visibility audit has **no minimum number of findings**, unlike the playbook. Every page has room
  to convert better, so a floor there asks for something always available; a page can genuinely have
  no discoverability problem left, and a floor would buy an invented finding to fill the quota
- The two ranked lists share one table, one component and one category enum, discriminated by
  `flow_fixes.kind`. They render as separate sections rather than one list: a founder choosing what to
  test first should not have an SEO task ranked in among the conversion fixes
- Everything about running a live test -- installing the snippet and launching one -- lives on its
  own tab, because testing is the step that comes *after* the work is won and access to the site
  exists. It never appears on the public report: a prospect reading someone else's teardown installs
  no snippet
- The analysis screen and the public report split those lists into four tabs -- flow, copy, SEO and
  found-by-AI -- where the last two are the same `kind = 'visibility'` rows cut by category. That cut
  is presentation, not a column, so every analysis already generated divides itself with no migration
  and nothing regenerated. The print report stays one stacked page: nothing may be hidden behind a
  tab on paper
- Every ranked row is collapsible, on every surface. The top ones start open, but starting open is a
  default and never a state the reader is stuck in
- The reasoning behind a ranked item is rendered at body size, in a panel, ahead of the steps that
  implement it. It was previously a 12px muted footnote under the steps -- and for a hypothesis, the
  `rationale` the model is required to write never reached the analysis screen at all
- AI output must be fully typed and validated via Zod before DB insert
- Stripe webhook must process events idempotently
- All authenticated routes protected via NextAuth middleware, and every page and API route behind it
  re-checks the user itself: middleware proves a *session* exists, not that its user row still does
- A sign-in returns the visitor to the page they asked for, but `callbackUrl` reaches NextAuth's
  `redirectTo`, so it is allowlisted to a single leading slash rather than sanitized -- an unchecked
  one turns sign-in into an open redirect
- An OAuth profile is refused unless `email_verified` is exactly `true`. Rows are keyed on email with
  no `accounts` table, so an absent claim is treated the same as a false one
- Free tier gate enforced server-side, never client-side only
- Public endpoints (`/api/track/*`, `/api/waitlist`, `/api/report/*`) are unauthenticated + CORS-open
  and excluded from auth middleware; they back the snippet and the public report
- The credentials sign-in is a local/e2e escape hatch only, refused unless `NODE_ENV != production`
  **and** `ALLOW_CREDENTIALS_LOGIN=1`; secrets are compared in constant time, never with `!==`
- Every URL the app fetches is validated against private, loopback and link-local ranges before a
  browser is pointed at it, and re-validated per request inside the browser so a redirect or a DNS
  rebind cannot reach the deploy's own network
- Public endpoints are rate limited per IP or per embed key; the limiter fails open when unconfigured
  so a missing env var is never an outage
- Stripe webhooks are idempotent by `event.id` and ordered per subscription, so a retry is a no-op
  and a delayed `updated` cannot undo a cancellation
- A conversion or impression counts once per visitor: the snippet sends a sticky id and a unique
  index gates the counter, so results cannot be inflated by anyone holding the public embed key. The
  id is **required** — an event without one has no dedupe, and without dedupe the embed key is by
  itself enough to pick the winner, so such an event is dropped rather than counted un-deduped
- An impression is only recorded once the page is confirmed to hold the control copy. A visitor
  bucketed into the variant arm on a page where the target was never found would have been shown the
  control, and counting them reports an A/A test as a real result — with a real-looking rate, p-value
  and recommendation on top of it. Bucketing therefore happens *after* the element is located, so a
  visit that could not be served never writes an arm to storage either
- A test without a conversion goal records no conversions rather than counting a click on the swapped
  element, so a result is never manufactured from the wrong event
- All user-facing copy comes from an i18n dictionary, never inline strings; the locale lives in a
  cookie, so no route changes and the `pt-BR` dictionary fails typecheck if a key is missing
- `pt-BR` is a rewrite, not a translation: a technical term the Brazilian market uses in English
  stays in English (LCP, meta description, alt, CTA, snippet), and accented characters are required
   -- the whole metadata subtree once shipped stripped of them, which is the browser tab and the
  unfurl. The prompts' typographic rule restricts *punctuation* for exactly this reason and must
  never be phrased as "plain ASCII"
- AI-generated content (hypotheses, variant copy, rationales, flow fixes) is written in the UI locale
  the analysis was run in, pinned to `analyses.locale` at creation. Switching language afterwards
  never retranslates an existing analysis, and the on-demand alternates read the stored locale rather
  than the current one, so a hypothesis and its alternates are always in the same language.
  `current_copy` is the exception: it quotes the page's own characters, whatever language it is in
- The landing page is the only indexable route; every other page declares `noindex`, and `robots.txt`
  disallows the same prefixes the auth middleware protects, from one shared constant
- Because the locale is a cookie and not a route segment, `en` and `pt-BR` are the same URL: each page
  is its own canonical and claims no hreflang alternates rather than inventing URLs that do not exist
- **White-label is the capability the paid plan is bought for**, and our name reaches a report from
  three independent places: the page itself, `openGraph.siteName` plus the root `%s | Hunch` title
  template, and the OG card image. All three hang off one `canWhiteLabel(plan)` check, because
  stripping two of them still ships an agency a document that advertises us -- and the one most
  easily missed is the unfurl, which is the first thing their client sees when the link arrives by
  email
- The landing page publishes **no price**. The deal is negotiated by a person, and a visible
  self-serve number anchors that conversation to itself before it starts; `/billing` still carries
  the real, checkoutable tiers for anyone signed in
- A lead is unique per `(email, source)`, not per email. The insert is `onConflictDoNothing`, so a
  single-column unique silently dropped someone who had hit a report's wall and *then* asked to talk
   -- discarding the highest-intent event the product records
- The public report is `noindex` but carries a full, per-report Open Graph card -- it is pasted into
  cold email, where the unfurl is the first impression, and an unknown embed key must produce the
  same card shape as a real one rather than reveal that it does not exist
- `NEXT_PUBLIC_APP_URL` is load-bearing in production: canonical URLs, Open Graph URLs and the
  sitemap are all built from it, not from the caller-controlled `Host` header
- The embed snippet must fail safe: a bad selector or network error never breaks the host page. It
  also waits for the page to actually render before looking for its target — navigation is not paint,
  and a client-rendered landing page reaches the snippet holding nothing but a skeleton. The
  conversion listener is delegated from the document for the same reason: a CTA that appears later
  would otherwise never carry one. The remaining trade-off is accepted, not fixed — the original copy
  is briefly visible before the swap, because cloaking it would mean hiding an element whose selector
  the snippet does not know until its config arrives
- Visitor bucketing must be sticky (same visitor always sees the same arm)
- Counters and significance are recomputed on every read, and the panel polls them while a test runs.
  The **recommendation** is what waits for the end: it is rendered only once the experiment is
  `completed` or `stopped`, so the decision is never made from a peeked-at interim result.
  Significance additionally needs `MIN_SAMPLE` impressions per arm *and* `MIN_CONVERSIONS` across
  both — an impressions-only gate clears while each arm holds a handful of conversions, where one
  lucky click moves the rate by a third and the z-test happily returns p < 0.05
- A test ends at `coalesce(ends_at, started_at + duration_days)`, one definition shared by the cron
  that finalizes it and the config route that serves it. `ends_at` is nullable and `ends_at <= now()`
  on a null is null rather than false, so without the fallback such a row would never finalize and
  would keep rewriting the customer's page forever. The config route applies the same condition, so a
  test whose window closed stops being served immediately rather than on the next nightly sweep
- The cron endpoints authenticate via `CRON_SECRET` (one shared `authorizeCron`) and are driven by
  the host's crontab
- Concurrent pages against the shared browser are capped, because a burst of previews on a public
  report would otherwise OOM that container — and its restart kills every in-flight scrape with it,
  so an unauthenticated route could take the paid analyses down. Waiting for a slot is asymmetric: a
  preview gives up quickly and degrades to a button, an analysis waits rather than throwing away a
  request that has already paid for a Sonnet call
- Variant previews are pruned on a nightly cron rather than kept forever: nothing else deleted them,
  so the volume grew until writes failed — which surfaces as previews quietly not working, never as
  an error. The prune clears `variants.screenshot_url` *before* unlinking, because a row pointing at
  a missing file is the one state that renders a broken image
- Chrome runs as its own service, holding no credentials of any kind, because a scrape renders pages
  we do not control. Its sandbox is off — Railway cannot attach a seccomp profile, and Docker's
  default one blocks the namespace syscalls the sandbox needs — so the empty environment *is* the
  containment, and the image is rebuilt regularly to keep Chromium patched
- Variant screenshots are same-origin files on a volume, not object storage, so `img-src 'self'`
  already covers them and `next/image` needs no `remotePatterns` entry. The route that serves them
  takes a filename from an unauthenticated caller, so it allowlists the exact shape it writes
  rather than sanitizing the path

## Local development

```bash
npx auth secret      # Generate AUTH_SECRET (paste it into .env)
cp .env.example .env # Then fill in the required values

docker compose up
npm install
npm run dev
npm run db:push
```

Schema changes are tracked as migrations in `db/migrations` (`npm run db:generate`); `db:push`
applies the current schema directly for local iteration.

```bash
npm run typecheck
npm test                 # node:test over lib/**/*.test.ts, the pure functions e2e cannot reach
npm run test:e2e         # Playwright on port 3100 with E2E_FIXTURES=1 (no scraping, no Claude calls)
npx playwright test --project=dom   # just the DOM specs: no sign in, no database

npm run preview:screenshot                                  # defaults: https://vercel.com, h1
npm run preview:screenshot -- https://foo.com "h1" out-dir   # url, selector, output dir
```

`preview:screenshot` boots a real browser against a real page and writes `before.png` / `after.png`
through the same `screenshotVariant` the public report uses. It is **not** a test -- it asserts
nothing, cannot fail, and is not in CI -- which is why it is not named like one: the two gates above
it are, and a reader scanning this block should be able to tell which commands can go red.

It exists because `applyVariantCopy` distributes the new copy across an element's text nodes to
avoid destroying its inline children, and whether a gradient span or a `<br>` survived that split is
only answerable by looking at the two images. What *is* assertable about that split is covered
automatically by the e2e suite; this script is for the part only an eye can judge.

`E2E_FIXTURES=1` swaps generation for the fixtures in `lib/ai/fixtures.ts`, which exist per locale and
are picked by the same locale the real pipeline uses. The suite sets no locale cookie, so it runs in
`DEFAULT_LOCALE` and asserts against the English fixture.

`npm test` runs the unit suite on Node's built-in runner (no framework, no extra dependency): today
`lib/market.test.ts`, `lib/url-guard.test.ts` and `lib/readout.test.ts`, colocated with the functions
they cover. All three exist because the fixture path replaces the entire pipeline before a page is
ever scraped, so the e2e suite reaches neither market detection, nor the SSRF guard, nor the measured
readout. `lib/market.test.ts` is the only automated coverage `detectMarket` has, which is why the
suite is a CI step rather than a convenience script.

`lib/readout.test.ts` carries one case the whole numbers feature rests on -- *every emitted value
comes from the input, never from a literal in the module*. It feeds values that appear nowhere in
`lib/readout.ts` and asserts each one came back out of the field it was read from, so a hardcoded
fallback creeping into the one place the product is allowed to state numbers fails CI rather than
shipping.

The suite makes **no network requests**, and `lib/url-guard.test.ts` must stay that way: it asserts
the allow path with IP literals, which `resolvesPublicly` classifies without a DNS lookup at all. It
used to use real hostnames, which bought no coverage -- no public domain answers with a private
address, so the multi-address rule they were nominally there for never ran -- while making a CI step
fail on someone else's DNS. A new case here uses a literal or it does not belong in this file.

The Playwright run has two projects. `chromium` is the product suite: it signs in through the
credentials hatch and drives real routes. `dom` (`e2e/dom/`) drives a browser function against
synthetic markup -- no session, no request to the app, no row in the database -- and deliberately
does **not** depend on the auth setup, so a broken local database cannot hide a regression there.

Today `dom` holds `apply-variant-copy.spec.ts`, which is the only automated coverage
`applyVariantCopy` has. It cannot live in `npm test` (it needs a real DOM) and it cannot go through
`screenshotVariant` (whose first act is `assertPublicUrl`, and that refuses loopback -- pointing it
at a local fixture would mean punching a hole in the SSRF guard to enable a test). Driving the
exported function directly against `setContent` markup avoids the guarded path entirely.

What stays with `preview:screenshot` is the half no assertion can make: whether the gradient span
landed on a word that still looks good.

`ADMIN_EMAIL` and `ADMIN_PASSWORD` must be set for the e2e suite to sign in (the suite sets
`ALLOW_CREDENTIALS_LOGIN` for itself).

Rate limiting is skipped entirely while `REDIS_URL` is unset, which is why `.env.example` leaves it
empty: `analysis` is 5/hour, so a filled-in default would block you after five analyses of local
development. `docker compose` runs a Redis anyway, so setting
`REDIS_URL=redis://localhost:6379` is all it takes to exercise a real `429` -- worth doing at least
once, because a misconfigured `REDIS_URL` in production looks exactly like a working one and nothing
in the test suite reaches that branch.

Run `npm run build` with no `npm run dev` server attached: both write to `.next`, and concurrently
they corrupt each other's chunks.

## Deployment

Import this repo as a new Railway project and the `app` service builds, migrates and serves with no
config file edits: Railway auto-detects `railway.json` at the root. Everything below is what that
import cannot create for you.

| Service | Source | Notes |
| ------- | ------ | ----- |
| `app` | `railway.json` (auto-detected on import), Nixpacks | public domain, volume mounted at `/data/screenshots` |
| `browser` | `railway.browser.json` (*Config as code*, set by hand) | **no variables, no public domain** |
| `Postgres` | Railway plugin | |
| `Redis` | Railway plugin | rate limit counters only |
| `cron-finalize` | `curlimages/curl`, cron `0 8 * * *` | calls `/api/cron/finalize-experiments` |
| `cron-prune` | `curlimages/curl`, cron `0 9 * * *` | calls `/api/cron/prune-screenshots`; own hour so the two never hit `app` together |

Railway creates exactly one service per import, so after importing:

1. Add the `Postgres` and `Redis` plugins.
2. Set the variables from `.env.example` on `app`, plus `AUTH_TRUST_HOST=true` and
   `SCREENSHOT_DIR=/data/screenshots`. Two of them are **per-environment origins and must not be
   copied**: leave `AUTH_URL` **empty** (`AUTH_TRUST_HOST=true` derives the origin from the proxy)
   and set `NEXT_PUBLIC_APP_URL` to the service's public domain. Add `PUPPETEER_SKIP_DOWNLOAD=true`
   as well: production connects
   to the `browser` service over CDP and never launches Chrome itself, so the ~180MB Chromium that
   puppeteer's postinstall would otherwise pull into every build is dead weight. It must stay unset
   locally, where `npm run dev`, the e2e suite and `preview:screenshot` all launch Chrome in-process.
3. Mount a volume on `app` at `/data/screenshots`.
4. Add a second service from the same repo, set *Config as code* to `railway.browser.json`, give it
   **no variables and no domain**, then point `BROWSER_URL` on `app` at its internal address.
5. Add the `cron-finalize` and `cron-prune` services and give **each** of them `CRON_SECRET`. They are
   two services rather than one command hitting both URLs: `curl` exits 0 on a non-2xx, so
   `curl A && curl B` is really `A; B` and adding `-f` to fix that would let a failed finalize
   silently skip the prune. Separate services also keep the schedules independent, which is the point
   of the staggered hour.

Steps 4 and 5 stay manual on purpose. The browser service's empty environment is the entire
mitigation for its missing sandbox, and merging it into `app` would put an unsandboxed renderer in the
same container as `DATABASE_URL` and `ANTHROPIC_API_KEY`. Pointing each service at its own config file
is also what keeps `watchPatterns` meaningful: without it every push to the app would rebuild
`browser` too, and that image reinstalls Chromium from apt each time.

Things that are easy to get wrong:

- **`NEXT_PUBLIC_*`, `CSP_ENFORCE` and `DATABASE_URL` are read at *build* time, not just at runtime.**
  Next inlines `NEXT_PUBLIC_*` into the client bundle, `next.config.ts` reads `CSP_ENFORCE` at module
  scope, and `next build` imports every route module to collect page data -- which reaches
  `db/index.ts`, so a build with no `DATABASE_URL` fails outright. Nixpacks builds see the service's
  variables, so setting them on `app` is enough and there is nothing to declare anywhere. This is the
  single biggest reason the app is not built from a hand-written Dockerfile: there, each one needs an
  explicit `ARG`, and forgetting one ships an embed snippet pointing at `localhost`.
- **The volume must be writable by the app.** `saveScreenshot` degrades quietly on `EACCES`
  (`/api/report/screenshot` returns `url: null` by design), so a mount the app cannot write shows up
  as reports without previews rather than as an error. Test it by requesting a preview on a real
  report. A **full** volume looks identical, which is what `cron-prune` exists to prevent.
- **Previews expire after `SCREENSHOT_RETENTION_DAYS` (30).** A report link pasted into cold email and
  opened months later shows the preview button again rather than the cached image, and clicking it
  re-renders. That is the intended trade, not a bug — do not debug a vanished preview as one. It
  cannot be made a least-recently-used policy instead: serving a file does not touch its `mtime`, and
  `atime` on a network volume is not dependable.
- **`AUTH_TRUST_HOST=true` is required** behind Railway's proxy, or sign-in fails looking like broken
  OAuth.
- **A copied `AUTH_URL` breaks Google sign-in outright, and `AUTH_TRUST_HOST` does not save you.**
  NextAuth's `reqWithEnvURL` rewrites *every* auth request's origin to `AUTH_URL`'s whenever it is
  set, with no `trustHost` involvement, and `createActionURL` prefers it over the request headers. A
  `.env.example` value carried into the deploy makes the `redirect_uri` sent to Google
  `http://localhost:3000/api/auth/callback/google`, which Google rejects as unregistered. Setting
  `AUTH_URL` also makes `AUTH_TRUST_HOST` redundant -- `trustHost` is already true from its presence
  -- so the only safe production setting is empty. This is the reason `.env.example` carries a comment
  above it rather than just a value.
- **`browser` gets no public domain and no TCP proxy.** Anyone who reaches CDP on 9222 controls that
  browser completely, including reading files inside its container.
- **No secrets in project-level shared variables.** Railway propagates those into every service,
  including `browser`, whose empty environment is the entire mitigation for the missing sandbox.
- **Rate limiting fails open.** A missing or wrong `REDIS_URL`, or a Redis that is simply down,
  means no limit at all on the public endpoints -- silently, by design, so infrastructure trouble
  never becomes an outage. Confirm with a real 429 rather than by reading the config.

Schema changes reach production through `preDeployCommand` in `railway.json`, which runs
`npm run db:migrate` (the committed `db/migrations`) against the new release before any traffic moves
to it. A failed migration aborts the deploy instead of serving against the wrong schema. `drizzle-kit`
is a regular dependency rather than a devDependency for exactly this reason: the deploy step needs it,
and a builder that prunes devDependencies would otherwise remove it. Railway still overlaps the old and
new releases, so write migrations that are safe against the previous one -- add a column before writing
to it, drop it a release later. `db:push` stays local-only.

Nothing in this repo builds or pushes an image, and there is no Dockerfile for the app: Railway's
GitHub integration builds it with Nixpacks and deploys it. `.github/workflows/ci.yml` is the gate in
front of that -- Railway ships whatever is on `main` and fails a deploy only if the build itself fails,
so CI is the only thing running `typecheck`, `npm test` and the e2e suite before a push goes
live.

The `browser` image should be rebuilt periodically. Chrome runs unsandboxed there (see the
non-functional requirements), so an outdated Chromium is what turns that trade-off into a real risk.
