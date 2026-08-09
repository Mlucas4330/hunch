# Deployment

Import this repo as a new Railway project and the `app` service builds, migrates and serves with no
config file edits: Railway auto-detects `railway.json` at the root. Everything below is what that import
cannot create for you.

Nothing in this repo builds or pushes an image, and there is no Dockerfile for the app — Railway's
GitHub integration builds it with **Railpack**, the builder that replaced Nixpacks. Nixpacks is
deprecated and `railway.json` must never name it again.

## Services

| Service | Source | Notes |
| ------- | ------ | ----- |
| `app` | `railway.json` (auto-detected on import), Railpack | public domain, volume mounted at `/data/screenshots` |
| `browser` | `railway.browser.json` (*Config as code*, set by hand) | **no variables, no public domain** |
| `Postgres` | Railway plugin | |
| `Redis` | Railway plugin | rate limit counters only |
| `cron-finalize` | `curlimages/curl`, cron `0 8 * * *` | calls `/api/cron/finalize-experiments` |
| `cron-prune` | `curlimages/curl`, cron `0 9 * * *` | calls `/api/cron/prune-screenshots`; own hour so the two never hit `app` together |

## After importing

Railway creates exactly one service per import, so:

1. Add the `Postgres` and `Redis` plugins.
2. Set the variables from `.env.example` on `app`, plus `AUTH_TRUST_HOST=true` and
   `SCREENSHOT_DIR=/data/screenshots`. **Two are per-environment origins and must not be copied**:
   leave `AUTH_URL` **empty** and set `NEXT_PUBLIC_APP_URL` to the service's public domain. Add
   `PUPPETEER_SKIP_DOWNLOAD=true` as well — production connects to the `browser` service over CDP and
   never launches Chrome itself, so the ~180MB Chromium puppeteer's postinstall would otherwise pull
   into every build is dead weight.
3. Mount a volume on `app` at `/data/screenshots`.
4. Add a second service from the same repo, set *Config as code* to `railway.browser.json`, give it
   **no variables and no domain**, then point `BROWSER_URL` on `app` at its internal address.
5. Add the `cron-finalize` and `cron-prune` services and give **each** of them `CRON_SECRET`.

**Steps 4 and 5 stay manual on purpose.** The browser service's empty environment is the entire
mitigation for its missing sandbox ([security.md](security.md)), and merging it into `app` would put an
unsandboxed renderer in the same container as `DATABASE_URL` and `ANTHROPIC_API_KEY`. Pointing each
service at its own config file is also what keeps `watchPatterns` meaningful: without it every push to
the app would rebuild `browser` too, and that image reinstalls Chromium from apt each time.

The crons are **two services rather than one command hitting both URLs**: `curl` exits 0 on a non-2xx,
so `curl A && curl B` is really `A; B`, and adding `-f` to fix that would let a failed finalize silently
skip the prune. Separate services also keep the schedules independent, which is the point of the
staggered hour.

`railway.browser.json` carries **no `healthcheckPath`**. CDP's `/json/version` would answer a probe, but
Chrome rejects it unless the prober sends an IP or `localhost`, and a failing healthcheck gates the
deploy — so the line meant to catch a wedged Chromium would instead turn every `browser` deploy into a
rollback. A wedged browser is handled app-side by the connect retry in
[scraping.md](scraping.md#browser-lifecycle-and-the-concurrency-cap).

## Stripe

Two things, both on the Stripe side, and the plan is granted by neither alone:

1. A **webhook endpoint** at `https://<domain>/api/billing/webhook` subscribed to
   `checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted`.
   Its signing secret is `STRIPE_WEBHOOK_SECRET`.
2. A **payment link** charging the price in `STRIPE_PRICE_SOLO`. That link is the whole purchase flow —
   the seller sends it after the call, and nothing in the app links to it. A link on any other price
   takes the payment and leaves the account on `free`.

The signing secret differs between the dashboard's test and live modes and between endpoints, so a
webhook that answers `400 invalid_signature` on every delivery is almost always the wrong secret rather
than a broken route. How the payer is matched to an account, and the one case where the match fails, is
in [api.md](api.md#post-apibillingwebhook).

## The build

Railpack detects Node from `package.json`, installs with npm from `package-lock.json`, runs the
`build` script, and starts with `startCommand` from `railway.json`. Nothing else needs configuring,
but two details are load-bearing:

- **The Node version comes from `engines.node`.** Without it Railpack picks whatever `lts` resolves
  to on the day of the build, which is how a deploy starts failing on a commit that changed nothing.
- **Railpack installs Chromium's apt dependencies whenever it sees `puppeteer` in the dependencies**,
  even though `app` never launches a browser — it connects to the `browser` service over CDP. That is
  build time and image size spent on nothing, and it is not switchable off; `PUPPETEER_SKIP_DOWNLOAD=true`
  only skips puppeteer's own ~180MB Chromium download, not those packages. Live with it rather than
  moving puppeteer to devDependencies, which would break the build.

Railpack does **not** prune devDependencies by default, but do not rely on that — `drizzle-kit` stays
a regular dependency for the reason under [Migrations](#migrations).

## Healthcheck

`healthcheckPath` is `/api/health`: a route that imports nothing and answers `200 ok`.
**It deliberately does not check the database.** Railway queries the path only until
the new deployment goes live and never again, so a dependency check there buys no monitoring — it only
turns a Postgres blip during a release into a rolled-back deploy.

It used to be `/`, and that is the shape of the failure worth remembering: the landing page renders
through the middleware, `auth()` and therefore `db/index.ts`, so a missing `AUTH_SECRET`, an unset
`NEXT_PUBLIC_APP_URL` or an unreachable database turned a healthy container into a failed deploy with
no error pointing at any of them.

Three more things the probe depends on:

- **The route must stay out of the middleware matcher** (`middleware.ts`), or the probe pays a NextAuth
  session check that can throw before it reaches the route.
- **`next start` binds `0.0.0.0` and reads `PORT`**, which is the variable Railway injects and probes.
  Never pass `-p` or `-H` to it.
- **Requests arrive from `healthcheck.railway.app`.** Nothing here filters by host, and nothing should
  start to.

The timeout is 300s, Railway's own default, rather than the 120s that was there before: `preDeployCommand`
migrations plus a cold Next boot are the slow part, and a probe that gives up early looks exactly like
an app that never came up.

## Things that are easy to get wrong

- **`NEXT_PUBLIC_*`, `CSP_ENFORCE` and `DATABASE_URL` are read at *build* time, not just at runtime.**
  Next inlines `NEXT_PUBLIC_*` into the client bundle, `next.config.ts` reads `CSP_ENFORCE` at module
  scope, and `next build` imports every route module to collect page data — which reaches `db/index.ts`,
  so a build with no `DATABASE_URL` fails outright. Railpack builds see the service's variables, so
  setting them on `app` is enough. **This is the single biggest reason the app is not built from a
  hand-written Dockerfile**: there, each one needs an explicit `ARG`, and forgetting one ships an embed
  snippet pointing at `localhost`.
- **An empty variable is not an unset one.** Railway keeps a variable you cleared rather than deleting
  it, so `process.env.X` is `''` and every `??` fallback in the codebase is skipped. `next build` runs
  each route's module scope, so an empty `STRIPE_SECRET_KEY` reaching `new Stripe()` fails the whole
  build on a route nobody touched. Delete the variable instead of blanking it, and guard with `||`.
- **A copied `AUTH_URL` breaks Google sign-in outright, and `AUTH_TRUST_HOST` does not save you.**
  NextAuth's `reqWithEnvURL` rewrites *every* auth request's origin to `AUTH_URL`'s whenever it is set,
  with no `trustHost` involvement, and `createActionURL` prefers it over the request headers. A
  `.env.example` value carried into the deploy makes the `redirect_uri` sent to Google
  `http://localhost:3000/api/auth/callback/google`, which Google rejects as unregistered. Setting
  `AUTH_URL` also makes `AUTH_TRUST_HOST` redundant — `trustHost` is already true from its presence — so
  **the only safe production setting is empty**.
- **`AUTH_TRUST_HOST=true` is required** behind Railway's proxy, or sign-in fails looking like broken
  OAuth.
- **The volume must be writable by the app.** `saveScreenshot` degrades quietly on `EACCES`
  (`/api/report/screenshot` returns `url: null` by design), so a mount the app cannot write shows up as
  reports without previews rather than as an error. Test it by requesting a preview on a real report. A
  **full** volume looks identical, which is what `cron-prune` exists to prevent.
- **Previews expire after `SCREENSHOT_RETENTION_DAYS` (30).** A report link pasted into cold email and
  opened months later shows the preview button again rather than the cached image, and clicking it
  re-renders. That is the intended trade, not a bug — **do not debug a vanished preview as one.** It
  cannot be made least-recently-used instead: serving a file does not touch its `mtime`, and `atime` on
  a network volume is not dependable.
- **`browser` gets no public domain and no TCP proxy.** Anyone who reaches CDP on 9222 controls that
  browser completely, including reading files inside its container.
- **No secrets in project-level shared variables.** Railway propagates those into every service,
  including `browser`.
- **Rate limiting fails open** — see
  [invariants.md](invariants.md#rate-limiting-fails-open-deliberately). Confirm with a real 429 rather
  than by reading the config.
- **Without the `cron-finalize` service, no test ever ends** — see [experiments.md](experiments.md).

## Migrations

Schema changes reach production through `preDeployCommand` in `railway.json`, which runs
`npm run db:migrate` (the committed `db/migrations`) against the new release before any traffic moves to
it. A failed migration aborts the deploy instead of serving against the wrong schema.

`drizzle-kit` is a **regular dependency** rather than a devDependency for exactly this reason: the deploy
step needs it, and a builder that prunes devDependencies would otherwise remove it.

Railway still overlaps the old and new releases, so **write migrations that are safe against the previous
one** — add a column before writing to it, drop it a release later.

## Keeping the browser image patched

Rebuild it periodically. Chrome runs unsandboxed there, so an outdated Chromium is what turns that
trade-off into a real risk.
