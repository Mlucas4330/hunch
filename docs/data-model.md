# Data model

Drizzle schema in `db/schema.ts`; migrations in `db/migrations`.

```
users
- id              (uuid, PK)
- email           (text, unique)
- name            (text)
- avatar_url      (text, nullable)
- role            (enum: USER_ROLE, default: user)   <- granted at sign-in from ADMIN_EMAIL and
                  never revoked by one, see invariants.md
- monthly_quota   (int, default DEFAULT_MONTHLY_QUOTA: runs per calendar month, set only from
                  /admin/accounts. Read from the row per request, NEVER carried in the JWT)
                  <- a row may be created by setQuota before its owner has ever signed in; name is
                  then the email until they do, see invariants.md
- brand_name      (text, nullable: the agency name its reports carry, at most BRAND_NAME_MAX_LENGTH)
- brand_logo_url  (text, nullable: a path under BRAND_PUBLIC_PATH, never an external URL)
                  <- both read only through brandFor(), see invariants.md
- last_sign_in_at (timestamp, nullable: null means the row was provisioned and nobody has claimed it)
- created_at      (timestamp)

analyses
- id              (uuid, PK)
- user_id         (FK -> users.id, nullable only because rows from before the quota were ownerless)
- url             (text)
- structure       (jsonb, nullable: PageStructure, the scraped structure. Prompt input only)
- seo             (jsonb, nullable: PageSeo, what the page declares about itself. Prompt input)
- performance     (jsonb, nullable: PagePerformance, timings from the scrape. Prompt input)
- crawler_access  (jsonb, nullable: CrawlerAccess, what robots.txt allows an AI crawler. Rendered)
- keywords        (jsonb, nullable: PageKeywords. Prompt input)
- sameness        (jsonb, nullable: PageSameness. Prompt input)
- mobile          (jsonb, nullable: PageMobile. Prompt input)
- pagespeed       (jsonb, nullable: PageSpeed, the PageSpeed Insights result. Null when the call
                  failed or no key is set, never read as a zero)
- site_crawl      (jsonb, nullable: SiteCrawl, up to CRAWL_PAGE_MAX pages read by fetch. Rendered.
                  Null when the crawl threw; a crawl the site refused is stored as `unknown`)
- backlinks       (jsonb, nullable: BacklinkSummary, SE Ranking's estimate. Rendered. Null when the
                  call failed or no key is set, never read as a zero)
- ranked_keywords (jsonb, nullable: RankedKeywords, SE Ranking's estimate for the page's market.
                  Rendered. Null on the same terms)
- competitor_url  (text, nullable: a page the reader named)
- competitor      (jsonb, nullable: CompetitorMeasurement, including its PageSpeed result)
- embed_key       (uuid, unique: public opaque key the report URL uses; never expose analyses.id)
- locale          (enum: LOCALE)
- market          (enum: MARKET)
- created_at      (timestamp)
- index(created_at desc)
- index(user_id, created_at)    <- the dashboard lists an account's analyses newest first

analysis_runs                   <- one measure-and-generate pass: the first, and every "Run again"
- id           (uuid, PK)
- analysis_id  (FK -> analyses.id, nullable, ON DELETE SET NULL: a deleted analysis keeps its runs
               counted)
- user_id      (FK -> users.id, cascade)
- measured_at  (timestamp, nullable: this run stored its measurement and snapshot)
- finished_at  (timestamp, nullable: this run replaced the error lists)
- failed_at    (timestamp, nullable: the run threw or came back empty; not counted against the quota)
- created_at   (timestamp)
- index(user_id, created_at)    <- quotaFor counts this month's runs per account
- index(analysis_id, created_at)

page_snapshots                  <- the history behind the analyses columns above
- id             (uuid, PK)
- analysis_id    (FK -> analyses.id, cascade)
- structure / seo / performance / crawler_access / keywords / mobile / sameness / pagespeed /
  site_crawl / backlinks / ranked_keywords (jsonb)
- score          (int, nullable: pageSpeedScore, FROZEN at capture)
- captured_at    (timestamp)
- index(analysis_id, captured_at)
- index(analysis_id, captured_at desc) WHERE score IS NOT NULL

hypotheses                      <- copy errors
- id             (uuid, PK)
- analysis_id    (FK -> analyses.id)
- section        (enum: SECTIONS)
- assessment     (text, nullable: what the line already does)
- problem        (text: what is wrong with it)
- current_copy   (text: the line, quoted verbatim off the page)
- impact_score   (int, 1-10)
- rationale      (text: what the error costs the visitor)
- selector       (text, nullable)
- target         (enum: HYPOTHESIS_TARGET, default: manual)
- created_at     (timestamp)

flow_fixes                      <- structure, SEO and AI errors, one row each
- id           (uuid, PK)
- analysis_id  (FK -> analyses.id)
- kind         (enum: FIX_KIND -- `flow` for structure, `visibility` for SEO and AI)
- category     (enum: FLOW_CATEGORY)
- title        (text: names the error)
- problem      (text: what the error costs the visitor or the crawler)
- impact_score (int, 1-10)
- evidence     (text, nullable: why it is an error)
- finding      (text, nullable: the READOUT_FINDING id or the Lighthouse audit id this error answers)
- position     (int: impact desc, counted per kind)
- created_at   (timestamp)
```

**Relations**

```
users       1 -> N  analyses
users       1 -> N  analysis_runs
analyses    1 -> N  analysis_runs
analyses    1 -> N  hypotheses
analyses    1 -> N  flow_fixes
analyses    1 -> N  page_snapshots
```

## Columns that need their reason stated

### Most measured columns are prompt input, not readout

`structure`, `seo`, `performance`, `keywords`, `mobile` and `sameness` are what the scrape counted.
The report no longer renders them; they are kept because the error generators read them, and a
every run refreshes them together with `pagespeed`. `crawler_access`, `site_crawl`, `backlinks` and
`ranked_keywords` are the ones the report still renders, because PageSpeed Insights reads none of
robots.txt, the rest of the site or anybody's index.

**Null is not the only "not measured" here, and the other one is inside the jsonb.** `structure` grew
fields after rows already existed, so the type marks those fields optional and `lib/readout.ts`
guards each with `!== undefined`.

The columns are the current measurement and `page_snapshots` is the history. They are written
together, in one transaction, every time.

### A run is what the quota counts, and its `failed_at` is the durable record of a failure

`runAnalysis` writes `failed_at` from its `catch`, a scrape that threw included, and when all three
generators come back empty, before the queue writes the job's terminal status. The report reads the
latest run's to show the failure notice, and `quotaFor` leaves failed runs out of the monthly count.
The job's own status expires with `JOB_TTL_MS`; this does not.

**A run survives its analysis.** `analysis_id` is set null on delete and `user_id` stays, so deleting
an analysis never gives the month's runs back.

**A new run replaces the lists in one transaction**, after the generation succeeds. Until then the
previous lists stay on the report, and a run that fails leaves them as they were.

### The brand lives on `users`, not on `analyses`

It belongs to the agency, not to the client being analysed, so it is set once and every report the
account owns reads it at render time. A rebrand changes every report behind every link already sent.
See [invariants.md](invariants.md#the-agencys-brand-comes-from-one-resolver-on-three-surfaces).

`brand_logo_url` names a file in `BRAND_DIR`. The row is updated before the previous file is deleted,
so a failed write never leaves the column pointing at nothing.

### `analyses.locale` and `analyses.market` are pinned at creation

See [invariants.md](invariants.md#generated-content-is-pinned-to-the-locale-it-was-written-in) and
[invariants.md](invariants.md#the-market-is-measured-from-the-page-never-taken-from-the-ui-locale).

### `flow_fixes.finding` is text, not a pgEnum

It holds either a `READOUT_FINDING` id or a Lighthouse audit id, and Lighthouse's list is open.
`generateFromMeasurement` nulls any id the prompt was not given before it is stored, so a value here
is always one the report can point at.

### `flow_fixes` holds two lists in one table

`kind` keeps structure errors apart from visibility errors. `category` is one enum holding two
families, `FLOW_FIX_CATEGORY` and `VISIBILITY_FIX_CATEGORY`, and each generation's Zod schema is given
only its own family.

## Where rows are split, never inline at a call site

All in `lib/analyses.ts`:

- **`splitFixes`** separates `flow_fixes` by `kind`.
- **`splitVisibility`** cuts visibility into the SEO and AI lists by `category === AI_FIX_CATEGORY`.
- **`readoutFor()`** gathers the measured columns into a `ReadoutInput`.
- **`competitorFor()`** hands the report the competitor's PageSpeed result and hostname.
- **`listAnalysesForUser`** is read by both `GET /api/analyses` and the dashboard.
- **`loadReport`** is the report's one query, authorized by the embed key alone, `cache()`d because
  the page and its OG route both call it.
