# The measured readout

`components/measured-readout.tsx`, `components/section-evidence.tsx`, `components/readout-score.tsx`,
`lib/pagespeed.ts`.

The readout is what was measured on the page, and it has two sources:

- **Google PageSpeed Insights**, for everything about load, accessibility, best practices and SEO.
- **This code**, for the one thing PageSpeed Insights does not check: what the site's robots.txt lets
  an AI crawler read.

## PageSpeed Insights

`fetchPageSpeed(url, locale)` makes one GET to `PAGESPEED_API_URL` with `strategy=mobile`, all four
`PAGESPEED_CATEGORY` values, the analysis locale (so audit titles come back in that language) and
`PAGESPEED_API_KEY`. It runs beside the scrape in `measurePage`, because it runs on Google's side and
takes no browser slot.

**It is fail-soft.** No key, a timeout (`PAGESPEED_TIMEOUT_MS`) or an error answer all resolve to
`null` and log `pagespeed.failed`. The analysis continues, and the report shows a notice in place of
the scores. A null is never shown as a zero; see
[invariants.md](invariants.md#unknown-is-never-reported-as-negative).

`parsePageSpeed(json)` is pure and keeps three things:

- **`categories`**: each Lighthouse category score, out of 100, or `null` when Lighthouse did not
  score it.
- **`audits`**: every audit referenced by a category that has a verdict (`numeric`, `binary` or
  `metricSavings`) and did not pass, with its id, title, `displayValue` and category. Informative and
  not-applicable audits carry no verdict and are left out.
- **`field`**: Chrome UX Report percentiles from `loadingExperience`, falling back to
  `originLoadingExperience`, with `scope` saying which. A small page often has too little traffic for
  its own data, and "this URL" and "the whole site" are different claims, so the report prints the
  scope. With neither, `field` is `null` and the card does not render.

`lib/pagespeed.test.ts` pins the parse against a stored response.

### The score

`pageSpeedScore` is the average of the categories Lighthouse scored, rounded. An unscored category is
left out rather than counted as zero, and no scored category at all is `null`. It is frozen into
`page_snapshots.score` at capture, so a later change to how it is computed never rewrites the trend.

The severity colour comes from `scoreSeverity` over `READOUT_SCORE_THRESHOLDS`, the same three states
the rest of the report uses.

### Field data units

`PAGESPEED_FIELD_UNIT_BY_METRIC` says how each percentile prints: LCP, FCP and TTFB in seconds, INP in
milliseconds, CLS as a decimal. **CLS arrives multiplied by 100** (`PAGESPEED_CLS_SCALE`), so a
percentile of 12 is 0.12. Google's `FAST`, `AVERAGE` and `SLOW` bands map to `ok`, `warn` and `alert`
through `PAGESPEED_FIELD_SEVERITY`.

## AI crawler access

`fetchCrawlerAccess` in `lib/robots.ts` resolves robots.txt to `found`, `absent` or `unknown`, and
`measuredFindings` in `lib/readout.ts` turns it into the `crawler_access` group: AI crawlers blocked,
crawling allowed at all, sitemap declared.

**The group is skipped whole when `status` is `unknown`.** A failed fetch has to take all three
findings out at once, or the page is credited with an open robots.txt nobody read.

`lib/readout.ts` still computes every other group too, but only as input for the error generators;
see [ai-pipeline.md](ai-pipeline.md). The report renders `crawler_access` alone.

## Layout

**The top of the report is the overall score.** `MeasuredReadout` renders the score, the trend and the
field data card. The category cards and the crawler card render at the top of the section of their
theme, through `SectionEvidence`, fed by `sectionEvidence` in `lib/readout.ts`. See
[invariants.md](invariants.md#a-section-shows-the-audits-its-errors-were-written-from).

- **A category card** carries its score down the left edge, a severity badge, the number of failing
  audits, the movement since the last measurement, and the competitor's score for that category when
  there is one. It opens when an audit failed. The body lists the failing audits with their
  `displayValue`.
- **The field data card** lists each metric with its percentile, tinted by Google's band, and names
  the scope. It opens when any metric is not `FAST`.
- **The crawler card** lists the robots.txt findings with the criterion under each one, in the AI
  section.

**An error written about a number links to it.** `fixesByFinding` maps each `flow_fixes.finding`,
which is an audit id or a crawler finding id, to the cards that answer it, and the row renders a
`SectionLink` to those cards.

`CATEGORY_ICON` lives in `components/section-evidence.tsx` rather than in `lib/constants.ts`: it holds
lucide components, and pure modules import that file.

## History

The `analyses` columns hold the current measurement; `page_snapshots` holds every one taken, written
in the same transaction by every run.

`lib/snapshots.ts` is pure, because `deltas` runs inside a client component. `deltas(current,
previous)` is the difference between two category scores, and a category scored on only one side is
not a delta.

- **Fewer than two snapshots is not a history**, so the trend and the deltas are absent until there
  are two. The owner sees `RunAgain variant="trend_start"` instead.
- **The trend is the owner's.** `readoutHistory` is only queried when `isOwner`.

**A new point is the owner's "Run again"**, at `POST /api/analyses/[id]/runs`, which also rewrites
the error lists and spends one run of the month. There is no scheduled run. See [api.md](api.md).

## Where it renders

On `/r/<embedKey>`, for everyone holding the link: the overall score between the cover and the
sections, and each category and the crawler card inside its section. See [report.md](report.md).
