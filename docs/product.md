# Product

## Overview

**The reader owns the landing page.** They paste their own URL, get a score out of 100 measured on the
page, and unlock the ranked fixes — each with a rationale and, where the change is a line of text, the
new copy already written.

**It used to be sold to agencies**, and that is why so much of this doc reads as a demolition report.
The reader was a consultant selling CRO to someone else: the dashboard was a grid of *clients*, the
report had two shapes so it could be handed on under the agency's own brand, and the deal was closed
by a person rather than a checkout. None of that survives. White-label, plans, the print report, the
waitlist and the operator screens were deleted rather than left dormant.

**Why the pivot:** the agency framing was never validated with a single customer, and the two things
that made it expensive — a brand system on four surfaces, and a sale that needed a call — were both
bets on a buyer nobody had spoken to. The score is a smaller promise that the product could already
keep.

## One stage, and that is the whole product

Paste a URL, get an analysis. It needs **the URL and nothing else**: no access to the site, no
cooperation from a developer, nothing installed anywhere. See [report.md](report.md).

**There used to be a second stage**, a live A/B test that measured a chosen variant against the
control on real traffic. It is gone, and the reasons are worth keeping:

- **It was never validated end to end.** No snippet was ever installed on a real client site, with a
  real CSP and a real tag manager.
- **Most clients could not have used it.** Required sample scales with `(1-p)/p`: on a form-fill goal
  converting at 2%, detecting a 25% lift needs about 27,600 impressions. A landing page doing a
  thousand visitors a month never gets there, so the window closes with no verdict.
- **It asked for the hardest thing in the sale**: access to someone else's site plus a developer
  marking an element.

The consequence to keep in mind: **nothing in this product makes a causal claim.** The readout says
what was counted, and no surface says what a change will produce — see
[invariants.md](invariants.md#a-delta-is-arithmetic-between-two-measurements-never-a-result-attributed-to-a-change).

## Tech stack

| Layer      | Choice                                                            |
| ---------- | ----------------------------------------------------------------- |
| Framework  | Next.js App Router + TypeScript                                   |
| Auth       | NextAuth + Google, optionally GitHub                               |
| Scraping   | Puppeteer (self-hosted)                                           |
| Styles     | Shadcn                                                            |
| AI         | Claude API + Vercel AI SDK structured outputs                     |
| Database   | Postgres + Drizzle ORM                                            |
| Storage    | AI JSON output in Postgres; variant screenshots on a local volume |
| Billing    | Credit packs via Mercado Pago (Pix, card, boleto) or Stripe        |
| i18n       | Cookie-driven dictionaries (`en`, `pt-BR`)                        |
| Deployment | Railway (app, dedicated browser, Postgres, Redis, prune cron)     |

## What it does

**Analyze**

- Paste a landing page URL and generate ranked wording fixes, each with the replacement copy written
- Get a ranked flow playbook alongside them: structural fixes with implementation steps (offer login
  with Google, cut the signup form, add a Q&A block, repeat the CTA after pricing), grounded in a
  measured structural readout of the page rather than in a guess at what it contains
- Get a discoverability audit alongside them: what the page declares about itself (title, description,
  canonical, structured data) and what its robots.txt allows
- Get a measured readout of the page itself — counted, never generated (see [readout.md](readout.md))
- Optionally add a business brief so variants come back as finished, ready-to-ship copy

**Decide**

- Browse ranked hypotheses, each with one AI-recommended replacement line
- Ask for two alternate options per idea, written on demand from the analysis screen
- See the recommended copy rendered onto a screenshot of the real page before handing it over

**Read**

- Three posts at `/blog`, written for the person who arrived from an ad: what SEO is, what copy is,
  and what changes now that people ask an assistant instead of searching. Each one ends on the same
  button as the landing page. See [analysis-ui.md](analysis-ui.md#the-blog).

**Share**

- Share the analysis link (`/r/<embedKey>`), read with no session and authorized by the opaque key
  alone. It is the same page the owner reads, minus the controls that spend something. See
  [report.md](report.md).

**Account**

- Sign up, log in, log out via Google, or GitHub when it is configured
- Switch language between English and Brazilian Portuguese
- Track past pages as a grid on the dashboard, one card per analyzed landing page

## How a customer pays

**Credits, bought outright.** One credit unlocks one full analysis; the score is always free. Two
packs on the home page — R$147 for one analysis, R$297 for three — and a webhook grants once the
payment is confirmed.

Mercado Pago takes the money today, through a Payment Brick embedded in the page: Pix, card and
boleto, and a CPF is enough to receive. Stripe stays wired behind the same buttons for when there is
a company to register it to.

The reasoning worth keeping:

- **Credits are not a subscription.** A page owner audits twice a year, and a monthly plan *on that
  usage* is a cancellation waiting to happen.

  **There was a subscription and it has been deleted**, which is the second demolition in this doc
  and worth the same treatment as the first. `MONITORING_PLAN` billed R$97 a month to measure the
  page again every week and mail the owner what moved. Two things were wrong with it, and only the
  second is obvious in hindsight:

  - **It delivered silence most months.** The mail fires only on a regression, deliberately — see
    [invariants.md](invariants.md). That is the right rule for a notification and a fatal one for a
    product, because the thing being watched is a landing page, and a landing page that nobody has
    touched does not regress. The subscriber paid monthly to be told nothing, which is not a
    perception problem to be fixed with copy.
  - **It was dominated by the offer next to it.** Four credits for R$97 sat beside ten for R$99. A
    reader comparing the two cards was being asked to pay more per analysis for the privilege of
    also being watched.

  It existed to make paid acquisition arithmetic work — one purchase gives one transaction to repay
  a click, which fails the moment clicks are bought. That problem was real and is now answered by
  the price of the analysis instead. See [ads.md](ads.md).
- **The pack sizes are a question as much as an offer.** Someone with one landing page needs one;
  someone with a funnel needs three. The pack of ten went with the subscription: it priced an
  analysis at R$9,90, which made the cheapest thing on the page the one nobody this was rebuilt for
  had a use for.
- **The price is set against acquisition, not against the token bill.** An analysis costs a couple of
  reais to produce and sells for R$147. The margin is not the point; the point is that a single
  purchase has to be able to repay a click on its own, and R$19 could not. See [ads.md](ads.md),
  which also carries the honest caveat that R$147 only barely can.
- **Granting is provider-agnostic**, keyed on `(provider, provider_ref)`. Stripe cannot charge in BRL
  without a registered company, which is exactly why the second provider exists — and the adapter
  shape is what kept adding it from being a rewrite: `lib/credits.ts` did not change. See
  [invariants.md](invariants.md#credits-are-granted-by-one-internal-path-and-no-provider-code-touches-the-tables).
- **A row may exist before its first sign-in.** Someone can pay before they have ever opened the app;
  the webhook creates the row holding the credits, and the first sign-in claims it.

## What it deliberately does not do

- **No white-label, no plans, no PDF, no lead capture.** All four were built for a reader who sold
  audits to other people, and all four were deleted rather than left dormant
- **No transactional email anywhere**, which is why sign-in is OAuth only
- **No live A/B testing, no snippet, no significance.** See the section above for why that stage was
  removed rather than fixed
- **No third-party tracker on any surface.** This line used to read "no tracking" flatly, and that
  became untrue the day the product started buying traffic: a paid click now leaves a first-party
  cookie holding its Google Ads click id, and a confirmed payment is reported to Google from the
  server. What still holds, and is the part worth stating, is that **nothing is loaded from a third
  party into any page** -- no tag manager, no analytics script, no pixel. The distinction is not
  pedantry: the product charges people to be told their page is heavy, so a tag container on our own
  landing page would be it failing its own audit. See [ads.md](ads.md)
- **No causal claim on any surface.** Nothing states what a change will produce, because nothing here
  controlled for anything — see
  [invariants.md](invariants.md#a-delta-is-arithmetic-between-two-measurements-never-a-result-attributed-to-a-change)
- **No competitor is ever inferred, and none is ever searched for.** The product can compare against a
  second page, and only against one the reader typed into the form: it is then scraped and counted by
  the same code as the first. The version that had a model recall what competitors do is gone and is
  not coming back — see
  [invariants.md](invariants.md#a-generated-evidence-carries-a-number-only-from-a-page-this-code-measured)
