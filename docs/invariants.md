# Invariants

The rules that hold across subsystems. **If a sentence would have to appear in two docs, it belongs
here and both link to it** — everything below was previously written two to four times, in wordings
that had already started to drift.

Each rule names the surfaces it governs. A change to one of them is a change to all of them.

## Measurement

### A number reaches the reader through code, never through a token a model wrote

This is the one line separating the measured readout from every other claim the product makes.
`lib/readout.ts` counts facts off the scraped page — form fields, above-fold CTAs, images with no alt
text, LCP, transferred bytes — and emits `{ id, group, severity, value, unit }` with **no prose**. The
sentence lives in `dictionary.readout.findings[id]` and the value is interpolated into it.

**Nothing generated is ever presented as a measurement.** That is the whole of the rule, and the
direction it runs in matters: measurements *do* go into prompts, and always have —
`generatePlaybook` serializes `PageStructure` whole, `generateVisibility` gets `PageSeo`,
`CrawlerAccess` and the keyword terms. This line used to claim the opposite, which was never true of
the code and made the real rule easy to misread as a ban on grounding a prompt in what was counted.

What a model may then *say* about those numbers is a separate rule, one section down.

*Governs:* [readout.md](readout.md), [ai-pipeline.md](ai-pipeline.md), [analysis-ui.md](analysis-ui.md)

### The readout says what was counted, never what it will produce

"Your LCP is 4.2s" is a measurement. "This is costing you 12% of signups" is a prediction nobody
measured, and it is the sentence that burns the report's credibility the first time it does not come
true. No copy anywhere may state what a number will produce.

The load numbers additionally declare their own limits: they are measured from the deploy's network,
so they are a **floor** a real visitor never beats, and `transferredBytes` renders behind
`readout.atLeast` because `SCRAPE_ALLOWED_RESOURCE_TYPES` blocks media.

*Governs:* [readout.md](readout.md), [scraping.md](scraping.md)

### A generated `evidence` carries a number only from a page this code measured

No percentage, no lift figure, no count of what other companies do, no "studies show". The default is
that a generation call has exactly one measurement — the readout of the page in front of it — so a
number in `evidence` is invented by construction. The prompts require the CRO mechanism instead.

**It governs all three `evidence` fields**: the flow fix, the visibility fix, and the variant.

**The one exception is a page the reader named**, and its shape is the whole reason it is safe. When
a competitor URL is supplied, `measureCompetitor` scrapes that page and `lib/readout.ts` counts the
same facts off it. The argument that makes a number "invented by construction" — that no such
measurement exists — stops being true for that page and for no other. So `evidence` may cite a figure
from **that readout**, and:

- **never a number that is not in it.** Not about a third page, not about "companies in this space",
  not a figure about the named page that the readout does not carry.
- **never a company name.** The readout carries a hostname the reader typed, and the prompts refer to
  the page by that hostname alone. A brand name would be inferred from the page's contents, and an
  inferred name is an invented one.
- **never a claim that the other page performs better.** Nobody measured either page's conversion,
  traffic or ranking. Two pages differing is not one page winning, and closing a gap is not a result —
  that is the delta rule below, applied across pages instead of across time.

This is narrower than what was here before the pivot, and deliberately inverted. The old competitor
research had a model *recall* what competitors do, which is why removing it removed the exception
with it. What came back is the opposite direction: the reader points, this code measures, and the
number is a measurement rather than a recollection. The rules live in `competitorRules` in
`lib/ai/prompt.ts`, shared by every prompt that receives a competitor for the same reason
`marketRules` is — the risk is identical in all of them and must not drift into three wordings.

The corpus escape hatch is still gone, and re-adding one would need this same test: does this code
measure the thing the number describes?

This is a different rule from the two above and they never share a sentence: this governs what a
model may **assert**, those govern what a measurement may **state**.

*Governs:* [ai-pipeline.md](ai-pipeline.md)

### A delta is arithmetic between two measurements, never a result attributed to a change

`page_snapshots` makes it possible to say "LCP is 2.1s lower than last week". That sentence is
subtraction over two numbers this code measured, so it is allowed.

**"Your fix cut LCP by 2.1s" and "the rewrite lifted conversion" are not.** Nobody controlled for
anything between the two measurements — the page may have changed ten times, or not at all while the
CDN did. The readout may state that a number moved and when, and **nothing here may say what moved
it**: attributing a change to a cause needs a controlled experiment, and this product runs none.

The product used to carry a live A/B testing stage, and that stage was the one place a causal
sentence would have been earned. It is gone — see [product.md](product.md) — so the rule is no longer
"only an experiment may say it" but simply "nothing says it".

**The weekly monitoring email is the surface where this rule bites hardest**, and it is the reason
the rule needed restating rather than just citing. That email exists to report a delta to somebody
paying to be told about it, which is exactly the moment the tempting sentence is "your change
worked". It may not say that, and it must not learn to: it lists which numbers moved and by how
much, and carries a line saying in as many words that two measurements a week apart report what
changed and not what changed it. `deltas()` in `lib/snapshots.ts` emits values, never prose, for the
same reason `lib/readout.ts` does.

**It fires only on a regression, and that is a separate rule from what it may say.** `regressions()`
returns a finding whose severity crossed, or a score that fell by `REGRESSION_SCORE_DROP`, and
`isWorthReporting()` is the single definition of "got worse" so no second surface can invent its own.
The reasoning is not about accuracy, it is about attention: a push interrupts somebody, and a weekly
message saying two numbers drifted teaches a subscriber to filter the only message this product
sends. An improvement is still measured, still written, and still shown on the report — it is simply
not worth an interruption. **The narrowing changes nothing about the prohibition above**: a
regression report may say a number got worse and still may never say what made it worse.

*Governs:* [readout.md](readout.md), [report.md](report.md), [api.md](api.md)

### Keywords measure the page's own words, never the index

`lib/keywords.ts` counts terms in the copy that was scraped and reports where each already appears —
title, H1, meta description, headings. That is a fact about one page, countable by code.

**Search volume, keyword difficulty and ranking potential are none of those things.** They come from a
clickstream and a SERP index we do not have, so any such number would be invented at the moment it was
printed. This is the same rule as the one below applied to a different noun, and it is why the keyword
table has a "times said" column and never a "searches per month" one.

*Governs:* [readout.md](readout.md), [ai-pipeline.md](ai-pipeline.md)

### The audit measured the page, not the index

A visibility finding never promises a ranking or a citation, never estimates traffic, and never says
whether any model currently mentions the product — none of that was measured. Its `evidence` argues
the mechanism (a crawler cannot read a price that exists only inside an image), under the
no-quantitative-claim rule above.

The UI copy carries the same limit and must not be softened into a claim the audit cannot support.

*Governs:* [ai-pipeline.md](ai-pipeline.md), [analysis-ui.md](analysis-ui.md)

### Unknown is never reported as negative

`robots.txt` resolves to `found`, `absent`, or `unknown`. An `unknown` — a network failure or an
unreadable response — is excluded from the prompt's findings rather than presented as a missing file
or a block. "We could not check" and "they block AI crawlers" are opposite conclusions.

*Governs:* [scraping.md](scraping.md), [ai-pipeline.md](ai-pipeline.md)

## Generation

### The market is a filter on what may be recommended, never a fact the model knows

The analysis measured one page and nothing about any country. A prompt may rule an idea **out** (do
not offer a Brazilian founder a trust seal nobody there recognizes) but may never state what buyers
in a market expect, prefer, or do. That claim is invented exactly like a number in `evidence`.

`marketRules(market)` in `lib/ai/prompt.ts` is shared by every prompt that receives a market, because
the risk is identical in all of them and must not be phrased three ways.

*Governs:* [ai-pipeline.md](ai-pipeline.md)

### The market is measured from the page, never taken from the UI locale

A `.br` domain or a Portuguese `lang` attribute decides it, and nothing else does. Weaker signals were
deliberately left out — a BRL price appears on plenty of global pricing tables — because the two
directions of error are not symmetric. Missing a Brazilian page costs one recommendation phrased for
the wrong country; marking a US page Brazilian rewrites the whole analysis around the wrong country
and shows the reader nothing that explains it.

Pinned to `analyses.market` at creation, for the same reason as `locale`.

*Governs:* [data-model.md](data-model.md), [ai-pipeline.md](ai-pipeline.md)

### Generated content is pinned to the locale it was written in

Hypotheses, variant copy, rationales and flow fixes are written in the UI locale the analysis ran in,
pinned to `analyses.locale` at creation. Switching language afterwards never retranslates an existing
analysis, and the on-demand alternates read the **stored** locale rather than the current one, so a
hypothesis and its alternates are always in the same language.

`current_copy` is the exception: it quotes the page's own characters, in whatever language the page is
written in, because the embed matches on it.

*Governs:* [ai-pipeline.md](ai-pipeline.md), [i18n.md](i18n.md)

### `pt-BR` is a rewrite, not a translation

A technical term the Brazilian market uses in English stays in English (LCP, meta description, alt,
CTA, snippet, deploy, landing page, placeholder). Accented characters are **required** — the whole
`metadata` subtree once shipped stripped of them, which is the browser tab and the unfurl.

This is why the prompts' typographic rule restricts **punctuation** (no dashes of any kind, straight
quotes, no ellipsis character, no arrows) and must never be rephrased as "plain ASCII": that silently
forbids the characters Portuguese requires.

*Governs:* [i18n.md](i18n.md), [ai-pipeline.md](ai-pipeline.md)

## Product surfaces

### Credits are granted by one internal path, and no provider code touches the tables

A provider adapter verifies a payment and works out what it bought. **`grantCredits` is the only
thing that moves a balance**, and `spendCredit` / `refundCredit` the only things that move it back.

This is the load-bearing decision, and it is not tidiness. Stripe may not be able to charge in BRL
without a registered company, which makes a second provider a matter of when rather than if. Written
the other way round — a webhook that knows how to add credits — plugging in the second one means
reimplementing idempotency, row creation and the ledger a second time, and the two copies drift the
first time one is fixed.

Four rules hold the money side together:

- **Idempotency is keyed on the payment, not on the message about it.** `payment_events` claims the
  delivery so a retry does no work twice; the unique on `(provider, provider_ref)` claims the payment
  so even a delivery that slipped past the first guard cannot credit twice. The second is the
  guarantee that matters. A claim that outlives a **failed** handling is the mirror-image bug — every
  retry then answers `duplicate` and the paid credit is lost for good — so the Mercado Pago route
  releases its claim before answering `500`.
- **Spend before the work, refund if the work fails.** The other order hands out a free analysis
  whenever something crashes between the two, and nothing afterwards can tell which happened.
  `AnalysisOutputSchema`'s `.min(5)` deliberately does not degrade, so "paid for a Sonnet call and got
  nothing" is a real path.
- **The balance is never in the JWT.** A token lives `SESSION_MAX_AGE_SECONDS`, so a balance stamped
  into one is stale the instant something is bought or spent — free credit in one direction, credit
  that looks vanished in the other. Read from the row per request, exactly as the role is.
- **What a payment is worth comes from our own price map**, never from provider metadata and never
  from the buyer. Stripe metadata is dashboard-editable, so honouring a `credits` field there lets
  whoever holds dashboard access mint credits without a payment. The Payment Brick makes the same
  rule bite harder: **the browser submits `transaction_amount`**, so the route overwrites it from
  `CREDIT_PACKS.amountBrl` on the way in, and the webhook matches the API's own
  `transaction_amount` against that map on the way back. An approved payment for an amount no pack
  charges buys nothing.

**The operator screen is back, and it changed nothing about this rule.** `/admin/credits` grants
credits with no payment behind them — comping someone, or repairing a payment whose webhook never
landed — and it does it by calling `grantCredits` like every other source. It touches neither table.
The one thing it added is a fourth `CREDIT_REASON`: a hand grant records `grant`, never `purchase`,
because **the ledger's whole job is being auditable and a row claiming a purchase nobody made is the
one lie that devalues the rest of the table**. It has no inverse, which is why `ADMIN_GRANT_MAX`
bounds a single grant and why the screen lists what has been granted.

The second provider has landed and the shape held: Mercado Pago verifies a payment, works out what it
bought, and calls `grantCredits`. `lib/credits.ts` did not change to accommodate it, which is the
whole return on writing it this way.

**The monitoring subscription held it too, and it was the harder test.** A subscription has state a
one-off payment does not -- it renews, it fails, it gets cancelled -- and the obvious way to build it
is a second place that says what someone is entitled to. That is exactly the second source of truth
this rule exists to prevent. So it was split: `subscriptions` holds **eligibility and status**, and
every renewal's credits go through `grantCredits` with the charge's own id as `providerRef`, exactly
like a pack. `users.credits` stays the one answer to what a person can spend, and the ledger still
explains every row in it.

Two consequences worth stating, because both are the kind of bug that looks like working software:

- **The grant is keyed on the charge, never on the authorisation.** A renewal is a new payment
  against the same preapproval, so keying it on the preapproval id credits the first month and
  silently swallows every month after it -- for thirty days that is indistinguishable from correct.
- **What the subscription buys that credits cannot is the sweep**, and the sweep costs a browser slot
  and zero tokens. That is what makes a monthly price coherent: the fee pays for measurement on a
  schedule, and generation is still bought by the credit.

*Governs:* [api.md](api.md), [data-model.md](data-model.md), [product.md](product.md)

### The free half is what code counted; the paid half is what a model wrote

`measuredFindings`, `readoutScore` and `extractKeywords` are pure arithmetic over what the scrape
counted. They call no model, so **an analysis with no owner costs a browser slot and zero tokens** —
which is what makes it safe to hand to ad traffic where most visitors never convert.

The cut is `analyses.user_id`, not a flag. Ownership is exactly the thing that says someone paid, so
one nullable column carries the whole decision and no second source of truth can disagree with it.

**An empty balance is not a refusal, it is the free half.** `POST /api/analyses` used to delete the
row and answer `402` when `spendCredit` found nothing to spend, which made signing in strictly worse
than staying signed out: the same person got the readout with no session and nothing at all with one.
The row is now created ownerless whoever is signed in, and `user_id` is written **only once a credit
has actually been taken** — so the branch `runAnalysis` reads is still ownership, still one column,
and a run nobody paid for still costs zero tokens.

The consequence to hold onto: **an owned analysis can contain nothing generated.** Claiming a free run
after signing in hands over the row without the paid half ever having been bought, so the analysis
surface renders the unlock wall rather than four empty tabs. There is one surface to say that of now
— it was two, and they disagreed about the predicate — see [report.md](report.md).
Buying credits does not retroactively generate anything — the reader runs the URL again with a credit
in hand.

Three consequences that must hold together:

- **The readout is never gated**, on any surface. It is the part the reader can check against their
  own site in one click, and gating a measurement of someone's own page reads as a trick — see
  [readout.md](readout.md).
- **A token spent on an ownerless analysis is a bug**, not a cost. If one ever appears, the split
  leaked.
- **An address is not ownership.** `POST /api/leads` takes an email on the report surface and sends
  the reader the link back, and that is the whole of what it does: it writes to `leads`, never to
  `users`, and a lead never becomes an owner by leaving one. The cut stays the one nullable column.

  This is also why the offer sits **below** the readout rather than in front of it, and why it may
  never move: the wall this replaced traded a stranger's address for a preview of someone else's
  report, and the rule above is what killed it. What is asked for here buys the reader something —
  an `embed_key` lives in one browser's `localStorage`, so the email is the only durable copy of the
  link they can have.

*Governs:* [product.md](product.md), [api.md](api.md), [readout.md](readout.md), [report.md](report.md)

### The public board carries a domain and a score, and nothing else

The landing page ranks pages this tool has measured, and every one of them belongs to somebody who
did not ask to be on a marketing page. **What leaves the server is `{ domain, score }`, and the shape
is the entire control** — `publicLeaderboard` and `analysisPulse` in `lib/analyses.ts` select those
columns, and `GET /api/pulse` returns exactly what they hand back.

Three omissions carry the rule, and each fails differently if it is undone:

- **The embed key** is the only credential the public report has, so publishing keys next to domains
  hands over every teardown ever run in one response.
- **The URL's path** is frequently an unlisted campaign page; `displayHost` reduces it to a hostname.
- **The owner** is nobody's business. A domain and a score do not say who paid to have it measured.

The board itself is subject to the measurement rules above like every other surface: an entry is a
score this code counted and froze into `page_snapshots`, deduplicated by domain. Below
`PULSE_MIN_ENTRIES` the section does not render, because **padding a board with examples is the
invented data the whole product refuses** — there is no seed anywhere and there must never be one.

*Governs:* [security.md](security.md), [api.md](api.md), [analysis-ui.md](analysis-ui.md)

## Security

### A user row may exist before its first sign-in, and only a provider-verified email may claim one

Someone can pay before they have ever opened the app, so the row has to be able to exist without a
sign-in behind it. `grantCredits` is the only writer that does it now — the operator screen that used
to grant plans by hand is gone — but the shape is unchanged: insert `{ email, name: email }` and set
the entitlement. That is the whole provisioning record, and it is why the sign-in upsert writes `name`,
`avatarUrl`, `role` and `lastSignInAt` and **never** the entitlement. First sign-in fills in the
person; what they bought was already there.

The other half is the price of keying rows on email with no `accounts` table: **whoever presents that
email next owns everything in the row.** So an OAuth sign-in is refused unless the provider's own
provider will vouch for the address. **Each provider declares *how*, in `VERIFIED_EMAIL`**: a claim
read off the profile for Google, a call to `GET /user/emails` for GitHub, whose OAuth profile carries
no such claim and whose `email` is null outright when the account keeps it private. A provider with no
strategy declared is refused.

**The address that keys the row is the verified one, not the one the profile carried** — for GitHub
they can differ, and using the profile's would key a row on an address nobody verified. **Every
failure of the remote check refuses**: a timeout or a 403 from a missing `user:email` scope must not
read as "verified", or a GitHub outage becomes an open door onto rows holding credits. An absent claim is
never read as a verified one, and a provider added to `authConfig` without naming its claim locks
itself out rather than letting itself in.

The two halves are one rule because they are the same row seen from both ends: pre-provisioning is
only safe while the claim side holds, and weakening the claim hands over a row with money in it
rather than an empty one.

*Governs:* [security.md](security.md), [data-model.md](data-model.md), [api.md](api.md)

### `ADMIN_EMAIL` grants the role, `users.role` authorizes the request

Sign-in promotes the row to `admin` when the email matches `ADMIN_EMAIL` (`isAdminEmail`); every request
is then gated on the **stored** role (`isAdmin`), never on the variable. The two halves are separate
functions in `lib/auth-policy.ts` precisely so no call site can confuse them.

**It happens at sign-in, so setting the variable promotes nobody who is already signed in.** A session
lives `SESSION_MAX_AGE_SECONDS`, and `isAdminEmail` is only consulted while the `signIn` callback
runs — adding `ADMIN_EMAIL` to a deploy does nothing until that person signs out and back in. The
match ignores case and surrounding whitespace, because neither is identity and both used to turn a
correct-looking variable into a promotion that silently did nothing. A mismatch now logs.

**`isAdmin` gates `/admin/credits`, and it is checked three times on purpose.** The nav hides the
link, the page answers `notFound()`, and the server action behind the form re-checks before it grants.
Only the last two are boundaries: hiding a link hides a link, and **a server action is a public POST
endpoint that happens to live next to a component**, reachable by anyone who knows its id without ever
loading the page that renders the form.

The gate reads the **row**, so revoking with `update users set role = 'user'` takes effect on the next
request rather than the next sign-in — covered by `e2e/admin-credits.spec.ts`, which demotes the row
mid-session and expects the screen to answer 404 with the token untouched.

The promotion is one-way. A sign-in never writes the role back down, which means **removing `ADMIN_EMAIL`
revokes nothing** — revoking is `update users set role = 'user'`, and it takes effect on the next request
rather than the next login, because the gate reads the row and the role is deliberately kept out of the
JWT. The same one-way rule is what lets an `update` promote a second operator without their next sign-in
undoing it.

*Governs:* [security.md](security.md), [data-model.md](data-model.md)

### Rate limiting fails open, except where failing open is the bill

A missing `REDIS_URL`, a wrong one, or a Redis that is simply down means no limit at all — silently,
by design, so infrastructure trouble never becomes an outage. Both paths log.

The consequence to remember: **a misconfigured `REDIS_URL` looks exactly like a working one.** Confirm
with a real `429`, never by reading the config.

**`POST /api/analyses` with no session is the one exception, and it must stay one.** Failing open is
right where a request costs a query. There, every accepted call opens a real browser against three
shared slots with nobody behind it, so no limit is not a degraded feature — it is an unmetered bill
and an outage at once. It passes `failClosed` and answers `503` when Redis cannot be reached.

The two halves are one rule seen from both ends: **the default is open because infra trouble should
not stop a paying user; the exception is closed because infra trouble must not open a public tap.**
Adding `failClosed` anywhere else needs both of those to be true — no session, and real cost per call.

*Governs:* [security.md](security.md), [api.md](api.md), [deployment.md](deployment.md)

### The public routes are CORS-open and must never send credentials

`lib/cors.ts` answers `*`, which is only safe while `Access-Control-Allow-Credentials` is absent:
adding it would expose session-authenticated responses to every origin on the internet. **Never add
it.**

*Governs:* [security.md](security.md)

### Middleware proves a session, not a user row

Every page behind `PROTECTED_PREFIXES` re-checks the user itself, and every `/api` route authenticates
via `getCurrentUser()`. The matcher's exclusion list is a performance detail, not the security
boundary — never treat a route as protected because it is missing from that list.

*Governs:* [security.md](security.md)

### Every outbound URL is validated before a browser is pointed at it, and again per request

`assertPublicUrl` refuses private, loopback, link-local, CGNAT, unique-local and multicast ranges via
**every** address DNS returns. That check alone is bypassable, so `openGuardedPage` re-applies it to
every request the page makes — which is what actually closes DNS rebinding and a `302` to the metadata
endpoint.

*Governs:* [security.md](security.md), [scraping.md](scraping.md)
