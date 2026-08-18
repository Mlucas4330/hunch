# Security

## Middleware — `middleware.ts`

Protects `/dashboard`, `/analyses` and `/admin` with a NextAuth session check (`PROTECTED_PREFIXES`).
`/billing` left that list when the page did.

Excluded from the matcher:

| Prefix | Why |
| ------ | --- |
| `/api/billing/webhook` | Stripe calls it directly |
| `/api/waitlist`, `/api/report` | they back the public report, read by prospects with no session |
| `/api/cron` | driven by the cron services, authenticated by `CRON_SECRET` |
| `/api/health` | Railway's deploy probe, which must not depend on a session check — see [deployment.md](deployment.md#healthcheck) |

**Middleware gates pages only.** Every `/api` route authenticates itself via `getCurrentUser()`, so
the exclusion list is a performance detail, not the security boundary — see
[invariants.md](invariants.md#middleware-proves-a-session-not-a-user-row).

A redirect carries the requested `pathname` **and query string** in `CALLBACK_URL_PARAM`, so a link
into a filtered view survives sign-in. The sign-in page revalidates it before use.

## Auth — `auth.ts`

Google OAuth is the real sign-in path. Microsoft Entra ID is an optional second one, for buyers whose
company runs on Microsoft 365.

### Microsoft Entra ID is opt-in, per deploy

`microsoftLoginAllowed()` (`lib/auth-policy.ts`) is true only when both `AUTH_MICROSOFT_ENTRA_ID_ID`
and `AUTH_MICROSOFT_ENTRA_ID_SECRET` are set, and it gates **both** the provider in `auth.config.ts`
and the button on the sign-in page — a deploy without the pair behaves exactly as before.

The issuer defaults to `ENTRA_ISSUER`, the `organizations` endpoint, so personal Microsoft accounts
are not an entry point; `AUTH_MICROSOFT_ENTRA_ID_ISSUER` overrides it. This stays multi-tenant, which
is the point: Auth.js re-runs discovery against the tenant in the `id_token`'s own `tid` claim, so
every customer signs in from their own tenant against one app registration.

Two things the code cannot enforce, and the app registration must:

- **`xms_edov` must be issued as an optional claim.** It is the rule below; without it every Microsoft
  sign-in is refused.
- **`email` must be issued too**, or `user.email` arrives empty and the sign-in is refused anyway.

### The verified-email claim fails closed

The `signIn` callback refuses an OAuth profile unless `providerVerifiedEmail()` says the provider
itself vouched for the address. User rows are keyed on email and there is no `accounts` table, so that
claim is the only thing between a provider's assertion and an existing row. An **absent** claim counts
as unverified: "the provider did not say it is verified" and "the provider said it is not" carry the
same risk here. See
[invariants.md](invariants.md#a-user-row-may-exist-before-its-first-sign-in-and-only-a-provider-verified-email-may-claim-one).

The claim differs per provider and lives in `VERIFIED_EMAIL_CLAIM` (`lib/constants.ts`), typed
`Record<OAuthProvider, string>` so a provider added to the enum has to name one:

| Provider | Claim | Why that one |
| -------- | ----- | ------------ |
| `google` | `email_verified` | `GoogleProfile` types it as a required `boolean`, so this costs a real sign-in nothing |
| `microsoft-entra-id` | `xms_edov` | Entra ID does not emit `email_verified`, and its `email` claim is whatever the tenant admin typed — including a **victim's** address in a tenant the attacker owns. `xms_edov` is the claim that says the tenant proved it owns the domain, and it is the only thing standing between that tenant and an existing row |

A provider id that is not in the map returns `false`, so adding one to `authConfig` without deciding
its claim locks it out rather than letting it in. Never weaken this to "the claim is not `false`".

Sessions are JWTs with `SESSION_MAX_AGE_SECONDS` — they cannot be revoked server-side, so lifetime is
the only bound on a stolen token.

### The credentials escape hatch

A `Credentials` provider exists **only** for local dev and e2e, behind `credentialsLoginAllowed()`
(`lib/auth-policy.ts`): it needs both `NODE_ENV !== 'production'` **and** an explicit
`ALLOW_CREDENTIALS_LOGIN=1`. `NODE_ENV` alone was never a deploy boundary — the e2e server and any
staging container run as `development` while still being reachable. The sign-in page reads the same
predicate, so the form is never offered when it cannot work.

Credentials are compared through `secretsMatch()` (`lib/secure-compare.ts`), which hashes both sides and
uses `timingSafeEqual` — never `!==`. The cron route's `CRON_SECRET` check uses the same helper. Sign-in
attempts are rate limited per IP.

### The user row is upserted in one statement

Never read-then-written: two concurrent first sign-ins would otherwise both find no row and race into
the `users.email` unique constraint, failing a login that was perfectly valid.

The OAuth branch uses `onConflictDoUpdate` and re-syncs `name` and `avatarUrl` from the provider, which
owns them — so a user who changes their photo at Google sees it on the next sign in. `plan`, the usage
counters and the Stripe ids are ours and are never touched there. A provider that omits the photo leaves
the stored one alone rather than blanking it.

The credentials branch updates `lastSignInAt` and nothing else, so the local hatch can never overwrite a
real user's name with `Admin`.

The row may already exist without anyone ever having signed in to it — the operator granted a plan, or
the Stripe webhook created it for a payer. That is deliberate, and it is why the upsert above never
touches `plan`: see
[invariants.md](invariants.md#a-user-row-may-exist-before-its-first-sign-in-and-only-a-provider-verified-email-may-claim-one).

### `callbackUrl` is an allowlist, not a sanitizer

It reaches NextAuth's `redirectTo`, which makes it attacker-controlled, so it passes through
`safeCallbackUrl()` (`lib/auth-policy.ts`) first: **one leading slash and nothing else**. `//evil.com`
and `/\evil.com` are protocol-relative URLs a browser resolves off-site, so both are refused along with
anything carrying a scheme; anything rejected falls back to `POST_SIGNIN_REDIRECT`.

Losing a deep link is a nuisance; honouring one is an open redirect. Both `e2e/core.spec.ts` cases exist
to keep that true.

### `getCurrentUser()` is `cache()`d

`auth()` is not itself memoized and the `jwt` callback queries `users` on **every** token decode, so an
uncached helper cost one query per caller — and a signed-in render has several. `Navbar` consumes the
same helper rather than calling `auth()` itself, which collapses a page view to one `jwt` query plus one
lookup by id.

### Every page re-checks

`redirect('/auth/signin')` on the user's own pages, `notFound()` under `/admin`. `/admin` is gated in
`app/(app)/admin/layout.tsx` via `isAdmin()`, so a page added under that segment is operator-only by
default — and `/admin/leads`, `/admin/reports` and `/admin/accounts` repeat the check, because the
waitlist rows, owner emails and account rows they show are third-party PII.

`grantPlan` (`lib/actions/admin.ts`) is the one privileged **mutation** an operator has, and it
authorizes itself the same way. A server action is its own endpoint, reachable by anyone who can post
its action id — the layout that rendered the form is not in that path and proves nothing about the
caller.

`isAdmin()` reads `users.role`, which sign-in granted from `ADMIN_EMAIL` — see
[invariants.md](invariants.md#admin_email-grants-the-role-usersrole-authorizes-the-request) for why the
grant and the gate are separate, and for how the role is revoked.

## Outbound request guard — `lib/url-guard.ts`

Scraping points a browser at a URL the user chose, and the result is read back to them through the
dashboard and the public report. **That makes an unguarded `page.goto` a read-SSRF, not a blind one.**

`assertPublicUrl(raw)` throws `UnsafeUrlError` unless the URL is `http(s)`, on an allowed port, and
resolves — via **every** address DNS returns, not just the first — to a public one. Private, loopback,
link-local, CGNAT, unique-local and multicast ranges are all refused, as are `.localhost`, `.local` and
`.internal`. `POST /api/analyses` maps `UnsafeUrlError` to `422`, distinct from a `502` scrape failure.

That check alone is bypassable, so `openGuardedPage()` re-applies it per request — see
[invariants.md](invariants.md#every-outbound-url-is-validated-before-a-browser-is-pointed-at-it-and-again-per-request).
It also caps response bytes and drops resource types a text scrape does not need.

### The browser service holds no credentials

`PUPPETEER_ALLOW_NO_SANDBOX` only affects the in-process launch, so it is irrelevant in production where
the app connects rather than launches. The deployed browser passes `--no-sandbox` in
`Dockerfile.browser`, because Chrome's sandbox needs user namespaces whose syscalls Docker's default
seccomp profile blocks, and Railway does not support attaching a custom profile. **On a host that does,
that profile is the fix — not the flag.**

What makes it survivable is the browser service having **no environment variables at all**: an escaped
renderer holds no DB URL and no API key. Railway propagates project-level shared variables into every
service, so a secret defined there instead of on `app` would quietly undo this. The second control is
keeping the image rebuilt so Chromium stays patched.

Lifecycle and the concurrency cap are in [scraping.md](scraping.md).

## Serving screenshots — `app/screenshots/[file]/route.ts`

Previews live on a volume rather than in `public/`, so the app serves them; behind a proxy with access
to that volume this route would not exist.

The filename comes from an unauthenticated caller, and `screenshotPath(file)` in `lib/screenshots.ts` is
the single function that turns one into a path on disk. It **allowlists** against
`SCREENSHOT_FILENAME_PATTERN` (the exact shape `saveScreenshot` writes, which admits no separator and no
dot segment) rather than sanitizing — stripping `..` keeps losing to encoding tricks — then checks
containment against `SCREENSHOT_DIR` as a second lock, and returns `null` on any of those failing plus
on the variable being unset.

It lives in `lib/screenshots.ts` rather than in the route because `deleteScreenshot` and the prune job
need the identical check. **Never re-implement it at a call site**: a security check with four copies is
a check that will drift, and this route's `404` (a miss and a malformed name answer identically, so
nothing reveals what the directory holds) depends on the resolver being the only way in.

## Serving brand logos — `app/brand/[file]/route.ts`

The same shape as the screenshot route above, against `BRAND_DIR` and `BRAND_FILENAME_PATTERN`, with
`brandLogoPath()` in `lib/brand-assets.ts` as the one resolver. It is a **separate directory from
`SCREENSHOT_DIR`**, and that is an availability requirement rather than a security one: the prune cron
deletes everything older than `SCREENSHOT_RETENTION_DAYS`, so a logo stored there would delete itself
weeks later and quietly return a paid agency's report to anonymous.

### The upload accepts PNG and JPEG only, sniffed from the bytes

`POST /api/brand` reads the leading bytes and matches them against `BRAND_LOGO_SIGNATURES`. The
declared `Content-Type` is chosen by the caller and decides nothing.

**SVG is deliberately absent and must not be added.** These files are served from our own origin, and
an SVG can carry `<script>`; accepting one would be stored XSS on the domain that holds the session
cookie. Anything that does not match a signature is rejected rather than stored and sorted out later.

The extension in the stored filename comes from the sniff, not from the upload, so
`brandLogoContentType()` can derive the response header from a name the caller never controlled.

## Rate limiting — `lib/rate-limit.ts`

Distinct from the plan quotas: those are what a tier allows, these are what the infrastructure will
absorb. Backed by Redis over `ioredis` (`REDIS_URL`), because more than one app instance can serve the
same visitor.

The window is a **sorted set per (kind, identifier)**, evaluated by one Lua script so the prune, the
count and the insert cannot interleave between two callers — a read-then-write in application code would
let two simultaneous requests both see the count below the limit. Members are a fresh uuid per request,
so two hits in the same millisecond do not collide into one. The script returns when the oldest hit in
the window expires, which is what `Retry-After` is computed from.

**The client is cached on `globalThis`**: Next re-evaluates modules on every edit in dev, and a new
connection per reload exhausts Redis' client limit within an afternoon.

**The offline queue is left on.** With it off and no connection yet, every check during startup silently
allowed the request — a limiter failing open exactly when a burst is most likely. So the first commands
wait for the handshake instead, and `commandTimeout: 1_000` (plus `connectTimeout: 2_000` and
`maxRetriesPerRequest: 1`) is the hard bound that keeps that queue from becoming a stall when Redis is
genuinely down: **a rate limiter must never be the thing that makes a request hang.** Its `error` event
is handled, because an unhandled one on an ioredis client takes the process down.

`enforceRateLimit(kind, identifier)` returns a `429` with `Retry-After` or `null`, so a guarded route
reads as one early return. Kinds are the `RATE_LIMIT_KIND` enum; windows live in `RATE_LIMITS`, so a
kind without a window fails typecheck. It **fails open** — see
[invariants.md](invariants.md#rate-limiting-fails-open-deliberately).

**Identity** is the user id on authenticated routes, the IP on `waitlist`, the embed key on
`track/config` (one landing page's traffic arrives from many addresses), and key + IP on `track/event`
and `report/screenshot`.

`clientIp()` reads the **leftmost** value of `x-forwarded-for`: Vercel sets that header from the edge
and Railway's proxy does the same, so the client entry is first. Getting this backwards makes the limit
trivially bypassable. It falls back to a shared bucket rather than to no limit at all.

## CORS — `lib/cors.ts`

The public report is read from domains we do not know in advance, so the wildcard is the point. See
[invariants.md](invariants.md#the-public-routes-are-cors-open-and-must-never-send-credentials).

## Security headers — `next.config.ts`

HSTS, `nosniff`, `DENY` framing, `Referrer-Policy` and `Permissions-Policy` are enforced on every route.

The CSP ships as `Content-Security-Policy-Report-Only` until `CSP_ENFORCE=1`: Next inlines its bootstrap
script and Tailwind inlines styles, so the policy needs `'unsafe-inline'` without a nonce, and shipping
it enforced-but-wrong breaks the app.

`img-src` names the only third-party origin left (Google avatars). `js.stripe.com`, `api.stripe.com`
and `hooks.stripe.com` were dropped with the embedded checkout, and `frame-src` is `'none'` — the app
loads no third-party frame at all. Re-adding a Stripe origin would mean the buyer pays inside our page
again, which is a product decision, not a header tweak — see
[invariants.md](invariants.md#there-is-no-self-serve-checkout-and-no-published-price).
