# Hunch

## Overview

Founders know they should test but never know where to start. This removes the decision cost.

The user pastes their SaaS landing page URL. The tool scrapes the page, analyzes the copy, structure, and messaging, then generates a prioritized list of A/B test hypotheses. Each with a rationale, predicted impact, and suggested variant copy.

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

| Plan | Price  | Analyses/month | History     | Competitor mode | Seats | Export |
| ---- | ------ | -------------- | ----------- | --------------- | ----- | ------ |
| Free | $0     | 3              | Last 3 only | ❌              | 1     | ❌     |
| Solo | $29/mo | Unlimited      | Full        | ✅              | 1     | ✅     |
| Team | $79/mo | Unlimited      | Full        | ✅              | 3     | ✅     |

## Functional requirements

- Paste a landing page URL and generate ranked A/B test hypotheses
- Sign up, log in, log out via Google OAuth
- Track analysis history (dashboard)
- Update hypothesis status (pending -> testing -> completed -> skipped)
- Upgrade, downgrade, and cancel subscription via Stripe
- Export hypotheses (Solo and Team plans)
- Usage gate for free tier (hard block at 3 analyses/month)

## Non-functional requirements

- Scraping must handle JS-rendered pages (Puppeteer)
- AI output must be fully typed and validated via Zod before DB insert
- Stripe webhook must process events idempotently
- All authenticated routes protected via NextAuth middleware
- Free tier gate enforced server-side, never client-side only

## Local development

```bash
npx auth secret      # Generate AUTH_SECRET (paste it into .env)
cp .env.example .env # Then fill in the required values

docker compose up
npm install
npm run dev
npm run db:push
```
