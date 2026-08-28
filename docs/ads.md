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

What is given up is real and worth naming: **no remarketing audiences, and no on-site behaviour in
the Google Ads UI.** Neither is worth a tracker on a page this product sells a score on.

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

**Reporting lives in `grantCredits` and not in the webhooks.** Three paths end there -- a pack, a
subscription renewal, and Stripe -- so reporting from each would be the same code written three
times, and the first one fixed is the moment the three start disagreeing. It is the same reasoning
that put every balance movement in that file, and it buys a second guarantee for free: the report is
gated on the ledger's own `(provider, provider_ref)` unique, so a re-delivered webhook cannot report
one payment twice. Google's `orderId` carries the provider reference as a third layer.

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

   **Explorer Access reaches production accounts**, and 2,880 operations a day is enormous next to
   one upload per purchase. Its blocked list is account creation, user management, planning tools and
   billing services -- conversion upload is not on it. So the integration should run on Explorer from
   day one; confirm that with the test purchase in step 6 rather than taking this table's word for it.
   Apply for Basic Access in parallel, as headroom rather than as a gate.
3. Create the conversion action: goal **Purchase**, source **Import**, count **Every**, value **Use
   different values for each conversion** (the amount is uploaded per sale), click-through window 90
   days to match `GCLID_MAX_AGE_SECONDS`.
4. Take its numeric id out of the conversion action's URL.
5. Create an OAuth client (Desktop) in a Cloud project with the Google Ads API enabled, and mint a
   refresh token for an account that can see the ad account.
6. Set the six variables and confirm with a real R$19 purchase from a URL carrying a fake `gclid`.
   It will be rejected as an unknown click, and the rejection proves the whole chain end to end --
   the log line will read `ads.conversion_failed` naming the click, not a token or permission error.

## Strategy

### The arithmetic first, because it decides everything else

**A credit pack cannot pay for a paid click, and the subscription can.** This is not a pessimistic
framing, it is the same point [product.md](product.md) already makes about why `MONITORING_PLAN`
exists at all: a single purchase gives one transaction to repay acquisition, which works while
acquisition is organic and does not while it is bought.

The featured pack is R$39. Brazilian search CPCs for marketing-tool intent run roughly R$1.50 to
R$5, and a cold landing page converting a click into a purchase at 1-2% is a normal expectation.
That puts acquisition somewhere around R$100 to R$400 per buyer. Against a R$39 pack that is a loss
on every sale. Against R$97 a month it is repaid in one to four months.

**So the campaign is bidding for subscribers, and pack sales are what happens on the way there.**
Two consequences that are easy to get wrong:

- Every renewal reports, not only the first charge. The webhook does this already. Bidding against
  the first month alone understates the channel by exactly the margin that justifies it.
- Because the conversion value uploaded is one month's charge rather than a lifetime value, **the
  target CPA in the account should be set against expected months retained**, and that number is an
  assumption until there is a cohort. Write it down as an assumption; do not let it turn into a
  figure anyone quotes.

Every number in this section is an estimate, not a measurement. That distinction is the product's
whole thesis and it does not stop applying to our own marketing.

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
