# Hunch

Paste a landing page URL and get a measured teardown: ranked wording fixes with the replacement copy
already written, a flow playbook, a discoverability audit, and numbers counted off the page itself.
On a paid plan the whole document goes out under the agency's own brand, with no mark of ours and no
signup wall.

The reader is an agency, a consultant or a freelancer selling CRO to other people. See
[docs/product.md](docs/product.md).

## Tech stack

Next.js App Router + TypeScript · NextAuth + Google OAuth · Puppeteer · Shadcn · Claude API + Vercel AI
SDK · Postgres + Drizzle · Stripe · Railway.

## Quick start

```bash
npx auth secret      # Generate AUTH_SECRET (paste it into .env)
cp .env.example .env # Then fill in the required values

docker compose up
npm install
npm run dev
npm run db:push
```

```bash
npm run typecheck
npm test                            # unit suite over lib/**/*.test.ts
npm run test:e2e                    # Playwright on port 3100 with E2E_FIXTURES=1
npx playwright test --project=dom   # just the DOM specs: no sign in, no database
```

Full setup, what each suite covers and what it deliberately cannot cover:
[docs/development.md](docs/development.md).

## Documentation

**[docs/invariants.md](docs/invariants.md) comes first.** It holds the rules that cross subsystems —
what may be stated as a measurement, what a model may never assert, what white-label actually covers.
If a sentence would have to appear in two docs, it belongs there and both link to it.

| Doc | Read it when |
| --- | ------------ |
| [invariants.md](docs/invariants.md) | always — the cross-cutting rules |
| [product.md](docs/product.md) | you need what the product does and for whom |
| [data-model.md](docs/data-model.md) | touching the schema, a column's contract, or how rows are split |
| [api.md](docs/api.md) | touching a route under `/api` (analyses, hypotheses, usage, billing) |
| [ai-pipeline.md](docs/ai-pipeline.md) | touching a prompt, a Zod schema, or generation |
| [scraping.md](docs/scraping.md) | touching `lib/scrape.ts`, the readouts, or browser concurrency |
| [readout.md](docs/readout.md) | touching anything that shows a number to a reader |
| [report.md](docs/report.md) | touching the public report, the print report or white-label |
| [analysis-ui.md](docs/analysis-ui.md) | touching the dashboard, the analysis screens or the fix lists |
| [components.md](docs/components.md) | touching a shared component |
| [i18n.md](docs/i18n.md) | adding or changing any user-facing string |
| [seo.md](docs/seo.md) | touching metadata, robots, the sitemap or an OG image |
| [security.md](docs/security.md) | touching auth, middleware, the URL guard, CORS or rate limiting |
| [development.md](docs/development.md) | running the app or the suites locally |
| [deployment.md](docs/deployment.md) | deploying, or debugging a Railway service |
