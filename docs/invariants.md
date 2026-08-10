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

Nothing measured is ever put into a prompt, and nothing generated is ever presented as a measurement.

*Governs:* [readout.md](readout.md), [ai-pipeline.md](ai-pipeline.md), [analysis-ui.md](analysis-ui.md)

### The readout says what was counted, never what it will produce

"Your LCP is 4.2s" is a measurement. "This is costing you 12% of signups" is a prediction nobody
measured, and it is the sentence that burns the report's credibility the first time it does not come
true. No copy anywhere may state what a number will produce.

The load numbers additionally declare their own limits: they are measured from the deploy's network,
so they are a **floor** a real visitor never beats, and `transferredBytes` renders behind
`readout.atLeast` because `SCRAPE_ALLOWED_RESOURCE_TYPES` blocks media.

*Governs:* [readout.md](readout.md), [scraping.md](scraping.md)

### A generated `evidence` never carries a number

No percentage, no lift figure, no count of what other companies do, no "studies show". The only
measurement any generation call has is the readout of the one page in front of it, so a number in
`evidence` is invented by construction. The prompts require the CRO mechanism instead.

Unconditional. It used to have an escape hatch for when corpus evidence was supplied, and that hatch
is exactly what would have to come back with a corpus.

This is a different rule from the two above and they never share a sentence: this governs what a
model may **assert**, those govern what a measurement may **state**.

*Governs:* [ai-pipeline.md](ai-pipeline.md)

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

### A comparison exists only where the competitor page was actually opened

Paid Competitor mode scrapes those pages for the research brief, so keeping the `PageStructure` it
already measured costs nothing. The auto-search path's competitors are URLs a model cited without
anyone loading them; comparing against those would be exactly the invented number the rules above
exist to prevent, so that path stores none and the table does not render.

*Governs:* [ai-pipeline.md](ai-pipeline.md), [readout.md](readout.md)

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
directions of error are not symmetric. Missing a Brazilian page costs one unfocused competitor search;
marking a US page Brazilian rewrites the whole analysis around the wrong country and shows the reader
nothing that explains it.

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

### White-label hangs off one boolean, on four independent surfaces

White-label is the capability the paid plan is bought for. Our name reaches a report from four places,
and stripping three still ships an agency a document that advertises us:

1. **The public report page** — `Wordmark`, `report.generatedBy`, `report.footerQuestion`, `WaitlistWall`
2. **The metadata** — `openGraph.siteName` and the root layout's `%s | Hunch` title template
3. **The OG card** — `OgWordmark`, the first thing the reader sees when the link arrives by email
4. **The print report** — owner-authenticated, so nothing about it looks like a public surface, yet
   the landing page sells "hand over the printed version" and a browser prints the tab title into the
   page header

All four answer to `canWhiteLabel(plan)` (`lib/usage.ts`). Two are easy to miss, for opposite reasons:
the unfurl is not part of the page, and the print report is not a link at all.

*Governs:* [report.md](report.md), [seo.md](seo.md)

### There is no self-serve checkout, and no published price

A plan is granted by a sale a person closed on a call and billed through a Stripe payment link the
seller sends; the webhook promotes the account. `/billing`, the checkout dialog, the published price
and the `checkout` and `portal` routes are gone, and so is every client-side Stripe dependency. Every
paid-plan prompt points at `CONTACT_PATH` (`/#contact`).

The one route that stays is the webhook, and the payment link is the only way an account is ever
promoted automatically — so **the link must charge the price in `STRIPE_PRICE_ID`**, which is how
the webhook names the plan when the subscription carries no `metadata.plan`.

The e2e case `publishes no price publicly` is what keeps a price from drifting back onto `/`.

*Governs:* [api.md](api.md), [components.md](components.md), [product.md](product.md)

## Integrity of results

### An event without a `visitorId` is dropped, never counted

The snippet mints a sticky per-browser uuid and a unique index on
`(experiment_id, visitor_id, arm, type)` gates the counter, so a conversion or impression counts once
per visitor and an arm cannot be inflated by anyone holding the (necessarily public) embed key.

The field is **required**. It was optional once, and that optionality was a live hole: an event
without an id skipped the ledger entirely, so the embed key alone was enough to decide the winner.

*Governs:* [experiments.md](experiments.md)

### The recommendation waits for the end; the numbers do not

Counters and significance are recomputed on every read and the panel polls them while a test runs.
The **recommendation** renders only once the experiment is `completed` or `stopped`, so the decision
is never made from a peeked-at interim result.

*Governs:* [experiments.md](experiments.md)

## Security

### `ADMIN_EMAIL` grants the role, `users.role` authorizes the request

Sign-in promotes the row to `admin` when the email matches `ADMIN_EMAIL` (`isAdminEmail`); every request
is then gated on the **stored** role (`isAdmin`), never on the variable. The two halves are separate
functions in `lib/auth-policy.ts` precisely so no call site can confuse them.

The promotion is one-way. A sign-in never writes the role back down, which means **removing `ADMIN_EMAIL`
revokes nothing** — revoking is `update users set role = 'user'`, and it takes effect on the next request
rather than the next login, because the gate reads the row and the role is deliberately kept out of the
JWT. The same one-way rule is what lets an `update` promote a second operator without their next sign-in
undoing it.

*Governs:* [security.md](security.md), [data-model.md](data-model.md)

### Rate limiting fails open, deliberately

A missing `REDIS_URL`, a wrong one, or a Redis that is simply down means no limit at all on the public
endpoints — silently, by design, so infrastructure trouble never becomes an outage. Both paths log.

The consequence to remember: **a misconfigured `REDIS_URL` looks exactly like a working one.** Confirm
with a real `429`, never by reading the config.

*Governs:* [security.md](security.md), [deployment.md](deployment.md)

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
