# Data model

Drizzle schema in `db/schema.ts`; migrations in `db/migrations`.

```
users
- id                 (uuid, PK)
- email              (text, unique)
- name               (text)
- avatar_url         (text, nullable)
- plan               (enum: SUBSCRIPTION_PLAN, default: free)
- role               (enum: USER_ROLE, default: user)   <- gates /admin; granted at sign-in from
                     ADMIN_EMAIL and never revoked by one, see invariants.md
- stripe_customer_id (text, nullable: written only by the webhook, see api.md#post-apibillingwebhook)
- analyses_count     (int, default: 0)   <- free tier usage gate
- usage_period_start (timestamp, default now: start of the current monthly allowance window)
- created_at         (timestamp)

subscriptions
- id                     (uuid, PK)
- user_id                (FK -> users.id)
- stripe_subscription_id (text, unique)
- plan                   (enum: SUBSCRIPTION_PLAN)
- status                 (text: active | canceled | past_due)
- current_period_end     (timestamp)
- created_at             (timestamp)

analyses
- id              (uuid, PK)
- user_id         (FK -> users.id)
- url             (text)
- brief           (text, nullable: optional business details the founder supplied for finished copy)
- competitors     (jsonb, nullable: { name, url }[] benchmarked against)
- research_brief  (text, nullable: the competitor research output, kept so the on-demand alternate
                   variants are grounded without paying for a second web search)
- structure       (jsonb, nullable: PageStructure, the readout of what the page DOES)
- seo             (jsonb, nullable: PageSeo, how the page describes itself to machines)
- performance     (jsonb, nullable: PagePerformance, what the page cost to load)
- competitor_structures (jsonb, nullable: CompetitorStructure[], only in paid Competitor mode)
- embed_key       (uuid, unique: public opaque key the snippet uses; never expose analyses.id)
- locale          (enum: LOCALE, default: en)
- market          (enum: MARKET, default: us)
- created_at      (timestamp)

hypotheses
- id             (uuid, PK)
- analysis_id    (FK -> analyses.id)
- section        (enum: SECTIONS)
- problem        (text)
- current_copy   (text)
- impact_score   (int, 1-10)
- effort_score   (int, 1-10)
- rationale      (text)
- selector       (text, nullable: DOM anchor captured during scrape for client-side apply)
- target         (enum: HYPOTHESIS_TARGET, default: manual)
- status         (enum: HYPOTHESIS_STATUS, default: pending)
- created_at     (timestamp)

flow_fixes                      <- BOTH ranked lists of fixes, one row each
- id           (uuid, PK)
- analysis_id  (FK -> analyses.id)
- kind         (enum: FIX_KIND -- `flow` for the conversion playbook, `visibility` for the audit)
- category     (enum: FLOW_CATEGORY -- the blocker removed, not a page section)
- title        (text: short imperative, e.g. "Offer login with Google")
- problem      (text: one sentence on what the current flow costs the visitor)
- steps        (jsonb: string[], 2-5 concrete implementation actions)
- impact_score (int, 1-10)
- effort_score (int, 1-10)
- evidence     (text, nullable: the CRO mechanism behind the fix)
- position     (int: impact desc, assigned at insert, counted PER KIND so each section ranks from 1)
- created_at   (timestamp)

variants
- id             (uuid, PK)
- hypothesis_id  (FK -> hypotheses.id)
- copy           (text)
- evidence       (text, nullable: competitor pattern this variant borrows/beats)
- position       (int: 0 = the recommended challenger; 1 and 2 are the on-demand alternates)
- status         (enum: VARIANT_STATUS, default: proposed)
- screenshot_url (text, nullable: same-origin path -- /screenshots/<file>)
- created_at     (timestamp)

waitlist                        <- leads, from the report's paywall or the landing's contact form
- id         (uuid, PK)
- email      (text)
- phone      (text, nullable)
- embed_key  (uuid, nullable: which report the lead came from; not a FK)
- source     (enum: LEAD_SOURCE, default report)
- created_at (timestamp)
- unique(email, source)

report_views                    <- one row per human open of a public report
- id         (uuid, PK)
- embed_key  (FK -> analyses.embed_key, cascade)
- created_at (timestamp)
- index(embed_key)

experiments
- id            (uuid, PK)
- analysis_id   (FK -> analyses.id)
- hypothesis_id (FK -> hypotheses.id)
- variant_id    (FK -> variants.id: the single challenger against the control copy)
- status        (enum: EXPERIMENT_STATUS, default: running)
- selector      (text, nullable: snapshot from hypothesis at launch)
- control_copy  (text: snapshot of original copy)
- variant_copy  (text: snapshot of challenger copy)
- split_percent (int, default 50: % of visitors bucketed into the variant arm)
- duration_days (int, default 14: one of EXPERIMENT_DURATIONS 7/14/30)
- started_at    (timestamp)
- ends_at       (timestamp, nullable: started_at + duration_days)
- stopped_at    (timestamp, nullable)
- created_at    (timestamp)

experiment_stats
- id            (uuid, PK)
- experiment_id (FK -> experiments.id)
- arm           (enum: EXPERIMENT_ARM)
- impressions   (int, default 0)
- conversions   (int, default 0)
- unique(experiment_id, arm)   <- one row per arm, counters incremented atomically

experiment_events               <- dedupe ledger behind experiment_stats
- id            (uuid, PK)
- experiment_id (FK -> experiments.id)
- visitor_id    (uuid: sticky per-browser id minted by the snippet, not a user)
- arm           (enum: EXPERIMENT_ARM)
- type          (enum: TRACK_EVENT)
- created_at    (timestamp)
- unique(experiment_id, visitor_id, arm, type)  <- a counter only moves on a fresh insert

stripe_events                   <- webhook idempotency + ordering
- id               (text, PK: the Stripe event id)
- type             (text)
- subscription_id  (text, nullable: lets ordering be judged per subscription)
- event_created_at (timestamp: event.created, not our clock)
- received_at      (timestamp)
```

**Relations**

```
users       1 -> N  analyses
analyses    1 -> N  hypotheses
analyses    1 -> N  flow_fixes
analyses    1 -> N  experiments
hypotheses  1 -> N  variants
experiments 1 -> N  experiment_stats
users       1 -> 1  subscriptions
```

## Columns that need their reason stated

### The four readout columns on `analyses` are nullable by contract

`structure`, `seo`, `performance` and `competitor_structures` were captured for generation and thrown
away from the moment the scrape existed. They are persisted so the report can state **measured** facts
with no model in the loop — see [readout.md](readout.md).

An analysis created before these columns holds null and renders no readout section, exactly as an
empty playbook renders no playbook. **There is no backfill and nothing is regenerated.**
`POST /api/analyses/[id]/measure` is the opt-in version, one analysis at a time.

`competitor_structures` is null outside paid Competitor mode, per
[invariants.md](invariants.md#a-comparison-exists-only-where-the-competitor-page-was-actually-opened).

### `analyses.locale` and `analyses.market` are pinned at creation

Both for the same reason: an alternate written weeks later must be held to the language and the market
its hypothesis was written for. See
[invariants.md](invariants.md#generated-content-is-pinned-to-the-locale-it-was-written-in) and
[invariants.md](invariants.md#the-market-is-measured-from-the-page-never-taken-from-the-ui-locale).

### `hypotheses.target`

`auto` only when `current_copy` resolves to exactly one element. Only an `auto` hypothesis can run as
a live test or render a preview.

### `flow_fixes` holds two ranked lists in one table

`kind` is the only thing keeping the conversion playbook and the discoverability audit two sections
rather than one list where an SEO task outranks a conversion fix. They have the identical shape and
share this table, this `category` column and one component.

`category` is **one enum holding two families**: `FLOW_FIX_CATEGORY` for `flow`,
`VISIBILITY_FIX_CATEGORY` for `visibility`. Each generation's Zod schema is given only its own family,
because a visibility fix categorized `trust` would render under the wrong heading and the prompt alone
cannot prevent that.

No variants, no target, no status: nothing here is a single-element text swap, so there is nothing for
the embed snippet to apply and nothing to A/B. A founder ships the steps by hand.

### `waitlist` is unique per `(email, source)`, not per email

The insert is `onConflictDoNothing`, so a single-column unique meant someone who had already hit a
report's wall and then deliberately filled in the contact form was dropped in silence — losing the
highest-intent event the product records. Per source, the dedupe still stops a reload double-writing.

`source` defaults to `report`, which is also the correct backfill: the wall was the only thing writing
rows before the contact form existed.

### `report_views` stores a row per open, and is the one table written by a client

Unlike `waitlist.embed_key`, this one **is** a FK with `on delete cascade`: the row is written from a
surface that already proved the analysis exists, so a key with no analysis behind it is junk rather
than a lead worth keeping.

A row per open rather than a counter on `analyses`, because the operator's question is *when* and *how
often*, not *how many* — "opened it three times this week" is what decides a follow-up, and a counter
throws that away irreversibly. Nothing dedupes a reload; `RATE_LIMITS.report_view` bounds the noise.

**It counts opens, not readers, and it counts your own.** There is no session on the public report, so
an operator checking their own link is indistinguishable from a prospect reading it.

## Where rows are split — never inline at a call site

Three surfaces render these lists, and a surface that forgot to filter would silently show conversion
fixes under the discoverability heading. Both helpers live in `lib/analyses.ts`:

- **`splitFixes`** separates `flow_fixes` by `kind`.
- **`splitVisibility`** makes the second cut, by `category === AI_FIX_CATEGORY`, into the SEO and
  "found by AI" tabs. That split is **presentation, not a column** — no migration divides those rows,
  so an analysis generated before the tabs existed divides itself. The print report skips it and
  renders one combined visibility section, because on paper there is nothing to click.
- **`readoutFor()`** is the single place the four readout columns are gathered, for the same reason.
- **`listAnalysesForUser`** is read by both `GET /api/analyses` and the dashboard server component, so
  the free history cap cannot drift between the page and the route that feeds it.
