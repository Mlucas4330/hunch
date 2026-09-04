# Hunch

Paste a landing page URL and get a score out of 100, measured on the page itself: form fields, calls
to action above the fold, load timings, alt text, what the head declares, what robots.txt allows.
**The score is free and needs no account.** A credit buys the half a model writes: ranked fixes, the
replacement copy already written, and a preview of it rendered onto a screenshot of the real page.

The reader owns the landing page. See [docs/product.md](docs/product.md).

## Tech stack

Next.js App Router + TypeScript · NextAuth (Google, optionally GitHub) · Puppeteer · shadcn/ui +
Tailwind v4 · Claude API + Vercel AI SDK · Postgres + Drizzle · Redis · Mercado Pago and Stripe ·
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

`REDIS_URL` is **required**, not optional: it is the job queue as well as the rate limiter, and
without it every analysis answers `503`. `ANTHROPIC_API_KEY` is required for the generated half; the
measured half runs without it.

```bash
npm run typecheck
npm test                            # unit suite over lib/**/*.test.ts
npm run test:e2e                    # Playwright on port 3100 with E2E_FIXTURES=1
npx playwright test --project=dom   # just the DOM specs: no sign in, no database
npm run seed:pulse                  # local only: enough domains to see the landing board
```

Full setup, what each suite covers and what it deliberately cannot cover:
[docs/development.md](docs/development.md).

## The two halves

The cut runs through the whole codebase and is worth knowing before reading any of it:

- **Measured.** `lib/readout.ts`, `lib/score.ts`, `lib/keywords.ts`. Pure arithmetic over what the
  scrape counted. **No model is called**, so a run nobody paid for costs a browser slot and zero
  tokens. Never gated, on any surface.
- **Generated.** `lib/ai/`. Hypotheses, replacement copy, the flow playbook, the visibility audit.
  Costs a credit.

`analyses.user_id` is the whole switch: ownerless means measured only. There is no flag, and adding
one would be a second source of truth that can disagree.

## Documentation

**[docs/invariants.md](docs/invariants.md) comes first.** It holds the rules that cross subsystems:
what may be stated as a measurement, what a model may never assert, how a balance is allowed to move.
If a sentence would have to appear in two docs, it belongs there and both link to it.

| Doc | Read it when |
| --- | ------------ |
| [invariants.md](docs/invariants.md) | always, for the cross-cutting rules |
| [product.md](docs/product.md) | you need what the product does and for whom |
| [data-model.md](docs/data-model.md) | touching the schema, a column's contract, or how rows are split |
| [api.md](docs/api.md) | touching a route under `/api` (analyses, hypotheses, billing) |
| [ai-pipeline.md](docs/ai-pipeline.md) | touching a prompt, a Zod schema, or generation |
| [scraping.md](docs/scraping.md) | touching `lib/scrape.ts`, the readouts, or browser concurrency |
| [readout.md](docs/readout.md) | touching anything that shows a number to a reader |
| [report.md](docs/report.md) | touching the analysis surface at `/r/<embedKey>`, or the `isOwner` split through it |
| [analysis-ui.md](docs/analysis-ui.md) | touching the landing page, the dashboard, the analysis screen or the fix lists |
| [components.md](docs/components.md) | touching a shared component |
| [i18n.md](docs/i18n.md) | adding or changing any user-facing string |
| [seo.md](docs/seo.md) | touching metadata, robots, the sitemap or an OG image |
| [security.md](docs/security.md) | touching auth, middleware, the URL guard, CORS or rate limiting |
| [development.md](docs/development.md) | running the app or the suites locally |
| [deployment.md](docs/deployment.md) | deploying, or debugging a Railway service |

**The docs describe what the product does now.** A rule that exists to keep a shape out says so as a
rule, in the present tense, with the reason it holds. They are not a changelog: git carries that.
