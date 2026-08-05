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
  corpus of real shipped SaaS landing pages rather than in model priors alone
- Optionally add a business brief so variants come back as finished, ready-to-ship copy
- Paste competitor landing pages to ground the hypotheses (paid Competitor mode; free auto-searches)
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
- Share a public report link (`/r/<embedKey>`) that previews the top fixes applied to the real page
  and collects leads behind a waitlist wall
- Upgrade, downgrade, and cancel subscription via Stripe
- Export hypotheses (Solo plan)
- Usage gate for free tier (hard block at 3 analyses/month; 1 concurrent live test)

## Non-functional requirements

- Scraping must handle JS-rendered pages (Puppeteer)
- A flow fix is never recommended for something the page already does: the scrape captures a
  structural readout (social sign in, form length, FAQ, pricing, sticky CTA) and the playbook prompt
  is bound to it
- The reference corpus only ever supports a fix, never argues against one: a signal is quoted as
  evidence only when a majority of reference pages do it, because the corpus holds landing pages and
  anything living a click deeper (a signup form's OAuth buttons) is legitimately sparse there
- An empty or unreachable reference corpus costs the playbook its quantitative evidence, never the
  analysis: `structuralEvidence` returns '' and generation continues with no invented statistics
- AI output must be fully typed and validated via Zod before DB insert
- Stripe webhook must process events idempotently
- All authenticated routes protected via NextAuth middleware
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
  index gates the counter, so results cannot be inflated by anyone holding the public embed key
- A test without a conversion goal records no conversions rather than counting a click on the swapped
  element, so a result is never manufactured from the wrong event
- All user-facing copy comes from an i18n dictionary, never inline strings; the locale lives in a
  cookie, so no route changes and the `pt-BR` dictionary fails typecheck if a key is missing
- AI-generated content (hypotheses, variant copy, rationales, flow fixes) is written in the UI locale
  the analysis was run in, pinned to `analyses.locale` at creation. Switching language afterwards
  never retranslates an existing analysis, and the on-demand alternates read the stored locale rather
  than the current one, so a hypothesis and its alternates are always in the same language.
  `current_copy` is the exception: it quotes the page's own characters, whatever language it is in
- The landing page is the only indexable route; every other page declares `noindex`, and `robots.txt`
  disallows the same prefixes the auth middleware protects, from one shared constant
- Because the locale is a cookie and not a route segment, `en` and `pt-BR` are the same URL: each page
  is its own canonical and claims no hreflang alternates rather than inventing URLs that do not exist
- The public report is `noindex` but carries a full, per-report Open Graph card -- it is pasted into
  cold email, where the unfurl is the first impression, and an unknown embed key must produce the
  same card shape as a real one rather than reveal that it does not exist
- `NEXT_PUBLIC_APP_URL` is load-bearing in production: canonical URLs, Open Graph URLs and the
  sitemap are all built from it, not from the caller-controlled `Host` header
- The embed snippet must fail safe: a bad selector or network error never breaks the host page
- Visitor bucketing must be sticky (same visitor always sees the same arm)
- Significance is evaluated once at the test's end date, not continuously (avoids the peeking problem)
- The cron finalize endpoint authenticates via `CRON_SECRET` and is driven by the host's crontab
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
npm run ingest:references                        # scrape db/seeds/reference-pages.json into the corpus
npm run ingest:references -- https://foo.com Foo # add one page ad hoc
```

The reference corpus grounds the flow playbook. It is populated only by this command, from the
hand-curated seed list: `saaslandingpage.com` serves 403 to automated fetches, so the gallery is
browsed by hand to pick products and only the product pages themselves are scraped. Re-running
refreshes existing rows in place. The playbook still generates against an empty corpus, just without
the quantitative evidence lines.

```bash
npm run typecheck
npm run check:url-guard  # asserts the SSRF guard blocks private/loopback/encoded-IP targets
npm run test:e2e         # Playwright on port 3100 with E2E_FIXTURES=1 (no scraping, no Claude calls)
```

`E2E_FIXTURES=1` swaps generation for the fixtures in `lib/ai/fixtures.ts`, which exist per locale and
are picked by the same locale the real pipeline uses. The suite sets no locale cookie, so it runs in
`DEFAULT_LOCALE` and asserts against the English fixture.

`ADMIN_EMAIL` and `ADMIN_PASSWORD` must be set for the e2e suite to sign in (the suite sets
`ALLOW_CREDENTIALS_LOGIN` for itself). Rate limiting is skipped entirely without
`REDIS_URL`, so local dev needs no Redis.
Run `npm run build` with
no `npm run dev` server attached: both write to `.next`, and concurrently they corrupt each other's
chunks.

## Deployment

Import this repo as a new Railway project and the `app` service builds, migrates and serves with no
config file edits: Railway auto-detects `railway.json` at the root. Everything below is what that
import cannot create for you.

| Service | Source | Notes |
| ------- | ------ | ----- |
| `app` | `railway.json` (auto-detected on import) | public domain, volume mounted at `/data/screenshots` |
| `browser` | `railway.browser.json` (*Config as code*, set by hand) | **no variables, no public domain** |
| `Postgres` | Railway plugin | |
| `Redis` | Railway plugin | rate limit counters only |
| `cron-finalize` | `curlimages/curl`, cron `0 8 * * *` | calls `/api/cron/finalize-experiments` |

Railway creates exactly one service per import, so after importing:

1. Add the `Postgres` and `Redis` plugins.
2. Set the variables from `.env.example` on `app`, plus `AUTH_TRUST_HOST=true`.
3. Mount a volume on `app` at `/data/screenshots` (the image already defaults `SCREENSHOT_DIR` there).
4. Add a second service from the same repo, set *Config as code* to `railway.browser.json`, give it
   **no variables and no domain**, then point `BROWSER_URL` on `app` at its internal address.
5. Add the `cron-finalize` service and give it `CRON_SECRET`.

Steps 4 and 5 stay manual on purpose. The browser service's empty environment is the entire
mitigation for its missing sandbox, and merging it into `app` would put an unsandboxed renderer in the
same container as `DATABASE_URL` and `ANTHROPIC_API_KEY`. Pointing each service at its own config file
is also what keeps `watchPatterns` meaningful: without it every push to the app would rebuild
`browser` too, and that image reinstalls Chromium from apt each time.

Things that are easy to get wrong:

- **`NEXT_PUBLIC_*` and `CSP_ENFORCE` are build args, not runtime env.** Next inlines the first into
  the client bundle and `next.config.ts` reads `CSP_ENFORCE` at module scope, so a service variable
  cannot fix a build done without them -- the embed snippet and every report link would point at
  `localhost`, and the CSP would stay report-only. All four are declared as `ARG` in the `builder`
  stage (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_REPORT_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
  `CSP_ENFORCE`); Railway fills them from the service's variables. Adding a fifth such variable means
  adding an `ARG` for it too.
- **`DATABASE_URL` is deliberately *not* a build arg.** `next build` imports every route module to
  collect page data, and `db/index.ts` throws without it, so the `builder` stage sets a throwaway
  placeholder -- nothing queries at build time and postgres.js connects lazily. Do not replace it with
  a real value passed in as a build arg: that string would persist in the image's layer history. The
  `runner` stage does not carry it forward, so a deploy missing the real runtime variable still fails
  fast at boot.
- **The volume must be writable by uid 1001.** The runtime image runs as `nextjs`, and
  `saveScreenshot` degrades quietly on `EACCES` (`/api/report/screenshot` returns `url: null` by
  design), so a root-owned mount shows up as reports without previews rather than as an error. Test it
  by requesting a preview on a real report; the fix is Railway's `RAILWAY_RUN_UID=0`.
- **`AUTH_TRUST_HOST=true` is required** behind Railway's proxy, or sign-in fails looking like broken
  OAuth.
- **`browser` gets no public domain and no TCP proxy.** Anyone who reaches CDP on 9222 controls that
  browser completely, including reading files inside its container.
- **No secrets in project-level shared variables.** Railway propagates those into every service,
  including `browser`, whose empty environment is the entire mitigation for the missing sandbox.
- **Rate limiting fails open.** A missing or wrong `REDIS_URL`, or a Redis that is simply down,
  means no limit at all on the public endpoints -- silently, by design, so infrastructure trouble
  never becomes an outage. Confirm with a real 429 rather than by reading the config.

Schema changes reach production on boot: the app container runs `db/migrate.mjs` before `server.js`,
applying the committed `db/migrations`. It is idempotent -- drizzle records what it has applied, so
every boot after the first is a no-op -- and a failed migration exits non-zero rather than serving a
release against the wrong schema. This uses `drizzle-orm`'s runtime migrator rather than
`drizzle-kit migrate`, because `output: 'standalone'` traces only runtime imports and `drizzle-kit` is
a devDependency absent from the image. Railway overlaps the old and new containers during a rollover,
so still write migrations that are safe against the previous release -- add a column before writing to
it, drop it a release later. `db:push` stays local-only.

Nothing in this repo builds or pushes an image; Railway's GitHub integration is the deploy trigger.
`.github/workflows/ci.yml` is the gate in front of it -- Railway ships whatever is on `main` and fails
a deploy only if the Docker build fails, so CI is the only thing running `typecheck`,
`check:url-guard` and the e2e suite before a push goes live.

The `browser` image should be rebuilt periodically. Chrome runs unsandboxed there (see the
non-functional requirements), so an outdated Chromium is what turns that trade-off into a real risk.
