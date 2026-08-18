# The measured readout

`lib/readout.ts` + `components/measured-readout.tsx`. The one place the product states numbers to a
reader, and the only reason it may is
[invariants.md](invariants.md#a-number-reaches-the-reader-through-code-never-through-a-token-a-model-wrote).

`measuredFindings` is arithmetic over what the scrape counted, and it is **pure** — no database, no
model, no network.

## The shape

A finding is `{ id, group, severity, value, unit }` and carries **no prose**. The label lives in
`dictionary.readout.findings[id]`, keyed by the `READOUT_FINDING` enum. That split is the whole
guarantee: a number cannot reach the reader without a code path putting it there.

It renders as a **grid of label + value, not sentences**, over `READOUT_GROUP`. A single string per
finding then covers every severity — "Signup form fields / 7" is true whether 7 is fine or terrible,
whereas a presence finding's sentence ("there is no FAQ") is outright false in its own `ok` case.

`readoutFor()` in `lib/analyses.ts` is the single place the measured columns are gathered — see
[data-model.md](data-model.md).

## A group label has to cover every finding under it

`READOUT_GROUP` is a bucket of findings, and its label in `readout.groups` is read as a claim about all
of them. `structure` is the one that keeps getting this wrong: it held *"What the page asks of a
visitor"* / *"O que a página exige de quem chega"*, and only three of its eight findings are things the
page asks for — form fields, words to read, menu links pulling the visitor away. The other five are
things the page **gives**: social sign-in, calls to action above the fold, answered questions,
testimonials, headings. A reader looking at *Depoimentos de clientes* under a heading that says the page
*demands* things has caught the product being sloppy about its own numbers, on the surface whose entire
argument is that the numbers are careful.

It now reads *"A experiência de quem chega na página"* / *"What a visitor runs into on the page"* —
neutral about the direction, true of all eight. **When a finding is added to a group, re-read that
group's label before shipping it.**

## The `visibility` group

`crawler_access` is what the product actually measured about being found by an AI: which of
`AI_CRAWLER_AGENTS` the site's own robots.txt disallows, whether it blocks everything, and whether it
declares a sitemap. Three findings, and none of them says anything about the index — see
[invariants.md](invariants.md#the-audit-measured-the-page-not-the-index). It is deliberately not a
citation count: nobody publishes that number, so producing one would mean inventing it.

**The group is skipped whole when `status` is `unknown`**, and this is the reason it is a group rather
than three loose findings — a failed fetch has to take all three out at once, or the page ends up
credited with an open robots.txt we never read. `absent` is the opposite case and does render: no
robots.txt is a measured answer, and it means nothing is blocked and no sitemap is declared.

## Rules the numbers obey

- **Thresholds (`READOUT_THRESHOLDS`) are deliberately loose.** A false alert on a healthy page is the
  expensive error: this is read by a stranger who can check it against their own site in one click,
  and one wrong accusation discredits every true finding beside it.
- **Too little is a finding too.** `rankBelow` mirrors `rank` for the metrics where the low side is the
  problem — `word_count`, `heading_count`, `internal_links` — and keeps the boundary inclusive in the
  same direction, so landing exactly on the threshold is already the bad side in both helpers. A page
  under 300 words has nothing for a reader to weigh and nothing for a crawler to quote, which is the
  same fact stated to two audiences.
- **`ok` is a real state and is rendered.** Green is load-bearing — a readout that is all coral reads
  as a sales pitch, and the rows that came back fine are what make the rest believable.
  `READOUT_SEVERITY_CLASS`: `ok` green, `warn` amber, `alert` coral.
- **A metric the browser did not report is skipped, never defaulted.** A null LCP rendered as 0 is an
  instant page, which is the opposite of what was measured. `PagePerformance` is nullable per field
  for this reason and `measuredFindings` drops the row rather than filling it.
- **`noindex` is the one finding emitted only when true.** Every other page is not noindexed, so an
  `ok` row for it would cost a line on every report for no information — while the true case is the
  most severe thing the readout can find.
- **Values stay in the unit they were measured in** (bytes, milliseconds). Conversion happens **here
  and only here** in `MeasuredReadout` (`BYTES_PER_MEGABYTE`, `MS_PER_SECOND`), so nothing is rounded
  twice. `page_weight` renders behind `readout.atLeast`, per
  [invariants.md](invariants.md#the-readout-says-what-was-counted-never-what-it-will-produce).

## The score

`lib/score.ts`, pure like `lib/readout.ts`, is arithmetic over the severities the findings already
carry: `ok` 1, `warn` 0.5, `alert` 0 (`READOUT_SEVERITY_POINTS`), rounded to 0-100. It states the
**health of what was counted** and nothing else — it is not a conversion score, it predicts nothing,
and the copy may never suggest otherwise.

Three decisions worth keeping:

- **A `warn` is worth half a finding, not a failure.** The whole reason the readout has three states is
  that the middle one is not the bottom one; collapsing them in the score would undo that.
- **The overall weighs every finding equally, never every group equally.** Averaging the group averages
  would let `load`, with three findings, count as much as `metadata` with nine.
- **A group with nothing measured scores `null` and does not render**, the same contract the findings
  have with a metric the browser did not report. Zero would mean "measured, and terrible".

`scoreSeverity` reads downward like `rankBelow` and reuses `READOUT_SEVERITY_CLASS`, so the score is
tinted by the same three colours as the values beneath it.

`components/readout-score.tsx` renders it above the groups on all three surfaces. It deliberately does
**not** reuse `components/score-indicator.tsx`: that is the 1-10 impact scale on the hypotheses,
and two different scales wearing the same widget on one screen is where the reader stops trusting
either.

### The scale explains itself, in the card, always visible

A bare `72/100` is a number whose ends the reader has to guess at, and a reader guessing at a scale
either dismisses it or reads it as a conversion score — the one thing it is not. Two lines carry the
whole contract, and **neither may move into the `InfoHint`**: this card renders on the public report and
on paper, where a tooltip is a click nobody makes and a print that never appears.

- `readout.score.scale`, beside the number: the two ends stated outright, 100 is every check passing
  and 0 is none of them.
- `readout.score.method`, under the group bars: the arithmetic (full point / half / none), the fact
  that every check was **counted on this page itself**, and the explicit limit — it rates what was
  counted and says nothing about the page's traffic or revenue, per
  [invariants.md](invariants.md#the-readout-says-what-was-counted-never-what-it-will-produce). The
  `{count}` is `findings.length`, so the sentence names the same set the reader is looking at.

This is a **different** sentence from `readout.hint`, and they must not be merged: the hint answers
where the *findings* come from (measured on the page, load times a best case), this answers what the
*score* over them means.

The card is deliberately large — the number at `text-5xl`/`text-6xl`, the group bars at `h-2.5` — and
turns to two columns only at `lg`. It is the first thing on the analysis and on the report, and it was
previously small enough to read as a chip beside the findings rather than the summary of them.

## The keyword table

`lib/keywords.ts` counts the page's own words: unigrams and bigrams over `preprocessHtml(html)`,
minus `KEYWORD_STOPWORDS` (English and Portuguese in one list, accents intact), kept only from
`KEYWORD_MIN_COUNT` occurrences, capped at `KEYWORD_TERMS_MAX`. For each term it reports **where it
already appears** — title, H1, meta description, headings — matched on whole words, so `redeployment`
is never the term `deploy`.

This is the measured half of what Semrush and Ahrefs sell, and only that half. **There is no search
volume, no difficulty, and no ranking opportunity**, because we have no index and no clickstream: any
such number would be invented, exactly like a number in `evidence`. See
[invariants.md](invariants.md#keywords-measure-the-pages-own-words-never-the-index).

Three findings fall out of the leading term (`term_in_title`, `term_in_h1`,
`term_in_meta_description`) and are emitted **only when there is a leading term** — a page with nothing
to read must not collect three warns about a word it never had.

The terms also reach `generateVisibility` so a `seo` or `ai_answerability` fix can say **where** to put
one. The prompt carries the same prohibition the copy does.

## History — `page_snapshots`

The `analyses` columns hold the **current** measurement; `page_snapshots` holds every one taken. Both
are written in the same transaction, on creation, on a manual re-measure, and on the cron sweep, so a
trend can never disagree with the readout above it.

`lib/snapshots.ts` is pure and must stay that way — `deltas` runs inside `MeasuredReadout`, a client
component, so a database import there would ship the schema to the browser. The one query,
`readoutHistory`, lives in `lib/analyses.ts` beside `readoutFor`.

- **The score is frozen at capture.** Recomputing history against today's thresholds would rewrite what
  the reader was already shown.
- **Fewer than two snapshots is not a history.** One point is the current measurement and a one-point
  line is a decoration, so both the deltas and the sparkline are absent until there are two.
- **A delta appears only where the same finding exists on both sides and the value moved.** A finding
  that shows up for the first time (the robots.txt that was `unknown` last week) is not a change in a
  number.
- **What a delta may say** is [one rule in invariants.md](invariants.md#a-delta-is-arithmetic-between-two-measurements-never-a-result-attributed-to-a-change),
  and it is the one to reread before writing any copy near this section.

`components/readout-trend.tsx` is the sparkline: one series, one entity, therefore one stable colour —
the line is "the score over time" and never takes the tint of whatever the latest value happens to be.
No legend, because the title names the only series.

**Re-measuring is the owner's, and it is bounded twice.** `POST /api/analyses/[id]/measure` is no
longer idempotent — it is the re-measure — and the `measure` rate limit is what holds the browser
cost. `GET /api/cron/remeasure` sweeps paid plans only, `REMEASURE_BATCH_MAX` analyses per run, serial,
skipping anything measured within `REMEASURE_MIN_AGE_MS`. Free plans are never swept: an unbounded
sweep re-opening every customer's landing page is exactly what the backfill was forbidden from
becoming.

## Where it renders

Mounted on **all three** analysis surfaces, like `FlowPlaybook`, fed by `readoutFor(analysis)`: above
the tabs on `/analyses/[id]`, between the `<h1>` and the tabs on the public report, and ahead of both
fix lists on the print report.

**Outside every wall on the public report.** It is the part a stranger can check against their own
page in one click, so it is what earns the rest of the document a reading; gating a measurement of
someone's own site behind an email reads as a trick.

Returns `null` when nothing was measured, so an analysis created before the columns existed has no
section rather than an empty heading — the same contract `FlowPlaybook` has with an empty list.

The **comparison table** is the one wide element, so it lives in its own `overflow-x-auto` (the report
is read on a phone as often as not). It renders only in Competitor mode, per
[invariants.md](invariants.md#a-comparison-exists-only-where-the-competitor-page-was-actually-opened).
`READOUT_COMPARISON` is a strict subset of `PageStructure`: only things measured identically on every
page and meaningful without context. Conversion rate is not there and never can be — we measure pages,
not their traffic.

It covers two kinds of row, and the second is the reason the table is worth reading. Four measure
**friction** (`form_fields`, `social_signin`, `above_fold_ctas`, `nav_links`) and four measure what a
page **offers** (`pricing`, `testimonials`, `faq`, `sticky_cta`). The offer rows are what surface "the
competitor has this and the page does not", which is the argument an agency actually carries into a
client meeting; without them the table only ever said whose form was longer.

Rows read from `PageStructure`, `PageSeo` and `PagePerformance`, all three of which the Competitor
scrape already produced. Each row carries its own `unit` so the render edge converts once, exactly as
the findings do.

**A row where any one page cannot answer is dropped whole.** `seo` and `performance` are optional on
`CompetitorStructure` because rows stored before they were kept do not have them, and a blank cell in
a comparison reads as a zero — half a comparison is worse than none.

Every row is a **value, never a verdict**. The table does not mark having an FAQ as better than not
having one, exactly as the `social_signin` row has never judged. The severity call belongs to the
findings above it, which measured one page and can afford an opinion about it; a competitor's page was
opened once, and ranking it would be
[the claim the invariant forbids](invariants.md#the-readout-says-what-was-counted-never-what-it-will-produce).

## `components/measure-page.tsx` — what the null becomes, and only for the owner

`/analyses/[id]` asks `hasReadout(readout(readoutFor(analysis)))` itself (both pure, no query, no
model) and renders `MeasurePage` when the answer is no: the readout's own eyebrow, title and hint over
a dashed panel, and a button posting to `POST /api/analyses/[id]/measure`, then `router.refresh()` so
the server re-renders the real section in its place. Four states like `VariantPreview` — the shape is
reused, the code is not — and the request is bounded by `MEASURE_REQUEST_TIMEOUT_MS`.

**The public report and the print report keep rendering `MeasuredReadout` alone.** A prospect with no
session must not be able to spend the owner's browser slots, and on paper there is nothing to click.
Do not "fix" the missing button there.

The backfill is opt-in, one analysis at a time, and **must not become a migration** — a sweep would
re-open every customer's landing page. See [api.md](api.md).

## Copy discipline

Every string says **what was measured and how**, never what the number will produce. Do not let a
"this is costing you X%" line in here.
