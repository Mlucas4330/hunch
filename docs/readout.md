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
neutral about the direction, true of all of them. **When a finding is added to a group, re-read that
group's label before shipping it.** The form findings that landed later pass the same test: a
mandatory field, an unlabelled one and a button that links nowhere are all things a visitor runs into.

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

## A group is skipped whole, never rendered as zeroes

`visibility` was the first, and `trust` and `mobile` follow it exactly. All three answer the same
question: what does the readout do when a pass never ran?

- `visibility` is gated on `crawler.status !== 'unknown'`.
- `mobile` is gated on `mobile !== null` — the column is null on every row measured before the phone
  pass existed.
- `trust` is gated on **one field**, `structure.trustBadgeCount !== undefined`, rather than on
  `structure` itself. The object being present says nothing about whether anybody counted a trust
  signal on it, because the fields were added to a `jsonb` that already had rows.

The individual form findings inside `structure` are gated the same way, one by one, because they sit
in a group that does render for old rows. Each guard is `!== undefined` and never a truthiness check:
zero required fields and zero dead links are real, common, and good answers.

**A finding of zero for a page nobody counted it on reports unknown as negative**, which is the rule
in [invariants.md](invariants.md#unknown-is-never-reported-as-negative). Adding a field to
`PageStructure` therefore means adding a guard, and the test that pins it is *"a structure measured
before the form pass existed reports no form findings"* in `lib/readout.test.ts`.

## The `trust` group

What the page offers a visitor as a reason to believe it: a company registration number, a security
or reputation badge, testimonials that name who said them, a linked privacy policy, and a way to
reach the company. Counted off the DOM against `TRUST_PATTERNS`, which is bilingual because the
page's language is not known until the scrape has run.

Two findings are narrower than the rest on purpose:

- **`no_cnpj` is asked only where `market === 'br'`.** It is the only finding that reads the market,
  and it reads it to stay quiet: a CNPJ in the footer is a Brazilian convention, and its absence on a
  US page is noise rather than a gap. This is the market ruling a sentence out, never supplying a
  fact about buyers — see
  [invariants.md](invariants.md#the-market-is-a-filter-on-what-may-be-recommended-never-a-fact-the-model-knows).
- **`testimonial_attribution` is asked only of a page that has testimonials.** `no_testimonials` in
  the `structure` group already reports the absence, and following it with "0 of them carry a name"
  is one absence dressed as two.

`no_contact_channel` answers on *any* of phone, address or social links. Which channel a company
offers is its own choice; having none is the finding.

## The `mobile` group

Five geometric facts measured in a phone viewport: whether the page overflows sideways, how many
controls fall under `MOBILE_TAP_TARGET_MIN_PX`, how much text falls under `MOBILE_MIN_FONT_PX`, how
many calls to action sit above the phone fold, and whether a viewport meta tag is declared.

**No load numbers, deliberately** — see [scraping.md](scraping.md#the-phone-pass) for why a reload's
timings would say the page is faster on a phone than on a laptop.

`tapTargetsWarn`/`tapTargetsAlert` are calibrated against real pages rather than against the 44px rule
in the abstract. A carousel's dots, a row of social icons and an icon-only close button put a well
built page in the high teens on their own, so the original alert at ten called almost every site
broken. The finding is "hard to use with a thumb", not "one control is two pixels short".

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

`components/readout-score.tsx` renders it above the groups. It deliberately does
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
cost. **There is no sweep.** The weekly cron that did it only ever touched paid plans, so it went with
them — and the reasoning it was built on survives as the rule: an unbounded sweep re-opening every
customer's landing page is exactly what the backfill was forbidden from becoming. Re-measuring is a
click the owner makes.

## Where it renders

Mounted once, on the one analysis surface, like `FlowPlaybook`: fed by `readoutFor(analysis)`,
between the cover and the tabs on `/r/<embedKey>`. It used to be mounted on two routes that rendered
the same document — see [report.md](report.md).

**Outside every wall, for everyone.** It is the part a stranger can check against their own page in
one click, so it is what earns the rest of the document a reading; gating a measurement of someone's
own site reads as a trick.

**The trend is the owner's half of it.** `previous` and `scores` come from `readoutHistory`, which
the page only queries when `isOwner` — a delta between two of the owner's measurements is their
record of their own page, and it arrives with the button that adds points to it.

Returns `null` when nothing was measured, so an analysis created before the columns existed has no
section rather than an empty heading — the same contract `FlowPlaybook` has with an empty list.

## `components/measure-page.tsx` — what the null becomes, and only for the owner

The page asks `hasReadout(readout(readoutFor(analysis)))` itself (both pure, no query, no
model) and renders `MeasurePage` when the answer is no: the readout's own eyebrow, title and hint over
a dashed panel, and a button posting to `POST /api/analyses/[id]/measure`, then `router.refresh()` so
the server re-renders the real section in its place. Four states like `VariantPreview` — the shape is
reused, the code is not — and the request is bounded by `MEASURE_REQUEST_TIMEOUT_MS`.

**A reader who is not the owner gets `MeasuredReadout` alone.** Merging the two routes did not
weaken this — it renamed the condition. It used to hold because the button lived on a different
route; it now holds because `MeasurePage` is behind `isOwner` on the one route there is. A prospect
with no session must not be able to spend the owner's browser slots. **Do not "fix" the missing
button there**, and do not relax the gate to "any signed-in reader": a stranger with an account is
still a stranger with respect to this page. An unmeasured row shows them the read-only
`MeasuringNotice` instead.

The backfill is opt-in, one analysis at a time, and **must not become a migration** — a sweep would
re-open every customer's landing page. See [api.md](api.md).

## Copy discipline

Every string says **what was measured and how**, never what the number will produce. Do not let a
"this is costing you X%" line in here.
