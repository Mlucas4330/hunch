# Product

## Overview

**The reader is an agency, a consultant or a freelancer selling CRO to other people**, not a founder
auditing their own page. That is why the dashboard is a grid of *clients*, why the report has two
shapes, and why the deal is closed by a person rather than a checkout button.

The user pastes a client's landing page URL. The tool scrapes the page, analyzes the copy, structure
and messaging, then produces a prioritized set of recommendations — each with a rationale and, where
the change is a line of text, the new copy already written.

## Two stages, and they are not the same product

**Stage 1 — the pitch.** The agency runs an analysis and hands over a report. It needs **the URL and
nothing else**: no snippet, no access to the client's site, no cooperation from the client's developer.
On a paid plan the report carries the agency's own logo and name and nothing of ours, because it is the
document they put in front of a prospect to win the work. See [report.md](report.md).

**This stage is the product.** It is what the paid plan is bought for, it is what runs before the deal
exists, and it is the surface every other decision here answers to.

**Stage 2 — the proof.** A live A/B test measures a chosen variant against the control on real traffic.
It needs the snippet installed and the conversion element marked, which means access to the client's
site — so it comes **after** the work is won, and for some clients it never comes at all. It is the
strongest thing the product can say, and it is deliberately not the thing it leads with.

**The split is navigation, not just positioning.** Stage 1 is `/analyses/[id]` and its four tabs, all
of which need nothing but the URL. Stage 2 is `/analyses/[id]/tests`, reached from a named block at the
foot of the analysis that says what it requires. They were one screen once — the step needing site
access sat as a fifth tab beside four that needed none — and that is the confusion this separation
exists to end. See [analysis-ui.md](analysis-ui.md).

Two consequences worth stating, because they are easy to un-learn:

- **The report never mentions the snippet.** Nothing about running a test reaches either report surface,
  and a prospect reading someone else's teardown installs nothing.
- **A client who never installs the snippet is a normally-served customer**, not a half-onboarded one.

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

- Paste a landing page URL and generate ranked A/B test hypotheses
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

- Browse ranked hypotheses, each with an AI-recommended challenger to test (no manual variant-picking)
- Swap the recommendation for one of two alternates, written on demand on the run-a-test screen
- Update hypothesis status (pending -> testing -> completed -> skipped)
- Export hypotheses (paid plan)

**Prove**

- Install a one-line tracking snippet on the landing page, and mark the element a click on which
  counts as a conversion with one fixed attribute
- Launch a live A/B test from a chosen variant, over a 7 / 14 / 30-day window
- Auto-apply the variant copy client-side, so **the copy** needs no change to the page; marking the
  conversion element is the one edit the install does require
- Measure conversion rate and statistical significance per test
- Auto-finalize a test at its end date (daily cron) and produce a report with a recommendation
- Declare a winner or stop a running test

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
- Usage gate for free tier: hard block at 3 analyses/month, 1 concurrent live test

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
- **No manual variant-picking circuit.** The AI recommends one challenger; the live test decides the
  winner
- **No "set up test" button on a flow fix.** A flow fix changes structure, not one line of text, so
  the embed snippet has nothing to swap
