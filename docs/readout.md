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
`null` and log `pagespeed.failed`. A 5xx, which is Lighthouse failing on Google's side, is retried
`PAGESPEED_RETRIES` times inside that same timeout, so a retry never makes the analysis wait longer. The analysis continues, and the report shows a notice in place of
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
see [ai-pipeline.md](ai-pipeline.md). The report renders `crawler_access`, `site` and `index`.

## Site crawl

`measuredFindings` turns `SiteCrawl` into the `site` group, rendered by the site card at the top of the
SEO section. Every finding counts pages and carries their URLs in `urls`. How the pages are read is in
[scraping.md](scraping.md#site-crawl-crawlsite-in-libcrawlts).

- **Status findings** run on every crawl that is not `unknown`: pages answering 404, 410 or a 5xx
  other than 503 (`isBrokenStatus`), redirects, noindex, and sitemap URLs that do any of the three.
- **Content findings** run only when `siteContentReadable`: missing and shared titles and meta
  descriptions, no H1 or more than one, and `thin_pages` at `READOUT_THRESHOLDS.thinPageWords`. A page
  that redirects or is noindex is left out of them.
- **`canonical_elsewhere` is counted and never graded.** A canonical pointing at another URL is often
  a choice, such as a filtered list pointing at the unfiltered one.

A page that never answered appears in no finding. See
[invariants.md](invariants.md#unknown-is-never-reported-as-negative).

## SE Ranking: `fetchSeoIndex` in `lib/seranking.ts`

Four calls per page: the backlink summary, the top `BACKLINK_REFERRING_DOMAINS_MAX` referring domains,
up to `RANKED_KEYWORDS_MAX` keywords the domain ranks for ordered by estimated traffic, and the domain
overview, which is the only place the total count lives. A competitor adds the same four. Stored in
`analyses.backlinks` and `analyses.ranked_keywords`.

- **One after another, never in parallel.** A trial account is held to one request a second, so a `429`
  is retried `SE_RANKING_RETRIES` times after `SE_RANKING_RETRY_DELAY_MS`.
- **Asked on the page's market.** `scrapeAndIndex` in `lib/analyze.ts` detects it from the scrape
  before calling, and `SE_RANKING_SOURCE` maps it to SE Ranking's regional database. The competitor is
  asked on the reader's market, so both are compared on the same Google.
- **Fail-soft per half.** No key, a timeout or an error answer leave that half `null` and log
  `seranking.failed`, and a list call is skipped when the call it depends on failed. A summary with no
  row is a domain the index knows nothing about, and its counts are zero. A failed overview leaves the
  total `null`, never zero.
- **Domain rank runs from 0 to `DOMAIN_RANK_MAX`.**
- **The parsers are pure**, tested against cut-down real responses in `lib/seranking.test.ts`.

`measuredFindings` turns them into the `index` group: `referring_domains` and `ranked_keywords`, both
counted and never graded, in a group that is unscored. An unknown total adds no finding. See
[invariants.md](invariants.md#index-numbers-say-where-they-came-from).

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
- **The site card** says how many pages were read and from where, then each `site` finding with a
  disclosure listing up to `CRAWL_CARD_URLS_MAX` of its pages, in the SEO section. When the HTML is a
  JavaScript shell it says why the content findings are missing.
- **The backlink card** shows referring domains, dofollow referring domains, backlinks and domain rank,
  each with the competitor's value when there is one, and the top referring domains behind a disclosure.
  It starts closed.
- **The ranking card** shows how many keywords the domain ranks for and a table of the first
  `RANKED_KEYWORDS_TABLE_MAX`: keyword, position, monthly searches and the page that ranks.
- **Both carry `readout.index.source`** under their numbers and no score rail.

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
