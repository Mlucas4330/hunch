# Product

## Overview

**The reader is an agency, a consultant or a freelancer selling CRO to other people**, not a founder
auditing their own page. That is why the dashboard is a grid of *clients*, why the report has two
shapes, and why the deal is closed by a person rather than a checkout button.

The user pastes a client's landing page URL. The tool scrapes the page, analyzes the copy, structure
and messaging, then produces a prioritized set of recommendations — each with a rationale and, where
the change is a line of text, the new copy already written.

## One stage, and that is the whole product

The agency runs an analysis and hands over a report. It needs **the URL and nothing else**: no access
to the client's site, no cooperation from the client's developer, nothing installed anywhere. On a
paid plan the report carries the agency's own logo and name and nothing of ours, because it is the
document they put in front of a prospect to win the work. See [report.md](report.md).

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
| Auth       | NextAuth + Google OAuth, optionally Microsoft Entra ID            |
| Scraping   | Puppeteer (self-hosted)                                           |
| Styles     | Shadcn                                                            |
| AI         | Claude API + Vercel AI SDK structured outputs                     |
| Database   | Postgres + Drizzle ORM                                            |
| Storage    | AI JSON output in Postgres; variant screenshots on a local volume |
| Billing    | Stripe payment link (USD), sent after a sales call                |
| Onboarding | The plan is granted by email in `/admin/accounts`; sign-in claims it |
| i18n       | Cookie-driven dictionaries (`en`, `pt-BR`)                        |
| Deployment | Railway (app, dedicated browser, Postgres, Redis, cron)           |

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
- Paste competitor landing pages to ground the hypotheses (paid Competitor mode; free auto-searches in
  the market the page itself sells into)

**Decide**

- Browse ranked hypotheses, each with one AI-recommended replacement line
- Ask for two alternate options per idea, written on demand from the analysis screen
- See the recommended copy rendered onto a screenshot of the real page before handing it over

**Hand over**

- Share a public report link (`/r/<embedKey>`). On a free plan it is our lead magnet: branded, top
  fixes previewed, the rest behind a waitlist wall. On a paid plan it is the customer's **deliverable**
  — no mark of ours, no wall, nothing blurred — because the reader is an agency handing it to their
  own client. See [report.md](report.md).
- Put the agency's own logo, name and accent colour on every report from `/settings`, once per account
- Open both documents on a cover written for the client's business owner rather than for a developer

**Account**

- Sign up, log in, log out via Google OAuth
- Switch language between English and Brazilian Portuguese
- Track past work as a grid of clients (dashboard), one card per analyzed landing page
- Usage gate for free tier: hard block at 3 analyses/month

## How a customer gets in

There is no invite, no password to issue and no transactional email anywhere in the product. The whole
handover is two moves:

1. **Grant the plan** in `/admin/accounts`, on the email the buyer will sign in with. The account does
   not have to exist — the row is created holding the plan, and `last_sign_in_at` stays null until
   somebody claims it, which is the operator's own to-do list.
2. **Send the payment link.** The webhook resolves the same email and keeps the plan in sync from
   there on; if the buyer pays before ever signing in, it creates the row itself rather than dropping
   the sale.

The buyer then signs in with Google, or with Microsoft where that provider is configured, and the plan
is already there. See
[invariants.md](invariants.md#a-user-row-may-exist-before-its-first-sign-in-and-only-a-provider-verified-email-may-claim-one)
for why the entitlement and the identity are written by different paths.

Revoking is the same screen. It takes effect on the next request, not the next login.

## What it deliberately does not do

- **No self-serve checkout and no published price** — see
  [invariants.md](invariants.md#there-is-no-self-serve-checkout-and-no-published-price)
- **No live A/B testing, no snippet, no tracking, no significance.** See the section above for why
  that stage was removed rather than fixed
- **No causal claim on any surface.** Nothing states what a change will produce, because nothing here
  controlled for anything — see
  [invariants.md](invariants.md#a-delta-is-arithmetic-between-two-measurements-never-a-result-attributed-to-a-change)
