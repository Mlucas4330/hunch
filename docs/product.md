# Product

## Overview

**Hunch is a landing page audit that agencies use with their clients.** An agency pastes a client's
URL and gets a report: Google PageSpeed Insights scores for the page, what its robots.txt lets AI
crawlers read, and the errors in its structure, copy, SEO and AI visibility.

**The report points out errors and does not write the fix.** Each item quotes or names what is wrong
on the page and says why it is a problem. There is no replacement copy, no implementation steps and
no prompt to paste into another tool. What the agency does about an error is the agency's work.

**The focus is AI visibility.** The AI tab and the AI crawler check are the part of the report most
agencies cannot produce with the tools they already pay for.

**The report is shared by link.** `/r/<embedKey>` is readable by anyone holding the link, so the
agency can send it to its client. See [report.md](report.md).

**The report carries the agency's brand.** At `/settings` the agency uploads a logo and sets its name
once, and every report it owns shows them in place of Hunch. See
[invariants.md](invariants.md#the-agencys-brand-comes-from-one-resolver-on-three-surfaces).

## How an account works

**An agency subscribes from the price list, and the quota lands on its own.** The tier's button opens
a Mercado Pago preapproval, the reader confirms it on the provider's page, and the webhook writes the
tier and its quota onto the row. An operator can still set a quota by hand at `/admin/accounts`, which
is how an account is provisioned before anyone there has signed in, and how anything agreed outside
the price list is honoured. The rule is in
[invariants.md](invariants.md#access-is-a-quota-read-from-the-row-written-by-the-subscription-or-by-an-operator).

**A new account gets `TRIAL_RUNS` analyses before it pays for anything.** A one-time credit rather
than a free plan: nothing refills it, it is spent before the monthly quota, and a run that failed
gives it back.

**There are three tiers.** `PLAN_TIER` names them and `PLAN` in `lib/constants.ts` carries what each
one costs a month and how many runs it buys. `users.plan_tier` records which one a live subscription
is on, written only by the webhook.

| Tier | Price | Quota | Sold to |
| ---- | ----- | ----- | ------- |
| Studio | R$197 | 20 runs | an agency with three to five clients |
| Agency | R$397 | 60 runs | ten to twenty clients, plus new business. **The tier the price list marks** |
| Network | R$797 | 200 runs | a report a day, or a sales team |

**Every run spends SE Ranking credits**: about 310 for the page (100 for the backlink summary, one per
referring domain listed, 100 for the keywords and 100 for the overview), and the same again with a
competitor. The real consumption is read from `account/subscription`, and it is the floor under the
prices above.

**A tier is mostly a price.** What it buys is the quota, and every account sees the same report.
The one exception is bulk generation, sold with Agency and Network and gated on the stored tier
through `BULK_PLAN_TIERS`. Running out means moving up a tier rather than buying a single run: there
is nothing that sells one.

- **A quota is runs per calendar month (UTC).** A new analysis is one run, and so is every "Run again"
  on an existing one. A run that failed does not count, and deleting an analysis does not give its
  runs back.
- **The address does not need to have signed in first.** `setQuota` creates the row, and the first
  sign-in with a verified address claims it.
- **An account with no quota and no trial left can sign in and cannot run an analysis.** The dashboard
  says so, points at the price list, and the form is disabled.

**`/` is the landing page for a signed-out visitor**, and sends a signed-in one to the dashboard. It
explains the product to agencies and offers four actions, in this order: WhatsApp, the sample report
when the database holds one, email, and sign in. It prints the three tiers with their quotas and features,
and each tier carries a subscribe button, which sends a signed-out reader to sign in first. There is
no anonymous analysis. The blog stays public. See [analysis-ui.md](analysis-ui.md#landing-appapppagetsx).

## What an analysis produces

- **PageSpeed Insights, mobile.** The four Lighthouse category scores, their average as the report's
  score, the audits that failed, and field data from real Chrome visitors when Google has it. See
  [readout.md](readout.md).
- **AI crawler access.** Which AI crawlers the site's robots.txt blocks, whether it blocks everything,
  and whether it declares a sitemap. Counted by this code, because PageSpeed Insights does not check it.
- **A crawl of the site.** Up to `CRAWL_PAGE_MAX` pages read by fetch: broken pages, redirects,
  noindex, missing or repeated titles and descriptions, H1s and thin pages. See
  [readout.md](readout.md#site-crawl).
- **Backlinks and Google rankings, estimated by SE Ranking.** Referring domains, domain rank,
  backlinks, and the keywords the domain ranks for in its market, beside the competitor's when there is
  one. See [invariants.md](invariants.md#index-numbers-say-where-they-came-from).
- **Four error lists**, written by a model from the scraped page and the PageSpeed audits: structure,
  copy, SEO and AI. See [ai-pipeline.md](ai-pipeline.md).
- **An optional comparison page.** The agency may name a second URL; it is measured the same way and
  its scores render beside the client's.
- **A history.** The owner can run the page again: the error lists are rewritten behind the same link,
  and the report shows how the scores moved.

## Tech stack

| Layer      | Choice                                                            |
| ---------- | ----------------------------------------------------------------- |
| Framework  | Next.js App Router + TypeScript                                   |
| Auth       | NextAuth + Google, optionally GitHub                              |
| Scraping   | Puppeteer (self-hosted)                                           |
| Measurement| Google PageSpeed Insights API                                     |
| Styles     | Tailwind v4 tokens + Shadcn primitives, light and dark            |
| AI         | Claude API + Vercel AI SDK structured outputs                     |
| Database   | Postgres + Drizzle ORM                                            |
| i18n       | Cookie-driven dictionaries (`en`, `pt-BR`)                        |
| Deployment | Railway (app, dedicated browser, Postgres, Redis)                 |

## What it deliberately does not do

- **No fix is written.** No replacement copy, no steps, no prompt. The schemas have no field for any
  of them, and `business_impact` is not one: it names what an error costs, which is a consequence and
  not a remedy. See [ai-pipeline.md](ai-pipeline.md).
- **No credits and no one-off purchases.** What is sold is a monthly subscription, as a Mercado Pago
  preapproval; the app stores the tier and the quota and never a card. There is no ledger, no balance
  and nothing to top up, and the trial is a column rather than an account of credits.
- **No anonymous analysis, no lead capture, no email sequence.**
- **No third-party tracker on any surface.** No tag manager, no analytics script, no ad pixel.
- **No live A/B testing.** It would need a snippet on the client's site and traffic most landing pages
  do not have.
- **No colour or layout customisation.** The agency's brand is its logo and its name, nothing else.
