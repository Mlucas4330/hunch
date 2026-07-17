# Hunch

## Overview

Founders know they should test but never know where to start. This removes the decision cost.

The user pastes their SaaS landing page URL. The tool scrapes the page, analyzes the copy, structure,
and messaging, then generates a prioritized list of A/B test hypotheses. Each one comes with a
rationale, predicted impact and effort scores, and suggested variant copy, ranked so the strongest
challenger to test first is obvious. The result can be viewed as a ranked list or as a clean,
printable report.

## Tech stack

| Layer      | Choice                                        |
| ---------- | --------------------------------------------- |
| Framework  | Next.js App Router + TypeScript               |
| Auth       | NextAuth + Google OAuth                       |
| Scraping   | Puppeteer (self-hosted)                       |
| Styles     | Shadcn                                        |
| AI         | Claude API + Vercel AI SDK structured outputs |
| Database   | Postgres + Drizzle ORM                        |
| Market     | US-first, English                             |

## Functional requirements

- Paste a landing page URL and generate ranked A/B test hypotheses
- Optionally add a business brief so variants come back as finished, ready-to-ship copy
- Optionally paste competitor landing pages to ground the hypotheses (otherwise auto web-search)
- Browse ranked hypotheses, each with an AI-recommended challenger and a rationale
- View a clean, printable report for any analysis
- Sign up, log in, log out via Google OAuth (plus an admin credentials login for local/e2e)
- Track analysis history (dashboard)

## Non-functional requirements

- Scraping must handle JS-rendered pages (Puppeteer)
- AI output must be fully typed and validated via Zod before DB insert
- All authenticated routes protected via NextAuth middleware
- Scraping runs a real Chromium via Puppeteer, so the app must run in a Node environment (not edge)

## Local development

Only Postgres runs in Docker; the app itself runs on the host with hot reload.

```bash
npx auth secret      # Generate AUTH_SECRET (paste it into .env)
cp .env.example .env # Then fill in the required values

docker compose up db   # Postgres
npm install
npm run db:push
npm run dev
```

Puppeteer downloads its own Chromium on `npm install`, so scraping works out of the box.
