# Invariants

The rules that hold across subsystems. **If a sentence would have to appear in two docs, it belongs
here and both link to it.**

Each rule names the surfaces it governs. A change to one of them is a change to all of them.

## Measurement

### Unknown is never reported as negative

`robots.txt` resolves to `found`, `absent`, or `unknown`. An `unknown`, a network failure or an
unreadable response, is excluded from the prompt's findings rather than presented as a missing file
or a block. "We could not check" and "they block AI crawlers" are opposite conclusions.

The same holds for PageSpeed Insights: a failed call stores `null`, and a page with no field data in
the Chrome UX Report has no field card. Neither is shown as a zero.

The site crawl holds it three ways. **A page that timed out or was refused is not a broken page.**
**A crawl whose entry page does not answer a plain fetch is `unknown`**, because the browser already
loaded that page and every status after it would describe the refusal rather than the site. **HTML
built by JavaScript is not judged for titles, headings or words**: a shell has none, and reporting
that would write the crawl's blindness down as the site's fault.

*Governs:* [scraping.md](scraping.md), [readout.md](readout.md), [ai-pipeline.md](ai-pipeline.md)

### Index numbers say where they came from

Backlinks, referring domains, domain rank, rankings and search volumes come from SE Ranking's index,
not from anything this code measured on the site. **Every surface that prints one names the source**:
the backlink and ranking cards carry `readout.index.source`, and the visibility prompt calls them
estimates and forbids promising a position or traffic from them.

**They are counted and never graded.** The `index` group is unscored, and no finding in it carries a
severity other than `ok`, because how many links a site should have, or how many keywords it should
rank for, is not a threshold anybody measured.

A call that failed is `null` and has no card, under the rule above.

*Governs:* [readout.md](readout.md), [ai-pipeline.md](ai-pipeline.md), [analysis-ui.md](analysis-ui.md)

## Generation

### The market is measured from the page, never taken from the UI locale

A `.br` domain or a Portuguese `lang` attribute decides it, and nothing else does. Weaker signals were
left out on purpose. A BRL price appears on plenty of global pricing tables, and marking a US page
Brazilian rewrites the whole analysis around the wrong country.

Pinned to `analyses.market` at creation, for the same reason as `locale`. SE Ranking is asked about the
same market, so the rankings come from the Google the page is written for.

*Governs:* [data-model.md](data-model.md), [ai-pipeline.md](ai-pipeline.md)

### A section shows the audits its errors were written from

`PAGESPEED_CATEGORY_BY_FIX_KIND` is the one list of the Lighthouse categories each error generator is
given, and the report renders those categories inside the section the errors land in: Performance,
Accessibility and Best practices under Structure, SEO under SEO. The robots.txt card sits under AI.
A reader never meets an audit in one place and the error written from it in another.

*Governs:* [readout.md](readout.md), [ai-pipeline.md](ai-pipeline.md), [analysis-ui.md](analysis-ui.md)

### Generated content is pinned to the locale it was written in

Hypotheses and fixes are written in the UI locale the analysis ran in, pinned to `analyses.locale` at
creation. Switching language afterwards never retranslates an existing analysis.

`current_copy` is the exception: it quotes the page's own characters, in whatever language the page is
written in.

*Governs:* [ai-pipeline.md](ai-pipeline.md), [i18n.md](i18n.md)

### `pt-BR` is a rewrite, not a translation

A technical term the Brazilian market uses in English stays in English (LCP, meta description, alt,
CTA, snippet, deploy, landing page, placeholder). Accented characters are **required.**

This is why the prompts' typographic rule restricts **punctuation** (no dashes of any kind, straight
quotes, no ellipsis character, no arrows) and must never be rephrased as "plain ASCII": that silently
forbids the characters Portuguese requires.

*Governs:* [i18n.md](i18n.md), [ai-pipeline.md](ai-pipeline.md)

## Access

### Access is a quota read from the row, written by the subscription or by an operator

What the app knows is `users.monthly_quota` and how many runs the account started this calendar month
(UTC). A new analysis is one run and so is every "Run again". A run that failed does not count against
it, and deleting an analysis does not give its runs back.

**Two things write that number and they never disagree**, because both write it absolutely. The
Mercado Pago webhook writes `PLAN[tier].quota` when it confirms an authorisation, through
`applySubscribedTier`, and an operator writes whatever was agreed from `/admin/accounts`. An absolute
write is also what makes a webhook delivered twice harmless: the same authorisation applied again
lands on the same number. **If either one ever becomes an increment, a re-delivery starts handing out
quota.**

**A cancelled subscription expires on read, not on a schedule.** `quotaFor` reads `entitledTierFor`
beside the row, so an account whose paid month has ended has a limit of zero on its very next request,
rather than whenever a nightly job happened to run. `cancelled` keeps `current_period_end` for exactly
this reason: the month already paid for is honoured. An account with no subscription row keeps
whatever the operator wrote.

**The trial is a one-time credit, not a quota.** `users.trial_runs_left` starts at `TRIAL_RUNS`, is
spent before the monthly quota, and nothing refills it. It is spent by a conditional update inside the
same transaction that inserts the run, so two requests cannot both spend the last one; a run that
failed gives it back, which is why `analysis_runs.trial` records which of the two paid.

**The quota is never in the JWT.** A token lives `SESSION_MAX_AGE_SECONDS`, so a quota stamped into
one is stale the moment an operator changes it. It is read from the row per request, exactly as the
role is.

*Governs:* [api.md](api.md), [data-model.md](data-model.md), [product.md](product.md)

### Entitlement is the stored tier, checked at the boundary

What a tier buys beyond its quota is read from `users.plan_tier`, never from the price the landing
page showed and never from anything the client sent. `canBulkGenerate` in `lib/auth-policy.ts` is the
one predicate, beside `isAdmin` and for the same reason: no call site may inline the comparison.

**It is checked three times, and only the last two are boundaries.** The nav hides the link, the page
answers `notFound()`, and the route re-checks before it enqueues anything. Hiding a link is a
convenience; the route is the gate.

The tier is written only by the subscription webhook, so revoking is what the provider says plus the
period already paid for, exactly as the quota is.

*Governs:* [security.md](security.md), [api.md](api.md), [product.md](product.md)

## Brand

### The agency's brand comes from one resolver, on three surfaces

`brandFor()` in `lib/brand.ts` reads the owner's `brand_name` and `brand_logo_url`, and the three places
Hunch reaches someone holding the report link all answer to it:

1. **The report header**: `ReportBrandMark`, the logo, else the name, else the wordmark.
2. **The metadata**: `pageMetadata`'s `brand`, which replaces the `%s | Hunch` title and the site name.
3. **The OG card**: `OgBrandName` in place of `OgWordmark`. It prints the name and never the logo.

**A surface that keeps Hunch while the others show the agency ships a report that advertises us to the
agency's own client.** With neither column set, all three show Hunch.

*Governs:* [report.md](report.md), [seo.md](seo.md), [data-model.md](data-model.md)

## Security

### A user row may exist before its first sign-in, and only a provider-verified email may claim one

An operator can set a quota for an agency before anyone there has opened the app, so the row has to be
able to exist without a sign-in behind it. `setQuota` is the only writer that does it: insert
`{ email, name: email }` and set the quota. That is the whole provisioning record, and it is why the
sign-in upsert writes `name`, `avatarUrl`, `role` and `lastSignInAt` and **never** the quota.

The other half is the price of keying rows on email with no `accounts` table: **whoever presents that
email next owns everything in the row.** So an OAuth sign-in is refused unless the provider will vouch
for the address. **Each provider declares how, in `VERIFIED_EMAIL`**: a claim read off the profile for
Google, a call to `GET /user/emails` for GitHub, whose OAuth profile carries no such claim. A provider
with no strategy declared is refused.

**The address that keys the row is the verified one, not the one the profile carried.** **Every
failure of the remote check refuses**: a timeout or a 403 from a missing `user:email` scope must not
read as "verified".

*Governs:* [security.md](security.md), [data-model.md](data-model.md), [api.md](api.md)

### `ADMIN_EMAIL` grants the role, `users.role` authorizes the request

Sign-in promotes the row to `admin` when the email matches `ADMIN_EMAIL` (`isAdminEmail`); every request
is then gated on the **stored** role (`isAdmin`), never on the variable. The two halves are separate
functions in `lib/auth-policy.ts` so no call site can confuse them.

**It happens at sign-in, so setting the variable promotes nobody who is already signed in.** The match
ignores case and surrounding whitespace. A mismatch logs.

**`isAdmin` gates `/admin/accounts`, and it is checked three times.** The nav hides the link, the page
answers `notFound()`, and the server action behind the form re-checks before it writes. Only the last
two are boundaries: **a server action is a public POST endpoint that happens to live next to a
component.**

The gate reads the **row**, so revoking with `update users set role = 'user'` takes effect on the next
request rather than the next sign-in, covered by `e2e/admin-accounts.spec.ts`. The promotion is
one-way: removing `ADMIN_EMAIL` revokes nothing.

*Governs:* [security.md](security.md), [data-model.md](data-model.md)

### Rate limiting fails open

A missing `REDIS_URL`, a wrong one, or a Redis that is down means no limit at all, so infrastructure
trouble never becomes an outage. Both paths log.

**A misconfigured `REDIS_URL` looks exactly like a working one.** Confirm with a real `429`, never by
reading the config.

*Governs:* [security.md](security.md), [api.md](api.md), [deployment.md](deployment.md)

### The public routes are CORS-open and must never send credentials

`lib/cors.ts` answers `*`, which is only safe while `Access-Control-Allow-Credentials` is absent:
adding it would expose session-authenticated responses to every origin on the internet. **Never add
it.**

*Governs:* [security.md](security.md)

### Middleware proves a session, not a user row

Every page behind `PROTECTED_PREFIXES` re-checks the user itself, and every `/api` route authenticates
via `getCurrentUser()`. The matcher's exclusion list is a performance detail, not the security
boundary.

*Governs:* [security.md](security.md)

### Every outbound URL is validated before a browser is pointed at it, and again per request

`assertPublicUrl` refuses private, loopback, link-local, CGNAT, unique-local and multicast ranges via
**every** address DNS returns. That check alone is bypassable, so `openGuardedPage` re-applies it to
every request the page makes, which is what closes DNS rebinding and a `302` to the metadata endpoint.

*Governs:* [security.md](security.md), [scraping.md](scraping.md)
