# Hunch

## Overview

Founders know they should test but never know where to start. This removes the decision cost.

The user pastes their SaaS landing page URL. The tool scrapes the page, analyzes the copy, structure, and messaging, then generates a prioritized list of A/B test hypotheses. Each with a rationale, predicted impact, and suggested variant copy.

Hunch then closes the loop: with one embeddable snippet (no external analytics required), a chosen variant is applied to the live page client-side and its conversion rate is measured against the control, so the user sees a statistically-backed winner instead of a static plan.

## Tech stack

| Layer      | Choice                                        |
| ---------- | --------------------------------------------- |
| Framework  | Next.js App Router + TypeScript               |
| Auth       | NextAuth + Google OAuth                       |
| Scraping   | Puppeteer (self-hosted)                       |
| Styles     | Shadcn
| AI         | Claude API + Vercel AI SDK structured outputs |
| Database   | Neon Postgres + Drizzle ORM                   |
| Storage    | AI JSON output only                           |
| Billing    | Stripe only (USD)                             |
| Deployment | Vercel                                        |
| Market     | US-first, English                             |

## Monetization tiers

| Plan | Price  | Analyses/month | Live experiments | History     | Competitor mode | Seats | Export |
| ---- | ------ | -------------- | ---------------- | ----------- | --------------- | ----- | ------ |
| Free | $0     | 3              | 1 concurrent     | Last 3 only | ❌              | 1     | ❌     |
| Solo | $29/mo | Unlimited      | Unlimited        | Full        | ✅              | 1     | ✅     |
| Team | $79/mo | Unlimited      | Unlimited        | Full        | ✅              | 3     | ✅     |

## Functional requirements

- Paste a landing page URL and generate ranked A/B test hypotheses
- Optionally add a business brief so variants come back as finished, ready-to-ship copy
- Paste competitor landing pages to ground the hypotheses (paid Competitor mode; free auto-searches)
- Browse ranked hypotheses, each with an AI-recommended challenger to test (no manual variant-picking)
- Run one test at a time from a focused screen: approve/swap/edit the challenger, then launch
- Sign up, log in, log out via Google OAuth
- Track analysis history (dashboard)
- Update hypothesis status (pending -> testing -> completed -> skipped)
- Launch a live A/B test from a chosen variant, choosing a 7 / 14 / 30-day window
- Install a one-line tracking snippet on the landing page
- Auto-apply the variant copy client-side (no code changes on the user's site)
- Measure conversion rate and statistical significance per test
- Auto-finalize a test at its end date (daily cron) and produce a report with a recommendation
- Declare a winner or stop a running test
- Upgrade, downgrade, and cancel subscription via Stripe
- Export hypotheses (Solo and Team plans)
- Usage gate for free tier (hard block at 3 analyses/month; 1 concurrent live test)

## Non-functional requirements

- Scraping must handle JS-rendered pages (Puppeteer)
- AI output must be fully typed and validated via Zod before DB insert
- Stripe webhook must process events idempotently
- All authenticated routes protected via NextAuth middleware
- Free tier gate enforced server-side, never client-side only
- Public tracking endpoints (`/api/track/*`) are unauthenticated + CORS-open and excluded from auth middleware
- The embed snippet must fail safe: a bad selector or network error never breaks the host page
- Visitor bucketing must be sticky (same visitor always sees the same arm)
- Significance is evaluated once at the test's end date, not continuously (avoids the peeking problem)
- The cron finalize endpoint authenticates via `CRON_SECRET`; Vercel Cron on Hobby runs at most daily

## Local development

```bash
npx auth secret      # Generate AUTH_SECRET (paste it into .env)
cp .env.example .env # Then fill in the required values

docker compose up
npm install
npm run dev
npm run db:push
```
