# Google Ads

Two halves that meet in one place: how a paid click is tied back to a confirmed payment, and what
the campaigns buying those clicks are meant to do.

## There is no Google tag on this site

No `gtag.js`, no Google Tag Manager, no third-party cookie, no consent banner, and nothing loaded
from a Google origin by any page. `middleware.ts` reads `gclid` out of the query string into a
first-party cookie, and the sale is reported to Google from the server.

Three reasons, in the order they matter:

- **The product would fail its own audit.** `READOUT_THRESHOLDS.pageWeightWarnBytes` is 2MB and the
  readout counts requests. Charging a founder to be told their page is heavy while shipping a tag
  container onto our own landing page is the kind of thing a reader notices once and never forgets.
- **A conversion the browser reports is a conversion the browser can lie about**, and Pix and boleto
  confirm asynchronously anyway -- minutes to days after the tab is closed. A client-side purchase
  event would undercount every Pix sale and be forgeable on top of it.
- **LGPD gets much easier** when the only thing stored is an ad click id in a first-party httpOnly
  cookie and nothing is shared with a third party until money has actually changed hands.

What is given up is real and worth naming: **no behavioural remarketing, and no on-site behaviour in
the Google Ads UI.** Neither is worth a tracker on a page this product sells a score on.

**"No tag" does not mean "no audiences", and reading it that way was wrong.** Customer Match builds
an audience from hashed addresses uploaded server-side, with no pixel, no cookie and nothing loaded
in a browser, the same shape as the conversion upload. What the no-tag decision actually costs is
the audience of people who visited and left **without giving an address**. See the Customer Match
section below.

## The chain

Four steps, and each one exists because the next has no way to see what the previous knew.

| Where | What happens |
| ----- | ------------ |
| `middleware.ts` | `?gclid=...` is validated against `GCLID_PATTERN` and written to the `GCLID_COOKIE`, httpOnly, `GCLID_MAX_AGE_SECONDS` |
| `POST /api/billing/mercadopago` | the cookie is copied onto the buyer's row by `rememberAdClick` |
| `grantCredits` (`lib/credits.ts`) | on a claimed ledger row, `reportConversion` reads the click back |
| `lib/google-ads.ts` | one `uploadClickConversions` call, with the amount the provider confirmed |

**Capture is in middleware rather than on the landing page** because an ad may point at any surface
this app serves -- a blog post, the packs anchor, a shared report. One place means a new landing
target can never be the one that silently stops attributing.

**The click is stored on `users` rather than on a payment** because it arrives before either exists.
Someone clicks an ad, reads a blog post, measures a page, signs in a week later and buys the week
after that. `users` is the first row present on both sides of that gap. The price is that attribution
is last-click, which is also what Google's own default reports.

**Reporting lives in `grantCredits` and not in the webhooks.** Every path that grants ends there -- a
pack today, Stripe when there is a company to register it to, a hand grant that deliberately reports
nothing -- so reporting from each would be the same code written once per path, and the first one
fixed is the moment they start disagreeing. It is the same reasoning that put every balance movement
in that file, and it buys a second guarantee for free: the report is gated on the ledger's own
`(provider, provider_ref)` unique, so a re-delivered webhook cannot report one payment twice. Google's `orderId` carries the provider reference as a third layer.

**Nothing about this can fail a payment.** Every error is logged as `ads.conversion_failed` and
swallowed. A conversion Google never recorded is a reporting gap; a webhook that answers `500` is a
payment Mercado Pago retries. The upload is awaited rather than left dangling, because a serverless
invocation can be frozen the moment its response is returned.

### What does not report

- **A hand grant.** `reason: 'grant'` returns early. Nobody paid, so there is no conversion, and
  telling Google otherwise would train the bidding on comped accounts. Same rule as the ledger's:
  see [invariants.md](invariants.md#credits-are-granted-by-one-internal-path-and-no-provider-code-touches-the-tables).
- **A Stripe payment.** Stripe exists for the case where there is a company to register it to, and
  it does not charge in BRL. `ADS_CONVERSION_CURRENCY` is BRL, so reporting a dollar figure as one
  would be inventing a number -- the thing this product refuses everywhere else. When Stripe starts
  taking real money, it needs its own currency passed through, not a conversion rate guessed here.
- **A click past its window.** `GCLID_MAX_AGE_SECONDS` is Google's own longest click-to-conversion
  window. Beyond it the upload is refused, so sending it turns a quiet skip into a logged error.
- **A buyer who never saw an ad**, which is most of them. Logged as `ads.conversion_skipped` with
  `reason: 'no_click'`, at `info`, because it is the ordinary path and not a failure.

## Customer Match

Two lists, kept in step by `GET /api/cron/audience-sync` and built in `lib/google-ads-audience.ts`:
**buyers, uploaded to be excluded** so the campaign stops paying for clicks from existing customers,
and **leads, uploaded to be targeted**.

**What leaves is a SHA-256 digest and never an address.** Google normalises the same way before
matching, so `hashEmail` lowercases and trims first: a digest of `" Foo@Bar.com "` matches nobody and
fails silently, which is the failure mode this whole area is prone to.

`REMOVE_ALL` runs before each add, so the membership is replaced rather than accumulated. That is
what makes leaving take one run instead of a deletion nobody would remember to write.

**Only `reason = 'purchase'` counts as a buyer.** A hand grant is a comped account, and training an
audience on one is the same mistake as reporting it as a conversion, the rule that already keeps
`grant` out of the conversion upload.

### It changed what the privacy policy could say, and that was the expensive part

Three sentences stopped being true and were rewritten rather than softened: that nothing is traded
with anyone for marketing, that Google Ads receives the click and the amount **only when there is a
purchase**, and that nobody else receives anything. The policy now names the upload, says it is
hashed, and says leaving covers the ads as well as the mail.

`app/(app)/privacy/page.tsx` states that every claim there is checkable against the code. That rule
survived this change by being obeyed, and it is the reason the change was worth stating rather than
absorbing.

**The consent is forward-only, and it is a column.** `leads.consented_at` is stamped by the form that
carries the current note; a row without it was captured under the older "one email with the link,
nothing else" and is never uploaded. See [data-model.md](data-model.md).

### There is no lookalike, and there is no substitute for one

Google retired Similar Audiences in August 2023, and for Search there is no direct replacement: the
official answer is to let Smart Bidding use first-party signals. So the list feeds bidding and
exclusion, and it does not become a way to find people who resemble buyers. Anyone arriving from
Meta's model of audiences should expect that difference.

### What is deliberately not reported

**No mid-funnel conversion.** Running an analysis or creating an account is not uploaded as a
conversion action, though both would be easy to. Reporting them would make the bidding optimise for
people who never pay, which is the opposite of what a payment-only signal was chosen for. The cost is
already named under Strategy: Smart Bidding has almost nothing to learn from at the start, and that
is accepted rather than papered over with a softer conversion that means less.

## Configuration

Six variables, and `googleAdsEnabled()` requires all of them. A partial set is worse than none: it
would produce one failed upload per payment, forever.

| Variable | What it is |
| -------- | ---------- |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | the manager account's token, at Basic Access or above |
| `GOOGLE_ADS_CUSTOMER_ID` | the account the conversion belongs to; dashes are stripped |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | the manager account above it. Optional, and omitted rather than blanked when absent |
| `GOOGLE_ADS_CONVERSION_ACTION_ID` | the numeric id of the conversion action, not its name |
| `GOOGLE_ADS_CLIENT_ID` / `GOOGLE_ADS_CLIENT_SECRET` | an OAuth client in the same Cloud project |
| `GOOGLE_ADS_REFRESH_TOKEN` | offline token for a user with access to the account |

Unset everywhere but production, which is why an absent set skips quietly rather than warning.

**`GOOGLE_ADS_API_VERSION` is pinned and it sunsets.** Google retires a version roughly a year after
release and a call to a retired one fails outright -- as `ads.conversion_failed`, on every payment,
until someone reads the logs. Confirm it against Google's current release notes before enabling, and
put the bump on a calendar rather than waiting to be surprised by it.

It is pinned to `v25` as of 2026-08-29, when v23, v24 and v25 were the live versions. It had sat at
`v18` since before the integration was ever switched on, which is the failure mode this paragraph
describes: nothing surfaces it until the first real payment, and the error it produces looks exactly
like a bad credential.

### Setup order

1. Create a **manager account** (MCC) if there is not one; the developer token belongs to it, not to
   the ad account.
2. Generate the developer token in the manager account's API Center, and check what access level it
   starts at. **Do not assume Basic Access is required to start.** There are four levels, and the
   one that matters here is the second:

   | Level | Production accounts | Daily operations |
   | --- | --- | --- |
   | Test | no | 15,000 (test only) |
   | **Explorer** | **yes** | **2,880** |
   | Basic | yes | 15,000 |
   | Standard | yes | unlimited |

   **A token is issued at Test, and Test reaches no production account at all.** Explorer is not
   what you get either: every call against a real account answers `DEVELOPER_TOKEN_NOT_APPROVED`,
   naming Basic or Standard as the way out. **Apply for Basic Access first; it is a gate and not
   headroom.**

   Explorer's own blocked list is account creation, user management, planning tools and billing
   services, so conversion upload is not on it. That remains true and remains untested here, because
   the application went straight from Test to Basic.

   **`validate_only` is how to find out what a token may do without writing anything.** Every mutate
   accepts it, the whole operation is validated, and nothing is created. It answers the access-level
   question in one call and leaves no wreckage in the account if the answer is no.
3. Create the conversion action: goal **Purchase**, source **Import**, count **Every**, value **Use
   different values for each conversion** (the amount is uploaded per sale), click-through window 90
   days to match `GCLID_MAX_AGE_SECONDS`.
4. Take its numeric id out of the conversion action's URL.
5. Create an OAuth client (Desktop) in a Cloud project with the Google Ads API enabled, and mint a
   refresh token for an account that can see the ad account. **Use a Cloud project of its own rather
   than the one behind Google sign in.** The `adwords` scope is a sensitive one and the consent
   screen belongs to the project, so adding it to the project that authenticates paying users puts a
   verification requirement on the thing that logs them in. Publish that consent screen before
   minting: a token issued while it is in Testing stops working after seven days.
6. Set the six variables and confirm with a real R$47 purchase from a URL carrying a fake `gclid`.
   It will be rejected as an unknown click, and the rejection proves the whole chain end to end --
   the log line will read `ads.conversion_failed` naming the click, not a token or permission error.

## Strategy

### The arithmetic first, because it decides everything else

**There is no recurring revenue, so one purchase has to repay one click.** That is the whole
constraint, and it is what set the price rather than the other way round.

Brazilian search CPCs for marketing-tool intent run roughly R$1.50 to R$5, and a cold landing page
converting a click into a purchase at 1-2% is a normal expectation. That puts acquisition somewhere
around R$100 to R$400 per buyer. An analysis costs a couple of reais to produce, so the contribution
is very nearly the whole ticket:

| Ticket | Contribution | Break-even CPA | Needed at R$3 CPC |
| --- | --- | --- | --- |
| R$19 (the old single) | ~R$17 | R$17 | 17.6% |
| R$39 (the old featured pack) | ~R$37 | R$37 | 8.1% |
| R$47 (the single) | ~R$45 | R$45 | 6.7% |
| R$147 (the trio) | ~R$145 | R$145 | 2.1% |

**No campaign is running, so this table is a record of the reasoning rather than a live constraint.**
It set the prices once, at R$147 and R$297; the current R$47 and R$147 were set against what the
product should cost a buyer, not against a click. If paid acquisition ever starts again, the numbers
to compare are the ones in the account, and R$47 is the row to look at first.

**Recurring revenue would make this arithmetic comfortable, and there is none.** A subscription is
the obvious way to get it and the wrong one here, because what it would sell is a weekly report on
pages that do not change weekly. See [product.md](product.md). A price that can pay for a click is a
worse business than retention and a better one than a plan nobody renews.

**A price test cannot settle this and should not be attempted.** At single-digit monthly conversions
the sample never arrives, the same argument that removed the A/B testing stage in
[product.md](product.md), applied to our own pricing. What is known is that the old price provably
could not pay for a click.

Every number in this section is an estimate, not a measurement. That distinction is the product's
whole thesis and it does not stop applying to our own marketing. **Treat the first R$1.000 of spend
as buying the conversion rate, not as buying revenue**, and do not let any figure in that table turn
into something anyone quotes as measured.

### Start with one Search campaign and nothing else

- **No Performance Max.** It needs conversion volume to have anything to learn from, and it spends
  across Display and YouTube where a founder searching for a landing page audit is not. With single
  digit monthly conversions it is a budget shredder that returns no readable signal.
- **No Display, no remarketing.** There is no tag, by design, so there are no audiences.
- **Portuguese only, Brazil only.** English is a separate campaign for a separate day; the payment
  rails, the default locale and the pt-BR rewrite all point one way.

**Bidding: Maximize Clicks with a CPC ceiling until roughly 30 conversions a month exist**, then
Target CPA. Smart Bidding on payment-only conversions has almost nothing to optimise against at the
start, which is the real cost of the payment-only choice and is worth accepting rather than papering
over with a softer conversion that means less.

### Ad groups

Four themes, tightly grouped so the ad can actually echo the query. Phrase match throughout: broad
match with no conversion history to steer it is how the budget leaves.

**1. Landing page audit** -- the core intent, the most expensive, the highest converting.
`analise de landing page`, `auditoria de landing page`, `analisar pagina de vendas`,
`revisao de landing page`, `nota da minha landing page`.
Lands on `/`.

**2. Conversion rate** -- the problem rather than the tool.
`aumentar conversao do site`, `melhorar taxa de conversao`, `por que meu site nao converte`,
`otimizar pagina de vendas`, `cro landing page`.
Lands on `/`.

**3. AI visibility** -- the wedge, and the reason to move now.
`como aparecer no chatgpt`, `seo para ia`, `meu site no chatgpt`, `otimizacao para ia generativa`,
`GEO seo`, `aparecer nas respostas de ia`.
Lands on `/blog/ai-is-the-new-google`, which already ends on the same button as the landing page.
Low volume, low competition, high intent, and it is the one theme where this product does something
most competitors do not have a page about -- the discoverability audit and the `ai_answerability`
fixes are the actual deliverable behind the ad.

**4. Copy and SEO basics** -- informational, cheapest, lowest intent.
`o que e copywriting`, `o que e seo`, `como escrever headline que converte`.
Lands on `/blog/what-is-copy` and `/blog/what-is-seo`. Keep this one on a small capped budget: it
buys readers, not buyers, and its job is to prove whether the blog converts at all.

### Negatives

Set at campaign level from day one. The list matters more than the keywords do at this budget.

`curso`, `cursos`, `certificacao`, `vaga`, `vagas`, `emprego`, `salario`, `freelancer`, `agencia`,
`contratar`, `template`, `templates`, `modelo`, `exemplos`, `wordpress plugin`, `elementor`,
`figma`, `pdf`, `apostila`, `download`.

**`gratis` and `gratuito` are deliberately not negatives.** The score genuinely is free and needs no
account, so that query is served honestly by the product rather than baited by it -- see the free
half in [invariants.md](invariants.md#the-free-half-is-what-code-counted-the-paid-half-is-what-a-model-wrote).
Watch its conversion rate and cut it if it earns nothing, but do not cut it on the assumption.

`agencia` and `contratar` are negatives because the agency buyer is exactly who this product stopped
being for -- see the pivot in [product.md](product.md).

### What the ads may say

**The prohibition on causal claims applies to advertising too**, and this is the surface where
breaking it is most tempting. "Aumente sua conversao em 30%" is a number nobody measured, and it is
the same invented figure the prompts refuse to let a model write into an `evidence` field. See
[invariants.md](invariants.md#a-delta-is-arithmetic-between-two-measurements-never-a-result-attributed-to-a-change).

What an ad may say is what the product does: a score out of 100, measured on the page, in about
twenty seconds, from a URL and nothing else, with no account and nothing to install. That is a
strong offer stated accurately, and it has the useful property of being checkable in one click --
which is exactly what makes the landing page convert.

Headlines worth testing: `Nota da sua landing page em 20s`, `Cole a URL. Receba a nota`,
`Sem instalar nada, sem cadastro`, `Seu site aparece no ChatGPT?`, `O que sua pagina diz sobre si`.

Sitelinks to `/blog`, `/#how` and `/#credits`.

### The product writes ad groups too, and the same rules bind them

`POST /api/analyses/[id]/ads` groups the terms counted on a reader's page into ad groups and writes
the headlines and descriptions -- see [ai-pipeline.md](ai-pipeline.md#5b-ad-ideas--generateadideas).
It is the same reasoning as this section applied to somebody else's campaign, and worth stating here
because this is the file where the temptation lives.

**Everything above about what an ad may say binds that output too.** No promised increase, no
percentage, no superlative nobody can check. And one more that is specific to it: **no search volume,
no cost per click, no competition figure**, because we have no index and no clickstream and the terms
are a count of the page's own words. See
[invariants.md](invariants.md#keywords-measure-the-pages-own-words-never-the-index).

The character ceilings in `AD_HEADLINE_MAX_CHARS` (30) and `AD_DESCRIPTION_MAX_CHARS` (90) are
Google's own, enforced in Zod rather than asked for in the prompt, so a line the reader could not
upload never reaches them.

### Creating the campaigns

**By hand, in the Google Ads UI.** The ad groups, keywords and negatives above are written to be
typed in as they stand.

Not from an MCP server, because none of them can do it: **Google's own Google Ads MCP server is
strictly read-only** -- it lists accessible accounts, runs GAQL queries and returns resource
metadata, and by its own documentation "cannot modify bids, pause campaigns, or create new assets."
Third-party servers that do write exist, and handing account-mutating credentials to one to save an
afternoon of one-time setup is a bad trade.

That read-only server is genuinely useful for the other direction, though: pointing it at the
account is the quickest way to read back what the campaigns are doing without opening the UI, and it
needs the same developer token this integration already has.

Campaign creation is also not automated from this repo, and should not be. It is a handful of
one-time actions, and a script that owns the account structure becomes a second source of truth
about it.

The one thing that must match the code is the **conversion action id**, which is the only string the
account and this repo both have to agree on.
