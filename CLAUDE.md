## Rules

Always ask instead of guessing.
Don't add unnecessary comments. Let the code explain itself; the reasoning belongs in `docs/`.
Keep it simple.
Don't repeat yourself. If a sentence would have to live in two docs, it belongs in `docs/invariants.md`
and both link to it.
Never use hardcoded hex values or raw Tailwind color classes.
Never use hardcoded values for strings, values, types and etc. Check `lib/enums.ts` and
`lib/constants.ts`. If you don't find what you need, ask me instead of creating.
Don't add unicode symbols anywhere. Emojis are allowed everywhere.
Keep documentation up to date after changing code.

## Skills

* **`humanizer`**: Always use this skill for every task in this project. Do not skip it.
* **`design-taste-frontend`**: Use this skill whenever the task involves frontend/UI/UX, visual design, styling, components, layouts, or other user-facing interface work.

## Invariants

@docs/invariants.md

## Documentation

Read the file that covers what you are about to touch. Paths are relative to the repo root.

| Doc | Read it when |
| --- | ------------ |
| `docs/product.md` | you need what the product does and for whom |
| `docs/data-model.md` | touching the schema, a column's contract, or how rows are split |
| `docs/api.md` | touching a route under `/api` (analyses, hypotheses, usage, billing) |
| `docs/ai-pipeline.md` | touching a prompt, a Zod schema, or generation |
| `docs/scraping.md` | touching `lib/scrape.ts`, the readouts, or browser concurrency |
| `docs/readout.md` | touching anything that shows a number to a reader |
| `docs/report.md` | touching the analysis surface at `/r/<embedKey>`, or the `isOwner` split through it |
| `docs/analysis-ui.md` | touching the dashboard, the analysis screen or the fix lists |
| `docs/components.md` | touching a shared component |
| `docs/i18n.md` | adding or changing any user-facing string |
| `docs/seo.md` | touching metadata, robots, the sitemap or an OG image |
| `docs/security.md` | touching auth, middleware, the URL guard, CORS or rate limiting |
| `docs/ads.md` | touching the gclid capture, the conversion upload, or the campaigns buying traffic |
| `docs/development.md` | running the app or the suites locally |
| `docs/deployment.md` | deploying, or debugging a Railway service |
