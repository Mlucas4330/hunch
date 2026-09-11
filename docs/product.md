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

**The subscription is sold and billed outside the app.** Once the agency has paid, an operator sets
the account's monthly quota at `/admin/accounts`. The rule is in
[invariants.md](invariants.md#access-is-a-monthly-quota-an-operator-sets-read-from-the-row).

- **A quota is runs per calendar month (UTC).** A new analysis is one run, and so is every "Run again"
  on an existing one. A run that failed does not count, and deleting an analysis does not give its
  runs back.
- **The address does not need to have signed in first.** `setQuota` creates the row, and the first
  sign-in with a verified address claims it.
- **An account with no quota can sign in and cannot run an analysis.** The dashboard says so and the
  form is disabled.

**`/` is the landing page for a signed-out visitor**, and sends a signed-in one to the dashboard. It
explains the product to agencies and offers two actions: contact by email and sign in. It shows no
prices, because the subscription is sold outside the app. There is no anonymous analysis. The blog
stays public. See [analysis-ui.md](analysis-ui.md#landing-appapppagetsx).

## What an analysis produces

- **PageSpeed Insights, mobile.** The four Lighthouse category scores, their average as the report's
  score, the audits that failed, and field data from real Chrome visitors when Google has it. See
  [readout.md](readout.md).
- **AI crawler access.** Which AI crawlers the site's robots.txt blocks, whether it blocks everything,
  and whether it declares a sitemap. Counted by this code, because PageSpeed Insights does not check it.
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
  of them. See [ai-pipeline.md](ai-pipeline.md).
- **No payment in the app.** No checkout, no credits, no webhooks.
- **No anonymous analysis, no lead capture, no email sequence.**
- **No third-party tracker on any surface.** No tag manager, no analytics script, no ad pixel.
- **No live A/B testing.** It would need a snippet on the client's site and traffic most landing pages
  do not have.
- **No colour or layout customisation.** The agency's brand is its logo and its name, nothing else.
