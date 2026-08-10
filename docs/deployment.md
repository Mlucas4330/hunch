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
| `cron-finalize` | `railway.cron-finalize.json` (*Config as code*, set by hand) | calls `/api/cron/finalize-experiments` |
| `cron-prune` | `railway.cron-prune.json` (*Config as code*, set by hand) | calls `/api/cron/prune-screenshots`; own hour so the two never hit `app` together |

Every service but the plugins is the **same repo** pointed at a different config file. The schedules
live in `deploy.cronSchedule` in those files rather than in the dashboard, so a changed cron time
arrives as a diff.

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
   **no variables and no domain**, then set `BROWSER_URL` on `app` to
   `http://${{browser.RAILWAY_PRIVATE_DOMAIN}}:9222` — as a reference, and with both the `http://`
   and the `:9222` spelled out. See [scraping.md](scraping.md#browser-lifecycle-and-the-concurrency-cap)
   for what each half of that value is load-bearing for.
5. Add `cron-finalize` and `cron-prune`, both from the same repo, pointed at
   `railway.cron-finalize.json` and `railway.cron-prune.json`. Give **each** of them these two, as
   references rather than copies:

   ```
   CRON_SECRET = ${{ app.CRON_SECRET }}
   APP_URL     = https://${{ app.RAILWAY_PUBLIC_DOMAIN }}
   ```

**Steps 4 and 5 stay manual on purpose.** Railway creates one service per import and the config path
is a dashboard setting, so nothing in the repo can create a service or choose its own file. The
browser service's empty environment is also the entire mitigation for its missing sandbox
([security.md](security.md)), and merging it into `app` would put an unsandboxed renderer in the same
container as `DATABASE_URL` and `ANTHROPIC_API_KEY`. Pointing each service at its own config file is
what keeps `watchPatterns` meaningful: without it every push to the app would rebuild `browser` too,
and that image reinstalls Chromium from apt each time.

**Reference the two cron variables, never retype them.** A hand-copied `CRON_SECRET` that drifts from
`app`'s is the likeliest way this breaks, and it fails as a `401` that looks like a broken route.
`APP_URL` is a per-environment origin under the same rule as step 2, which is exactly why it is a
variable instead of a literal in the committed start command.

The crons are **two services rather than one command hitting both URLs**: `curl` exits 0 on a non-2xx,
so `curl A && curl B` is really `A; B`, and adding `-f` to fix that would let a failed finalize silently
skip the prune. Separate services also keep the schedules independent, which is the point of the
staggered hour — and they are what makes `--fail-with-body` in `scripts/cron-call.sh` safe, so a `401`
or a `500` surfaces as a failed run instead of a green one.

## The browser image

`Dockerfile.browser` is Chromium plus `scripts/browser-entrypoint.sh`, which starts a `socat`
forwarder on 9222 and then `exec`s Chrome on **9223**, loopback. Chrome is never asked to bind the
reachable address, and that is deliberate:

- **`--remote-debugging-address` binds one family.** `0.0.0.0` is IPv4 only, and Railway's internal
  DNS answers with IPv6, so the app's connect is refused by a container that looks perfectly healthy.
  `socat` listens on v6 with `ipv6only=0` and therefore answers both, whichever family `lookup()`
  happens to pick.
- **Chrome ignores the flag often enough to matter.** It came up on `127.0.0.1` regardless, and the
  only evidence was one line in the browser service's log.

**`DevTools listening on ws://127.0.0.1:9223` is now the healthy line** — loopback and 9223 are what
the script asks for. Read the log for the port, not the address: a `9222` there means the entrypoint
was bypassed. Everything else in that log (dbus, GCM `PHONE_REGISTRATION_ERROR`, Vulkan `Found no
drivers`) is noise from running a desktop browser in a bare container, and none of it breaks CDP.

The app never learns about 9223: Chrome builds `webSocketDebuggerUrl` from the `Host` header it
receives, so it echoes back the address that arrived through the forwarder. That is the same
mechanism as the rebinding guard in [scraping.md](scraping.md#browser-lifecycle-and-the-concurrency-cap).

**A custom start command in the dashboard overrides the `ENTRYPOINT` and undoes all of this**,
silently. It is the first thing to check when the log says `127.0.0.1` after a rebuild.

`railway.browser.json` carries **no `healthcheckPath`**. CDP's `/json/version` would answer a probe, but
Chrome rejects it unless the prober sends an IP or `localhost`, and a failing healthcheck gates the
deploy — so the line meant to catch a wedged Chromium would instead turn every `browser` deploy into a
rollback. A wedged browser is handled app-side by the connect retry in
[scraping.md](scraping.md#browser-lifecycle-and-the-concurrency-cap).

## The cron image

`Dockerfile.cron` is `curlimages/curl` at a pinned tag plus `scripts/cron-call.sh`. It builds an image
that adds nothing to its base, and it exists only because a service needs *something* to build —
without a Dockerfile, Railpack would build the whole Next app to run one `curl`.

The call is a **script rather than an inline start command**, because Railway runs a custom start
command for a Dockerfile service **in exec form, without a shell**. `curl -H "Authorization: Bearer
$CRON_SECRET"` written straight into `startCommand` sends curl those fourteen literal characters and
gets a `401` — indistinguishable, in the logs, from a secret that is actually wrong. The script takes
the route as `$1`, so both services share it and differ only in `startCommand` and `cronSchedule`.

`restartPolicyType` is **`NEVER`** on both. A cron container is expected to exit; `ON_FAILURE` would
turn one failed call into a restart loop against `app`. Railway also **skips** a scheduled run whose
predecessor is still going, and guarantees no better than a few minutes' accuracy, which is why these
are daily jobs and not a substitute for anything time-sensitive.

## Stripe

Two things, both on the Stripe side, and the plan is granted by neither alone:

1. A **webhook endpoint** at `https://<domain>/api/billing/webhook` subscribed to
   `checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted`.
   Its signing secret is `STRIPE_WEBHOOK_SECRET`.
2. A **payment link** charging the price in `STRIPE_PRICE_ID`. That link is the whole purchase flow —
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
- **`scripts/cron-call.sh` and `scripts/browser-entrypoint.sh` must stay LF.** They run inside Linux
  containers, and a CRLF committed from a Windows checkout makes `sh` read the trailing `\r` as part
  of the last argument — a malformed-URL failure in one, a rejected Chrome flag in the other, neither
  pointing anywhere near line endings. `.gitattributes` pins `*.sh`; do not remove it.
- **`railway.json`'s `watchPatterns` negations are load-bearing.** They exist so a push touching only
  `Dockerfile.browser`, `Dockerfile.cron`, `scripts/cron-call.sh` or a `railway.*.json` does not
  redeploy `app`. `railway.*.json` deliberately does not match `railway.json` itself, which must keep
  triggering a deploy so its own changes take effect.
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
