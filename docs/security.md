# Security

## Middleware: `middleware.ts`

Protects `PROTECTED_PREFIXES` (`/dashboard`, `/analyses`, `/admin`) with a NextAuth session check.
`/api/health` and `/api/auth` are excluded from the matcher.

**Middleware gates pages only.** Every `/api` route authenticates itself via `getCurrentUser()`, see
[invariants.md](invariants.md#middleware-proves-a-session-not-a-user-row).

A redirect carries the requested `pathname` **and query string** in `CALLBACK_URL_PARAM`. The sign-in
page revalidates it before use.

## Auth: `auth.ts`

Two OAuth providers: Google always, GitHub whenever `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` are both
set (`githubLoginAllowed()`).

**Registering the GitHub app.** Callback URL `https://<host>/api/auth/callback/github`. `GITHUB_SCOPE`
is passed in `authConfig` because the default omits `user:email`. In production set `AUTH_URL` to this
deploy's own public origin and `AUTH_TRUST_HOST=true`. See [deployment.md](deployment.md).

### Verification fails closed, and each provider declares how it verifies

The user row is keyed on email with no `accounts` table, so **whoever presents an address next owns
whatever is in that row**, the quota included. `VERIFIED_EMAIL` in `lib/constants.ts` names a strategy
per provider, and `verifiedEmailFor()` returns the address that provider will vouch for, or null.

| Provider | Strategy | Why |
| -------- | -------- | --- |
| `google` | claim `email_verified` off the profile | Google emits it and it is authoritative |
| `github` | `GET /user/emails`, primary **and** verified | GitHub emits no such claim, and its `profile.email` is null when the account keeps the address private |

Four things hold, and none may weaken:

- **A provider with no entry is refused.**
- **An absent claim is never read as a verified one.**
- **The address that keys the row is the verified one**, not whatever the profile carried.
- **Every failure of the remote check refuses.** Timeout, 403 from a missing scope, unexpected body.

### The credentials escape hatch

A `Credentials` provider exists **only** for local dev and e2e, behind `credentialsLoginAllowed()`: it
needs both `NODE_ENV !== 'production'` **and** `ALLOW_CREDENTIALS_LOGIN=1`. Credentials are compared
through `secretsMatch()` (`lib/secure-compare.ts`), which hashes both sides and uses
`timingSafeEqual`. Sign-in attempts are rate limited per IP.

### The user row is upserted in one statement

Never read-then-written, so two concurrent first sign-ins cannot race into the unique constraint. The
OAuth branch re-syncs `name` and `avatarUrl` from the provider and **never touches `monthly_quota`**:
the quota may already be waiting on a row an operator provisioned, see
[invariants.md](invariants.md#a-user-row-may-exist-before-its-first-sign-in-and-only-a-provider-verified-email-may-claim-one).

### `callbackUrl` is an allowlist, not a sanitizer

`safeCallbackUrl()` accepts **one leading slash and nothing else**. `//evil.com` and `/\evil.com` are
refused; anything rejected falls back to `POST_SIGNIN_REDIRECT`.

### `getCurrentUser()` is `cache()`d

The `jwt` callback queries `users` on every token decode, so an uncached helper cost one query per
caller.

### Every page re-checks

**`/admin/accounts` is the one operator screen**, gated three times: the nav hides the link, the page
answers `notFound()`, and `setQuotaAction` re-checks before it writes. Only the last two are
boundaries. See
[invariants.md](invariants.md#admin_email-grants-the-role-usersrole-authorizes-the-request).

## Outbound request guard: `lib/url-guard.ts`

Scraping points a browser at a URL the user chose, and the result is read back to them. **That makes
an unguarded `page.goto` a read-SSRF, not a blind one.**

`assertPublicUrl(raw)` throws `UnsafeUrlError` unless the URL is `http(s)`, on an allowed port, and
resolves, via **every** address DNS returns, to a public one. `POST /api/analyses` maps it to `422`.
`openGuardedPage()` re-applies it per request, see
[invariants.md](invariants.md#every-outbound-url-is-validated-before-a-browser-is-pointed-at-it-and-again-per-request).

PageSpeed Insights loads the page from Google's servers, not ours, so it needs no guard of its own; the
URL has already passed `assertPublicUrl` when the analysis was created.

### The browser service holds no credentials

The deployed browser passes `--no-sandbox` in `Dockerfile.browser`, because Docker's default seccomp
profile blocks the syscalls Chrome's sandbox needs and Railway does not support a custom profile.
**What makes it survivable is the browser service having no environment variables at all.** No secret
may live in project-level shared variables, which Railway propagates into every service.

## Uploads: `POST /api/brand` and `app/brand/[file]/route.ts`

The agency logo is the only file this product accepts.

- **The type is sniffed from the leading bytes** against `BRAND_LOGO_SIGNATURES`. The declared
  `Content-Type` is the caller's to choose and decides nothing.
- **SVG is deliberately absent and must not be added.** The file is served from our own origin, and an
  SVG can carry `<script>`: accepting one would be stored XSS on the domain that holds the session.
- **The stored name is a fresh uuid and its extension comes from the sniff**, so
  `brandLogoContentType()` derives the response header from a name the caller never controlled.
- **`brandLogoPath()` in `lib/brand-assets.ts` is the only way from a request to a file.** It refuses
  any name that does not match `BRAND_FILENAME_PATTERN` and any path that resolves outside `BRAND_DIR`,
  and the serving route answers `404` for both.
- The size is capped at `BRAND_LOGO_MAX_BYTES` and the route is rate limited as `brand`, because each
  accepted call writes to the volume.

## Rate limiting: `lib/rate-limit.ts`

Backed by Redis over `ioredis`. The window is a **sorted set per (kind, identifier)**, evaluated by one
Lua script so the prune, the count and the insert cannot interleave. The client is cached on
`globalThis`. The offline queue is left on, bounded by `commandTimeout`, so a limiter never fails open
during startup and never makes a request hang.

`enforceRateLimit(kind, identifier)` returns a `429` with `Retry-After` or `null`. Kinds are
`RATE_LIMIT_KIND`; windows live in `RATE_LIMITS`. **It fails open**, see
[invariants.md](invariants.md#rate-limiting-fails-open). Identity is the user id on authenticated
routes and the client IP on sign-in. `clientIp()` reads the leftmost `x-forwarded-for` value.

## CORS: `lib/cors.ts`

See [invariants.md](invariants.md#the-public-routes-are-cors-open-and-must-never-send-credentials).

## Security headers: `next.config.ts`

HSTS, `nosniff`, `DENY` framing, `Referrer-Policy` and `Permissions-Policy` on every route.

The CSP ships as `Content-Security-Policy-Report-Only` until `CSP_ENFORCE=1`: Next inlines its
bootstrap script and Tailwind inlines styles, so the policy needs `'unsafe-inline'` without a nonce.
**Report-only collects nothing**, so confirm the policy by flipping a build to `CSP_ENFORCE=1`, never
by reading console messages.

No page loads anything from a third party, so the policy names no external host except Google avatars
in `img-src`, and `frame-src` is `'none'`.
