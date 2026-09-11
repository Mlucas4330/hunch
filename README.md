# Hunch

A landing page audit for agencies. Paste a client's URL and get a report: Google PageSpeed Insights
scores, what the site's robots.txt lets AI crawlers read, and the errors in the page's structure,
copy, SEO and AI visibility. **The report points out errors and does not write the fix.** It is shared
with the client by link. See [docs/product.md](docs/product.md).

Access is a monthly quota an operator sets after the subscription is closed outside the app.

## Tech stack

Next.js App Router + TypeScript · NextAuth (Google, optionally GitHub) · Puppeteer · PageSpeed
Insights API · shadcn/ui + Tailwind v4 · Claude API + Vercel AI SDK · Postgres + Drizzle · Redis ·
Railway.

## Quick start

```bash
npx auth secret      # Generate AUTH_SECRET (paste it into .env)
cp .env.example .env # Then fill in the required values

docker compose up    # Postgres and Redis
npm install
npm run dev
npm run db:push
```

`REDIS_URL` is **required**: it is the job queue as well as the rate limiter, and without it every
analysis answers `503`. `ANTHROPIC_API_KEY` is required for the error lists and `PAGESPEED_API_KEY`
for the PageSpeed section. An account needs a quota before it can run an analysis: set one at
`/admin/accounts`.

```bash
npm run typecheck
npm test                            # unit suite over lib/**/*.test.ts
npm run test:e2e                    # Playwright on port 3100 with E2E_FIXTURES=1
npx playwright test --project=dom   # just the DOM specs: no sign in, no database
```

Full setup and what each suite covers: [docs/development.md](docs/development.md).

## Documentation

**[docs/invariants.md](docs/invariants.md) comes first.** It holds the rules that cross subsystems.
If a sentence would have to appear in two docs, it belongs there and both link to it.

| Doc | Read it when |
| --- | ------------ |
| [invariants.md](docs/invariants.md) | always, for the cross-cutting rules |
| [product.md](docs/product.md) | you need what the product does and for whom |
| [data-model.md](docs/data-model.md) | touching the schema, a column's contract, or how rows are split |
| [api.md](docs/api.md) | touching a route under `/api` |
| [ai-pipeline.md](docs/ai-pipeline.md) | touching a prompt, a Zod schema, or generation |
| [scraping.md](docs/scraping.md) | touching `lib/scrape.ts` or browser concurrency |
| [readout.md](docs/readout.md) | touching PageSpeed Insights or anything that shows a number |
| [report.md](docs/report.md) | touching the analysis surface at `/r/<embedKey>` |
| [analysis-ui.md](docs/analysis-ui.md) | touching the dashboard, the admin screen or the error lists |
| [components.md](docs/components.md) | touching a shared component |
| [i18n.md](docs/i18n.md) | adding or changing any user-facing string |
| [seo.md](docs/seo.md) | touching metadata, robots, the sitemap or an OG image |
| [security.md](docs/security.md) | touching auth, middleware, the URL guard, CORS or rate limiting |
| [development.md](docs/development.md) | running the app or the suites locally |
| [deployment.md](docs/deployment.md) | deploying, or debugging a Railway service |

**The docs describe what the product does now.** They are not a changelog: git carries that.
