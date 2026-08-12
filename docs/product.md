# Product

## Overview

Founders know they should test but never know where to start. This removes the decision cost.

The user pastes their SaaS landing page URL. The tool scrapes the page, analyzes the copy, structure
and messaging, then generates a prioritized list of A/B test hypotheses — each with a rationale, a
predicted impact and suggested variant copy.

Hunch then closes the loop: with one embeddable snippet (no external analytics required), a chosen
variant is applied to the live page client-side and its conversion rate is measured against the
control, so the user sees a statistically-backed winner instead of a static plan.

**The reader is an agency, a consultant or a freelancer selling CRO to other people**, not a founder
auditing their own page. That is why the dashboard is a grid of *clients*, why the report has two
shapes, and why the deal is closed by a person rather than a checkout button.

## Tech stack

| Layer      | Choice                                                            |
| ---------- | ----------------------------------------------------------------- |
| Framework  | Next.js App Router + TypeScript                                   |
| Auth       | NextAuth + Google OAuth                                           |
| Scraping   | Puppeteer (self-hosted)                                           |
| Styles     | Shadcn                                                            |
| AI         | Claude API + Vercel AI SDK structured outputs                     |
| Database   | Postgres + Drizzle ORM                                            |
| Storage    | AI JSON output in Postgres; variant screenshots on a local volume |
| Billing    | Stripe payment link (USD), sent after a sales call                |
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

**Account**

- Sign up, log in, log out via Google OAuth
- Switch language between English and Brazilian Portuguese
- Track past work as a grid of clients (dashboard), one card per analyzed landing page
- Usage gate for free tier: hard block at 3 analyses/month, 1 concurrent live test

## What it deliberately does not do

- **No self-serve checkout and no published price** — see
  [invariants.md](invariants.md#there-is-no-self-serve-checkout-and-no-published-price)
- **No manual variant-picking circuit.** The AI recommends one challenger; the live test decides the
  winner
- **No "set up test" button on a flow fix.** A flow fix changes structure, not one line of text, so
  the embed snippet has nothing to swap
