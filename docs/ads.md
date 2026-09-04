# Google Ads

Two halves that meet in one place: how a paid click is tied back to a confirmed payment, and what
the campaigns buying those clicks are meant to do.

## There is no Google tag on this site

No `gtag.js`, no Google Tag Manager, no third-party cookie, no consent banner, and nothing loaded
from a Google origin by any page. `middleware.ts` reads `gclid` out of the query string into a
first-party cookie, and the sale is reported to Google from the server.

Three reasons, in the order they matter:

- **The product would fail its own audit.** `READOUT_THRESHOLDS.pageWeightWarnBytes` is 2MB and the
  readout counts requests. Charging an owner to be told their page is heavy while shipping a tag
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
| `POST /api/leads` | on a row that was actually inserted, the same cookie is read and the click is uploaded against the **lead** action, with no amount |

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
what makes leaving take one run instead of a deletion nobody would remember to write. It is the
first operation of the job and it is sent even when the list is empty, because a job that only ever
adds keeps an unsubscribed address in the audience until Google's own expiry, which here is the
maximum.

**A list does not serve until it holds 100 active users.** That is Google's minimum since February
2024, down from 1,000, and active means active on Gmail, Search, YouTube or Display, so the number
that counts is always lower than the number uploaded. Google's own recommendation is 5,000 members
before expecting reach at all.

**Read that against the address rate and Customer Match stops looking like the return path.** At 5 to
7 addresses per 100 clicks, the leads list reaches 100 somewhere past 1,500 clicks, which at the
ceiling below is more than a month of budget. The mail sequence works on the first lead; the audience
works on the hundredth. Any plan that treats the audience as available now is a plan with no return
path for its first two months.

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

### The lead is reported, and the distinction that makes it safe is primary against secondary

A captured address is uploaded as its own conversion action, from `POST /api/leads`, against
`GOOGLE_ADS_LEAD_CONVERSION_ACTION_ID`. **It is meant to be a secondary action in the account,
outside the bidding goal**, and that is the whole of what keeps it honest.

This reverses a line that used to read "no mid-funnel conversion", and the argument behind that line
was never wrong -- it was about the wrong thing. What it actually forbids is letting bidding
optimise for people who never pay, and that is a property of a **primary** action, not of an upload.
A secondary action is a column in a report. It answers which ad group produces addresses, which is
the one question a payment-only account cannot answer at four sales a month, and it steers no bid
while doing it.

**Promoting it to primary would undo the reasoning**, so it must not happen quietly. Smart Bidding
would leave the learning phase in weeks and spend the budget on people who leave an address and
close the tab.

Three properties, and each one is load-bearing:

- **It carries no value.** Nobody paid, so a figure would be the expected worth of a lead -- a
  number this code invented, which is exactly what [invariants.md](invariants.md) refuses on every
  reader-facing surface. Our own reporting gets no exemption from a rule the prompts are held to.
  `ClickConversion.valueBrl` is optional for this reason, and `conversionValue` and `currencyCode`
  are omitted together rather than sent as a zero.
- **It is keyed on the lead row's id**, passed as Google's `orderId`, and only uploaded when the
  insert actually wrote a row. `onConflictDoNothing` returns nothing on a resubmit of the same
  address for the same page, which is the same guarantee the purchase gets from the ledger's
  `(provider, provider_ref)` unique.
- **Its variable is outside `googleAdsEnabled()`.** Unset has to mean "report payments and nothing
  else", never "report nothing": the money side must not go dark because a second conversion action
  was never created. `leadConversionEnabled()` is the narrower gate, checked on top of the six.

**Creating an account is still not reported**, and neither is running an analysis. A signup says
nothing an address does not already say, and a free run is the thing ad traffic is *supposed* to do.

### What is deliberately not reported

**No conversion for the free analysis itself.** It is what the landing page is for, so reporting it
would report the click a second time under another name and tell nobody anything.

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
6. Create the **lead** conversion action too: goal **Submit lead form**, source **Import**, count
   **One**, **no value**, same 90 day window, and set it as a **secondary** action so it stays out
   of the bidding goal. Its numeric id is `GOOGLE_ADS_LEAD_CONVERSION_ACTION_ID`.
7. Set the variables and confirm with a real R$97 purchase from a URL carrying a fake `gclid`. It
   will be rejected as an unknown click, and the rejection proves the whole chain end to end -- the
   log line will read `ads.conversion_failed` naming the click, not a token or permission error.
   Leaving an address on a report opened with the same fake `gclid` proves the lead half the same
   way, as `ads.lead_failed`.

## Strategy

### The arithmetic first, because it decides everything else

**There is no recurring revenue, so the purchases have to repay the clicks that produced them.**
That is the whole constraint, and it is what set the price rather than the other way round.

It used to be written as "one purchase repays one click", which was true when the only path was a
stranger clicking and buying in the same session. It is not the path any more: most readers arrive,
measure a page for free, leave an address, and buy weeks later or never. So the unit is a batch of
clicks against the sales that eventually come out of it, and the delay is real -- the sales that
close in month two were bought with month one's budget, and no report in the Ads account puts them
in the same row.

Brazilian search CPCs for marketing-tool intent run roughly R$1.50 to R$5. The cheap tail -- the AI
visibility terms and the blog ones, ad groups 3 and 4 below -- sits near R$1.50; the core intent
terms in ad groups 1 and 2 sit at R$3 to R$5 and are the ones that cannot be afforded first.

An analysis costs a couple of reais to produce, so the contribution is very nearly the whole ticket.
What follows is the funnel behind 100 clicks at R$1.50, which is R$150 of spend:

| | Measure a page | Leave an address | Buy at once | Buy later | Sales |
| --- | --- | --- | --- | --- | --- |
| Poor | 25 | 5 | 0.5 | 0.25 | 0.75 |
| **Normal** | 35 | 7 | 1 | 0.35 | **1.35** |
| Good | 40 | 10 | 1 | 1 | 2 |

The two rows that move it most are the address rate and what a lead is eventually worth: 5 to 7
addresses per 100 clicks is ordinary and 10 is good, and 1 lead in 20 buying is ordinary where 1 in
10 is good.

Against those, and at a blended ticket of R$127 -- one buyer in five takes the trio, so the average
sale sits between R$97 and R$247 rather than at either:

| Ticket | Poor | Normal | Good |
| --- | --- | --- | --- |
| R$47 (the old single) | -R$115 | -R$87 | -R$56 |
| R$77 | -R$92 | -R$46 | +R$4 |
| **R$97 / R$247, blended R$127** | **-R$55** | **+R$21** | **+R$104** |

**R$47 lost in every column, including the good one.** That is what decided the repricing: not the
margin on a sale, but that no amount of tuning made a cohort pay for itself, so the campaign could
never stay on long enough for the mailing list to start compounding -- which is the part that
actually grows, and which does not start returning until around month five.

**The old prices are still worth reading as a warning.** R$19 and R$39 needed 17.6% and 8.1% of
clicks to buy, against the 1-2% a cold page converts at. R$47 needed 6.7%. The direction of the
error was always the same.

**Recurring revenue would make this arithmetic comfortable, and there is none.** A subscription is
the obvious way to get it and the wrong one here, because what it would sell is a weekly report on
pages that do not change weekly. See [product.md](product.md). A price that can pay for a click is a
worse business than retention and a better one than a plan nobody renews.

**A price test cannot settle this and should not be attempted.** At single-digit monthly conversions
the sample never arrives, the same argument that removed the A/B testing stage in
[product.md](product.md), applied to our own pricing. What is known is that the old prices provably
could not pay for a click.

**Whether a Brazilian buyer pays R$97 for this is unmeasured and stays unmeasured.** R$97 is an
ordinary price point in that market and the deliverable is freelancer-shaped, which is the argument
for it; the argument against is that the reader has never heard of us and the free half already
hands them the diagnosis. Neither is a measurement. What is not in doubt is that R$47 did not work
either, so the cheaper price was never the safer one.

Every number in this section is an estimate, not a measurement. That distinction is the product's
whole thesis and it does not stop applying to our own marketing. **Treat the first R$1.000 of spend
as buying the conversion rate, not as buying revenue**, and do not let any figure in these tables
turn into something anyone quotes as measured.

### The click buys a measurement, and the sale is two mails later

**The ad sells the free half, and it has to, because that is what the landing page hands somebody
with no session and no credit**: a score out of 100 counted on their own page. What it must not do is
promise the written half in the same breath. The ranked fixes, the replacement copy and the prompt
that carries them back into the builder all sit behind a credit, and an ad that blurs the two sells a
wall.

The path a click actually takes:

| Step | Where | What the reader gets |
| --- | --- | --- |
| The click | `/`, or a blog post | the URL field |
| The run | `/r/<embedKey>` | the score and every counted line, free, no account |
| The address | the form below the readout | the only durable copy of a link that otherwise lives in one browser's `localStorage` |
| Day 2 | `LEAD_SEQUENCE` stage 1 | one line counted on their own page, and the link again |
| Day 7 | `LEAD_SEQUENCE` stage 2 | what is behind the unlock. Then it stops |

**This is the remarketing, and there is no other kind here.** No tag means no audience of people who
merely visited, so somebody who reads their score and leaves without an address is gone. That is not
a gap to be patched later with a pixel: it is the reason the address is the thing the campaign is
tuned to produce, and the reason the offer sits below the numbers where a reader who already got
something decides whether to leave one. See
[invariants.md](invariants.md#the-free-half-is-what-code-counted-the-paid-half-is-what-a-model-wrote).

**Two columns to read, one to steer on.** Purchases stay primary and the only thing bidding sees; the
lead action is secondary and exists so an ad group at four sales a month has something readable in
it. An ad group producing addresses and no sales is a price or a sequence problem. One producing
neither is a keyword problem. Promoting the lead to primary is what the section above forbids, and
the reasoning does not change because the funnel got longer.

### Start with one Search campaign and nothing else

- **No Performance Max.** It needs conversion volume to have anything to learn from, and it spends
  across Display and YouTube where somebody searching for a landing page audit is not. With single
  digit monthly conversions it is a budget shredder that returns no readable signal.
- **No Display, and no behavioural remarketing.** There is no tag, so there is no audience of
  people who merely visited. What does exist is Customer Match, built server-side from hashed
  addresses -- see the section above. It feeds bidding and exclusion on Search; it is not a Display
  campaign and must not become the reason to start one.
- **Portuguese only, Brazil only.** English is a separate campaign for a separate day; the payment
  rails, the default locale and the pt-BR rewrite all point one way.

**Bidding: Maximize Clicks with a CPC ceiling until roughly 30 purchase conversions a month
exist**, then Target CPA. **Set the ceiling near R$1.50.** The arithmetic above only clears on the
cheap tail, and an uncapped bid buys ad groups 1 and 2 at R$3 to R$5 -- the terms this cannot afford
until a sale is worth more or the funnel converts better.

The lead action does not change this. It is secondary, so it steers nothing; it exists so the manual
tuning has something to read. Smart Bidding on payment-only conversions still has almost nothing to
optimise against at four to eight sales a month, and that is accepted rather than papered over by
promoting the lead to primary.

### Ad groups

Four themes, tightly grouped so the ad can actually echo the query. Phrase match throughout: broad
match with no conversion history to steer it is how the budget leaves.

**They are ordered by what the reader is trying to do**, and the first two are the pivot arriving in
the account: the reader built a page with an AI tool and cannot judge it, so the intent that converts
is fixing it rather than auditing it. See [product.md](product.md).

**1. Fixing a page a tool built** -- first because it is the only theme that describes what the
reader now receives. The report assembles into one block of text they paste back into Lovable, v0,
Bolt or Cursor, which is the last step they would otherwise do by hand.
`como melhorar meu site feito com ia`, `melhorar landing page`, `arrumar landing page`,
`o que corrigir na minha landing page`, `revisar landing page feita com ia`,
`prompt para melhorar landing page`.
Lands on `/`.

**Two of those were written with `minha` in them and Google refused both.** `melhorar minha landing
page` and `arrumar minha landing page` come back as `HEALTH_IN_PERSONALIZED_ADS`, the personalised
advertising policy about sensitive health information, which is a classifier reading "melhorar
minha" as somebody improving themselves. The violation is exemptible and was not exempted: filing an
exemption to keep a possessive pronoun buys nothing, and phrase match on the shorter term still
reaches the query. **Expect this from any keyword shaped like "melhorar/arrumar minha X"**, and drop
the pronoun rather than arguing with the classifier.

**2. Built with AI** -- recognition rather than intent, and the cheapest of the high intent themes
because almost nobody is bidding on it yet.
`site feito com ia`, `landing page com ia`, `criei meu site com ia`, `lovable`, `bolt new`,
`v0 vercel`, `cursor ai site`, `replit landing page`, `meu site do lovable`,
`avaliar site feito com ia`.
Lands on `/`.

**Two of those are ambiguous bare and are written long for that reason.** `cursor` alone is a mouse
pointer and a CSS property, and `replit` alone is mostly people looking for the IDE, so both carry a
qualifier. The tool names that are unambiguous stay short.

**Bidding on a tool's name is allowed as a keyword and constrained in the ad text.** Google permits
trademark terms as keywords; using one *in the ad copy* is what draws a complaint, and it is also
what our own rules already forbid, since the ad would be making a claim about a product we did not
measure. Echo the query with what we do, "Cole a URL e veja a nota", never with "Lovable pages score
badly". Expect these to be the first terms to get expensive if the category catches on.

**3. Landing page audit** -- the old core intent, still the most expensive and still the one that
converts. It is the same job described in the words the previous buyer used.
`analise de landing page`, `auditoria de landing page`, `analisar pagina de vendas`,
`revisao de landing page`, `nota da minha landing page`.
Lands on `/`.

**4. AI visibility** -- the wedge, and the reason to move now.
`como aparecer no chatgpt`, `seo para ia`, `meu site no chatgpt`, `otimizacao para ia generativa`,
`GEO seo`, `aparecer nas respostas de ia`.
Lands on `/blog/ai-is-the-new-google`, which already ends on the same button as the landing page.
Low volume, low competition, high intent, and it is the one theme where this product does something
most competitors do not have a page about: the discoverability audit and the `ai_answerability`
fixes are the actual deliverable behind the ad.

**Conversion rate is not a theme any more, and the ad group that carried it is paused rather than
deleted.** `aumentar conversao do site`, `por que meu site nao converte` and their neighbours
describe somebody watching traffic arrive and not convert. This reader deployed last week and has no
traffic at all, so the ad answered a problem they do not have yet. The words stay in the account,
paused, because they are correct for the buyer this product used to be for, and a paused group is
easier to read a year from now than a deletion.

**Copy and SEO basics is written and not built.** `o que e copywriting` and `o que e seo` land on
blog posts that still exist, and the group's job was to prove whether the blog converts at all. At
four ad groups and a R$1,50 ceiling it buys readers ahead of the themes that buy addresses, so it
waits until the lead column shows the other four producing any.

### Negatives

Set at campaign level from day one. The list matters more than the keywords do at this budget.

`curso`, `cursos`, `certificacao`, `vaga`, `vagas`, `emprego`, `salario`, `agencia`, `contratar`,
`pdf`, `apostila`, `download`, `gratis para sempre`, `como criar landing page`, `criar site gratis`,
`hospedagem`.

**Three of those are new and they exclude the reader one step too early.** Somebody searching how to
build a landing page, where to make a free site, or who hosts it has not deployed anything, and this
product needs a URL that already answers. They are the same person a month before they are worth a
click.

**Four came off this list with the repositioning, and it is worth saying why rather than editing them
away.** `template`, `templates`, `figma` and `freelancer` were negatives because they described the
old buyer's neighbours: somebody shopping for a Figma template was not going to buy a conversion
audit. The new reader is a designer or developer who builds with these tools, so those words now
describe the customer instead of excluding them. `modelo` and `exemplos` went with them for the same
reason and because both are too broad in Portuguese to be safe as negatives.

`wordpress plugin` and `elementor` went for a narrower reason: they name a stack, and the product
does not care which stack built the page. Somebody on Elementor has the same countable problems.

**`gratis` and `gratuito` are deliberately not negatives.** The score genuinely is free and needs no
account, so that query is served honestly by the product rather than baited by it, see the free
half in [invariants.md](invariants.md#the-free-half-is-what-code-counted-the-paid-half-is-what-a-model-wrote).
Watch its conversion rate and cut it if it earns nothing, but do not cut it on the assumption.

`agencia` and `contratar` are negatives because the agency buyer is exactly who this product stopped
being for, see the pivot in [product.md](product.md).

### What the ads may say

**The prohibition on causal claims applies to advertising too**, and this is the surface where
breaking it is most tempting. "Aumente sua conversao em 30%" is a number nobody measured, and it is
the same invented figure the prompts refuse to let a model write into an `evidence` field. See
[invariants.md](invariants.md#a-delta-is-arithmetic-between-two-measurements-never-a-result-attributed-to-a-change).

What an ad may say is what the product does: a score out of 100, measured on the page, in about
twenty seconds, from a URL and nothing else, with no account and nothing to install. That is a
strong offer stated accurately, and it has the useful property of being checkable in one click,
which is exactly what makes the landing page convert.

**The prompt may be named, because naming it describes what arrives rather than what it will do.**
"Tudo vira um prompt para colar de volta" is the deliverable. "E a sua pagina passa a converter" is
the sentence that must never follow it.

**The sameness counts may be named and never graded.** `lib/readout.ts` counts gradients, how many
typefaces render, icons from a stock set, rows of three cards. An ad may offer to count what a page
shares with pages built from the same defaults. It may not call any of them a defect, and it may not
say the page was generated by anything, which is the rule `samenessRules` already holds the prompts
to. A gradient is a choice.

**Naming an AI builder is context, never a claim about it.** "Fez no Lovable? Veja a nota" addresses
a reader; "Paginas do Lovable convertem menos" is a figure nobody has, and it is the same invented
number the prompts refuse in `evidence`. The rule is harder to hold here than anywhere else because
the aggressive version writes itself, and the thing this product sells is refusing to say what it
did not measure. Breaking that in our own ad is the contradiction a reader notices once.

The contrast that IS checkable is stronger anyway: a chat writes about a page it never opened, this
opens the page and counts.

**Every headline, description, sitelink and callout that is in the account lives in
[ads-assets.md](ads-assets.md)**, written to be typed in as it stands. This section is what an ad may
say; that file is what it says.

### Reading the campaign, and correcting it

`npx tsx --env-file=.env scripts/ads-funnel.mts` prints both halves over one window: cost, clicks and
the two conversion columns per ad group, then the funnel in totals from the database. **Neither half
diagnoses anything alone**, which is the whole reason it is one command. The account cannot see a run
or an address; the database cannot see which ad group bought them.

**Volume is the first question and it disqualifies every other one.** A group with fewer than about
30 clicks is not a group that converted badly, it is a group nobody has read yet. At the R$1,50
ceiling that is roughly R$45 of spend per group, and R$150 is the smallest number that says anything
at all. **Below that, change nothing**: rewriting copy against six clicks is how a campaign gets
churned into noise, and the terms here are new enough in Brazil that "no impressions" is a plausible
outcome on its own.

Then, in this order, because each step is only readable once the one above it has a number:

| What the numbers look like | What it is |
| --- | --- |
| impressions, almost no clicks | the ad text or the term. Under roughly 2% CTR on intent this specific, the query and the headline are not the same sentence |
| clicks, no addresses in the lead column | the landing page or the offer, not the ad. The click did what it was asked |
| addresses, no purchases | the price or the sequence. The sequence is two mails and stops on day 7, which is the cheapest thing here to lengthen |
| nothing anywhere after R$300 | demand. The theme does not have enough search behind it, and no amount of copy fixes that |

**The address rate is the one to watch first**, because the whole funnel arithmetic divides by it and
because it is the only step that has a per-group reading. That is exactly what the secondary lead
action was created for.

**Two conclusions are forbidden however the numbers fall.** Nothing may say a change caused a
movement, which is the same rule that governs every reader-facing surface and does not stop applying
to our own reporting, see
[invariants.md](invariants.md#a-delta-is-arithmetic-between-two-measurements-never-a-result-attributed-to-a-change).
And the lead action does not get promoted to primary because the purchase column is thin: that is the
trade named above, and it is the one change that would spend the budget on people who leave an
address and close the tab.

### Who changes what

**Copy, keywords, negatives, bids under the ceiling and pausing an ad group are changed as the
diagnosis calls for them, and reported afterwards.** All five are reversible, and all five are the
kind of correction that is worthless if it waits for a conversation.

**Four things are not changed without being asked**: the daily budget, whether the campaign runs at
all, the price of a pack, and the CPC ceiling itself. Each one decides how much money leaves rather
than where it goes, and the ceiling in particular is what the whole arithmetic above rests on, so
raising it quietly would invalidate every table in this file.

**Whatever changes, [ads-assets.md](ads-assets.md) changes with it in the same edit.** A headline
that exists only in the account is a headline nobody can review, and this file has already been the
place where a price stayed wrong for months.

### Creating and restructuring the campaigns

**No script in this repo owns the account structure**, and that is the rule rather than the method.
A file here that declared the campaigns would be a second source of truth about them, and it would
disagree with the account the first time somebody changes a bid in the UI.

What that rule does not forbid is a one-off call. The restructure that moved the account onto the
positioning above was applied through the Google Ads API with the credentials this integration
already holds, from a throwaway script that was not kept. Ads are immutable once created, so a
changed headline is a new `AdGroupAd` beside the removed one, and a changed sitelink is a new asset
linked in place of the old one. Either route is fine. What matters is that
[ads-assets.md](ads-assets.md) is updated in the same change, because that file is the only written
record of what is running.

Not from an MCP server, because none of them can do it: **Google's own Google Ads MCP server is
strictly read-only** -- it lists accessible accounts, runs GAQL queries and returns resource
metadata, and by its own documentation "cannot modify bids, pause campaigns, or create new assets."
Third-party servers that do write exist, and handing account-mutating credentials to one to save an
afternoon of setup is a bad trade.

That read-only server is genuinely useful for the other direction: pointing it at the account is the
quickest way to read back what the campaigns are doing without opening the UI, and it needs the same
developer token this integration already has.

### What the account and the code have to agree on

Two strings, and nothing else:

| In the account | In the code |
| --- | --- |
| the numeric id of `Purchase (import)` | `GOOGLE_ADS_CONVERSION_ACTION_ID` |
| the numeric id of the lead action | `GOOGLE_ADS_LEAD_CONVERSION_ACTION_ID` |

**A conversion action of type Webpage in this account can never fire**, because there is no tag on
any page, which is the whole of the section at the top of this file. If one exists, it is a leftover
from the setup wizard: it costs nothing while the import action beside it is the one that carries
the payments, and it is worth knowing about before somebody reads a goal column and concludes the
tracking is broken.
