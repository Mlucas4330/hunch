# Data model

Drizzle schema in `db/schema.ts`; migrations in `db/migrations`.

```
users
- id                 (uuid, PK)
- email              (text, unique)
- name               (text)
- avatar_url         (text, nullable)
- role               (enum: USER_ROLE, default: user)   <- granted at sign-in from ADMIN_EMAIL and
                     never revoked by one, see invariants.md
- credits           (int, default 0: the balance. Read from the row per request, NEVER carried in
                     the JWT -- see invariants.md)
- stripe_customer_id (text, nullable: written only by the webhook, see api.md#post-apibillingwebhook)
                     <- a row may be created by the webhook before its owner has ever signed in;
                     name is then the email until they do, see invariants.md
- gclid              (text, nullable: the Google Ads click this person last arrived on, copied off
                     the first-party cookie when they create a payment. Null on everyone who never
                     came from an ad, which is most rows and is not a gap -- see ads.md)
- gclid_at           (timestamp, nullable: when that click was captured. A click older than
                     GCLID_MAX_AGE_SECONDS is outside Google's conversion window, so reporting it
                     would produce a rejection rather than a conversion)
- last_sign_in_at    (timestamp, nullable: null means the row was provisioned and nobody has claimed
                     it yet, see invariants.md)
- created_at         (timestamp)

analyses
- id              (uuid, PK)
- user_id         (FK -> users.id, NULLABLE: an anonymous analysis has no owner until a sign-in
                   claims it by embed_key -- see invariants.md)
- url             (text)
- brief           (text, nullable: optional business details the founder supplied for finished copy)
- structure       (jsonb, nullable: PageStructure, the readout of what the page DOES)
- seo             (jsonb, nullable: PageSeo, how the page describes itself to machines)
- performance     (jsonb, nullable: PagePerformance, what the page cost to load)
- crawler_access  (jsonb, nullable: CrawlerAccess, what the site's robots.txt allows an AI crawler)
- keywords        (jsonb, nullable: PageKeywords, the terms the page repeats and where they appear)
- mobile          (jsonb, nullable: PageMobile, the same page's geometry in a phone viewport)
- ad_ideas        (jsonb, nullable: AdIdeas, ad groups written off `keywords` on the owner's click)
- embed_key       (uuid, unique: public opaque key the report URL uses; never expose analyses.id)
- locale          (enum: LOCALE, default: en)
- market          (enum: MARKET, default: us)
- created_at      (timestamp)
- index(created_at desc)        <- analysisPulse takes the newest 48 and nothing else

page_snapshots                  <- the history behind the analyses columns above
- id             (uuid, PK)
- analysis_id    (FK -> analyses.id, cascade)
- structure / seo / performance / crawler_access / keywords / mobile (jsonb: the same measured facts)
- score          (int, nullable: readoutScore overall, FROZEN at capture so a threshold change
                  never rewrites what a reader was already shown)
- captured_at    (timestamp)
- index(analysis_id, captured_at)
- index(analysis_id, captured_at desc) WHERE score IS NOT NULL
                  <- latestScores() takes the newest scored row per analysis and feeds both the
                     public board and the pulse. The index above does not serve it: the sort is
                     descending and the score filter is not covered, so it fell back to scanning a
                     table that gains a row on every measure and every re-measure.

leads                           <- an address someone left to be sent their report's link
- id              (uuid, PK)
- email           (text: a string a stranger typed. NOT verified, NOT a user -- see below)
- analysis_id     (FK -> analyses.id, cascade)
- locale          (enum: LOCALE, pinned like analyses.locale so what is written to this person is
                   written in the language they were reading)
- unsubscribed_at (timestamp, nullable: kept rather than deleted, or the next submit of the same
                   address silently re-subscribes them)
- created_at      (timestamp)
- unique(email, analysis_id)    <- a double click is one lead, not two
- index(email)

  **Its own table, and that is the security boundary.** `users` is keyed on email with no accounts
  table, so whoever presents an address next owns that row and the credits in it -- which is why only
  a provider-verified address may create one (invariants.md). Nobody verified a lead's address. It
  lives here, where it can never key a sign-in, grant anything, or make anyone an owner.

  It is also not a column on `analyses`: a lead is a contact for one page and the same person can
  measure several. That keeps `analyses.user_id` as the only cut between the free half and the paid
  one -- leaving an address changes nothing about ownership.

hypotheses
- id             (uuid, PK)
- analysis_id    (FK -> analyses.id)
- section        (enum: SECTIONS)
- assessment     (text, nullable: what the line already does, written before the replacement was)
- problem        (text)
- current_copy   (text)
- impact_score   (int, 1-10)
- rationale      (text)
- selector       (text, nullable: DOM anchor captured during scrape for client-side apply)
- target         (enum: HYPOTHESIS_TARGET, default: manual)
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
- evidence     (text, nullable: the CRO mechanism behind the fix)
- position     (int: impact desc, assigned at insert, counted PER KIND so each section ranks from 1)
- created_at   (timestamp)
- finding      (text, nullable: the READOUT_FINDING this fix answers, or null when no measurement
                backs it -- nothing counts whether an action is repeated below the pricing table.
                This is the join that stops the readout and the fix lists being two disjoint lists
                about one page; see fixesByFinding in lib/analyses.ts.

                **text, not a pgEnum, against the precedent set by `kind` and `category` right
                above.** Those are small closed lists that move with the product. READOUT_FINDING is
                43 values and grows whenever a measurement is added -- the `credibility` and `mobile`
                groups both arrived after the fact -- so as an enum every new finding would become an
                `ALTER TYPE` migration coupling lib/readout.ts to the schema, for a guarantee the Zod
                parse already gives at the only point the value is produced. The price is
                `isReadoutFinding` narrowing it on the way back out, paid in one place.)

variants
- id             (uuid, PK)
- hypothesis_id  (FK -> hypotheses.id)
- copy           (text)
- evidence       (text, nullable: the CRO mechanism the rewrite uses -- never a number, never a company)
- emphasis       (text, nullable: substring of THIS row's copy belonging in the element's existing
                  styled fragment; never a substring of current_copy -- see ai-pipeline.md)
- position       (int: 0 = the recommended challenger; 1 and 2 are the on-demand alternates)
- screenshot_url (text, nullable: same-origin path -- /screenshots/<file>)
- screenshot_overflow (bool: the copy was still clipped at the smallest size the fit will use)
- created_at     (timestamp)

credit_transactions             <- every movement of the balance, both directions
- id           (uuid, PK)
- user_id      (FK -> users.id, cascade)
- delta        (int, signed: a purchase is positive, an unlock negative, a refund positive again)
- reason       (enum: CREDIT_REASON)
- analysis_id  (FK -> analyses.id, set null: what the credit was spent on)
- provider     (text, nullable: which payment provider granted it)
- provider_ref (text, nullable: that provider's own id for the payment)
- created_at   (timestamp)
- unique(provider, provider_ref)   <- THE idempotency key: one payment can never be granted twice,
                                      however many times a webhook is delivered
- index(user_id, created_at)

`grant` is the fourth `CREDIT_REASON` and the only one with no money behind it: an operator handing
credits over from `/admin/credits`, to comp someone or to repair a payment whose webhook never landed.
It is a reason of its own rather than a `purchase` with a distinctive `provider` because **the ledger's
job is being auditable**, and a row claiming a purchase nobody made is the one lie that makes every
other row worth less. `provider` is `ADMIN_PROVIDER` and `provider_ref` a fresh uuid, so a hand grant
can never collide with a real payment's idempotency key. `recentGrants` in `lib/credits.ts` reads this
value back to list them on the screen, which is what makes the grants reviewable rather than merely
recorded.

payment_events                  <- webhook idempotency, for every provider
- provider         (text)
- event_id         (text: the provider's own id for the delivery. For Mercado Pago it is
                    "<payment id>:<topic>", because one payment notifies once pending and again
                    once approved and those are two deliveries, not one)
- type             (text)
- event_created_at (timestamp: the provider's timestamp where it sends one, not our clock)
- received_at      (timestamp)
- primary key(provider, event_id)   <- two providers number their events independently, so the id
                                       alone is not unique
```

**Relations**

```
users       1 -> N  analyses
analyses    1 -> N  hypotheses
analyses    1 -> N  flow_fixes
analyses    1 -> N  page_snapshots
hypotheses  1 -> N  variants
```

## Columns that need their reason stated

### The readout columns on `analyses` are nullable by contract

`structure`, `seo`, `performance`, `crawler_access`, `keywords` and `mobile` were captured for
generation and thrown away from the moment the scrape existed. They are persisted so the report can
state **measured** facts with no model in the loop — see [readout.md](readout.md).

**Null is not the only "not measured" here, and the other one is inside the jsonb.** `structure` grew
fields after rows already existed, so a row can hold the object with none of them. The type marks
those fields optional and the readout guards each with `!== undefined`; see
[readout.md](readout.md#a-group-is-skipped-whole-never-rendered-as-zeroes). Widening one of these
records is therefore never a migration and always a guard.

**`market` is not stored on `page_snapshots`.** It is pinned to `analyses.market` at creation and
never moves, so a snapshot carrying its own copy would be a second source of truth for one fact.
`snapshotInput` and `snapshotValues` take it as an argument instead — one finding reads it, and reads
it to stay quiet outside Brazil.

An analysis created before these columns holds null and renders no readout section, exactly as an
empty playbook renders no playbook. **Nothing is regenerated**, and nothing sweeps them.
`POST /api/analyses/[id]/measure` re-measures one analysis at a time on the owner's click, and that
click is the only thing that re-measures anything. **There is no sweep.** One existed twice and was
removed twice — once with the plans it swept for, once with the subscription that paid for it — and
the reason did not change either time: a scheduled re-measure opens a real browser against somebody's
site, so it is browser time nobody asked for unless something pays for it. See [api.md](api.md) and
[product.md](product.md).

The columns are the current measurement and `page_snapshots` is the history. They are written
together, in one transaction, every time — a trend that disagrees with the readout above it is worse
than no trend.

### `analyses.ad_ideas` is one column and not a table

It holds a single object, read whole and written whole, exactly like the measurement columns above
it — so a table would buy nothing and cost a join, a cascade and a position column. **Nothing ever
reads one ad group without the rest of the set**, which is the test: `flow_fixes` is a table because
the report slices it by `kind` and `category` and ranks it; this is never sliced.

Null on every analysis nobody has asked for one on, which is most of them: it is written by
`POST /api/analyses/[id]/ads` on the owner's click, never during the run. See
[api.md](api.md) and [ai-pipeline.md](ai-pipeline.md).

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

`FLOW_FIX_CATEGORY` gained `mobile` and `performance`, which is an `ALTER TYPE` on `flow_category`
(migration 0034) rather than a code-only change -- the price of that column being a pgEnum, and the
reason `finding` beside it is not one. They exist because the `mobile` and `load` readout groups had
no fix category that could answer them: the score fell for something the product could not act on.

No variants and no target: nothing here is a single-element text swap, so there is no replacement line
to render. A founder ships the steps by hand.

## Where rows are split — never inline at a call site

Three surfaces render these lists, and a surface that forgot to filter would silently show conversion
fixes under the discoverability heading. Both helpers live in `lib/analyses.ts`:

- **`splitFixes`** separates `flow_fixes` by `kind`.
- **`splitVisibility`** makes the second cut, by `category === AI_FIX_CATEGORY`, into the SEO and
  "found by AI" tabs. That split is **presentation, not a column** — no migration divides those rows,
  so an analysis generated before the tabs existed divides itself. It skips it and
  renders one combined visibility section, because on paper there is nothing to click.
- **`readoutFor()`** is the single place the four readout columns are gathered, for the same reason.
- **`listAnalysesForUser`** is read by both `GET /api/analyses` and the dashboard server component, so
  paging cannot drift between the page and the route that feeds it.
- **`loadReport`** is the public report's one query, authorized by the embed key alone. It moved here
  from `lib/report.ts` when white-label was deleted: that file resolved a brand, and the lookup it
  also held belongs beside the other analysis queries. It stays `cache()`d because the page and its
  OG route both call it.
