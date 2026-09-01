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

**Three groups are named to avoid a collision.** `credibility`, `declared` and `crawler_access` were
once `trust`, `metadata` and `visibility`, and each of those words already named something else on the
same screen: `trust` and `metadata` are fix categories rendered as badges below, and `visibility` is
the `FIX_KIND` that parents **both** the seo and ai tabs — a wider scope than the group ever had. One
word meaning two things in one report is how a reader concludes the page is saying everything twice.
Nothing here is in the database, so the rename was a pure TypeScript change.

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

## The `crawler_access` group

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

`crawler_access` was the first, and `credibility` and `mobile` follow it exactly. All three answer the same
question: what does the readout do when a pass never ran?

- `crawler_access` is gated on `crawler.status !== 'unknown'`.
- `mobile` is gated on `mobile !== null` — the column is null on every row measured before the phone
  pass existed.
- `credibility` is gated on **one field**, `structure.trustBadgeCount !== undefined`, rather than on
  `structure` itself. The object being present says nothing about whether anybody counted a trust
  signal on it, because the fields were added to a `jsonb` that already had rows.

The individual form findings inside `structure` are gated the same way, one by one, because they sit
in a group that does render for old rows. Each guard is `!== undefined` and never a truthiness check:
zero required fields and zero dead links are real, common, and good answers.

**A finding of zero for a page nobody counted it on reports unknown as negative**, which is the rule
in [invariants.md](invariants.md#unknown-is-never-reported-as-negative). Adding a field to
`PageStructure` therefore means adding a guard, and the test that pins it is *"a structure measured
before the form pass existed reports no form findings"* in `lib/readout.test.ts`.

## The `credibility` group

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

## Every counted finding states the boundary it was judged against

A finding renders as `label / value`, and for a **count** that is not enough to act on. *Signup form
fields / 6* leaves the reader with the question the whole section exists to answer: is six four too
many, or two too few? The severity colour says something is wrong without saying which way to move,
and on a free analysis there is no generated fix beside it either — so the number was a dead end for
most readers, on most rows.

`MeasuredFinding.criterion` closes it: `{ kind, threshold }`, rendered under the label as *sinalizamos
a partir de 4* / *flagged from 4*.

**It is the boundary the ranker actually applied, not a second copy of it.** `rank` and `rankBelow`
return `{ severity, criterion }` together, so the printed number and the applied number are the same
value by construction. The alternative — a map from finding id to threshold, read by the renderer —
is a duplicate of what `measuredFindings` already knows, and the first edit to `READOUT_THRESHOLDS`
that missed the copy would have printed a boundary this code does not apply. On a product whose whole
claim is that the printed number is the counted one, that is the expensive bug.

Four kinds, and each exists because a simpler set would lie about some finding:

- **`above`** — `rank`. *Flagged from 4.*
- **`below`** — `rankBelow`, where too little is the problem. *Flagged at 300 or fewer.*
- **`band`** — `above_fold_ctas` and its phone twin, where **both** ends are bad: none at all is an
  alert and a crowd is a warning. Printing only the ceiling would tell a page with no call to action
  that it is comfortably under the line.
- **`exactly`** — `h1_count`, wrong in either direction.

**The criterion carries the warn boundary and never the alert one.** Warn is the line between fine
and not fine, which is what a reader looking at a bare number is asking; how far past it they are is
what the colour already says. Both numbers turned one short line into two that had to be read against
each other.

**It renders on passing findings too**, and that is where it earns most: a green `720` beside
*flagged at 300 or fewer* explains itself, where a green `720` alone is another number to take on
trust.

**A presence finding carries `null` and renders nothing.** *Sign in with Google or GitHub / No*
already names the bad answer, and *flagged on No* would be noise on more than a third of the rows.
The counted findings are what this is for.

**What it may never become.** *Flagged from 4* is a statement about our own check. *"Two fields too
many, costing you signups"* is a prediction nobody measured, and it is the same line this whole
section is drawn along — see
[invariants.md](invariants.md#the-readout-says-what-was-counted-never-what-it-will-produce). The
reasoning behind each threshold lives in the comments on `READOUT_THRESHOLDS` and is deliberately not
shipped as copy: it is an argument, and an argument is the generated half's job.

### `readout.atLeast` belongs to the value and to nothing else

The qualifier on `page_weight` is there because `SCRAPE_ALLOWED_RESOURCE_TYPES` blocks media, so the
bytes counted are a floor. It used to live inside `renderUnit`, which is shared — so the delta read
*+at least 0.3 MB*, and the threshold beside it would have read *at least 2 MB*, as if our own
boundary were approximate. It is applied in `renderValue` now, on the measured value, once.

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
  would let `load`, with three findings, count as much as `declared` with nine.
- **A group with nothing measured scores `null` and does not render**, the same contract the findings
  have with a metric the browser did not report. Zero would mean "measured, and terrible".

`scoreSeverity` reads downward like `rankBelow` and reuses `READOUT_SEVERITY_CLASS`, so the score is
tinted by the same three colours as the values beneath it.

`components/readout-score.tsx` renders the overall above the group cards, and **each group's own
score is rendered by that group's card** rather than here. The card used to carry a bar per group as
well, which became the same six numbers stated twice the moment the groups became cards -- and worse,
the reader had to match a label in this card against a heading further down to join them. It
deliberately does **not** reuse `components/score-indicator.tsx`: that is the 1-10 impact scale on the
hypotheses, and two different scales wearing the same widget on one screen is where the reader stops
trusting either.

### The scale explains itself, in the card, always visible

A bare `72/100` is a number whose ends the reader has to guess at, and a reader guessing at a scale
either dismisses it or reads it as a conversion score — the one thing it is not. Two lines carry the
whole contract, and **neither may move into the `InfoHint`**: this card renders on the public report and
on paper, where a tooltip is a click nobody makes and a print that never appears.

- `readout.score.scale`, beside the number: the two ends stated outright, 100 is every check passing
  and 0 is none of them.
- `readout.score.method`, beside the scale: the arithmetic (full point / half / none), the fact
  that every check was **counted on this page itself**, and the explicit limit — it rates what was
  counted and says nothing about the page's traffic or revenue, per
  [invariants.md](invariants.md#the-readout-says-what-was-counted-never-what-it-will-produce). The
  `{count}` is `findings.length`, so the sentence names the same set the reader is looking at.

This is a **different** sentence from `readout.hint`, and they must not be merged: the hint answers
where the *findings* come from (measured on the page, load times a best case), this answers what the
*score* over them means.

The card is deliberately large — the number at `text-5xl`/`text-6xl` — and turns to two columns only
at `sm`. It is the first thing on the analysis and on the report, and it was previously small enough
to read as a chip beside the findings rather than the summary of them.

## A group is a card with its score down the left edge

`components/measured-readout.tsx` renders one `DisclosureCard` per `READOUT_GROUP` in a two-column
grid — the same shell the ranked fix cards use. The rail carries the group's score out of 100, the
badge row carries the group's icon, its severity and the passing count, the title is the group label,
and the body is the findings as rows.

**The shell is shared and the widget is not, and that distinction is the whole of it.** A number down
the left edge is how this report says *here is a thing with a score on it*; having one answer to that
for a fix card and a different one for a group card was the inconsistency worth removing. But
`ScoreIndicator` is the **1-10 impact** scale written by a model, and this is **0-100 health**
counted by code — two scales wearing the same widget on one screen is where a reader stops trusting
either. So each rail prints its own denominator and takes its colour from its own map
(`READOUT_SEVERITY_CLASS` here, `impactScoreRailClass` there). `readout-score.tsx` still does not
reuse `ScoreIndicator` at all, for the same reason.

**The denominator was half an answer, and the shape is the other half.** A denominator is *read*; the
shape is what gets *scanned*, and the two rails were the same solid tinted block four cards apart. So
the impact rail now fills from the bottom in proportion to itself — a gauge with a level — while the
health rail stays a plate. The fill is `bg-current`, taking its band colour from the same map as the
numeral, so nothing about which scale is which was written twice. `IMPACT_SCORE_MAX` in
`lib/constants.ts` is shared with the two Zod schemas that bound what a model may return, because a
gauge drawn against a different maximum than the generation was held to either never fills or
overflows.

**This was six flat grids of equal-weight cells under six small labels**, which read as a
spreadsheet: nothing separated *What the page costs to open* from *First content painted*, so the
section could not be scanned at the level of groups at all.

Two things about it are fixes rather than styling, and both are the kind that come back:

- **Everything that toggles is one strip.** An earlier version put the label in a bar and the score on
  a second row below it with both inside the `<summary>`, so two visually distinct strips shared one
  behaviour and a reader who clicked the score row watched the card collapse for no stated reason.
- **The grid is `items-start`.** Grid items stretch to the tallest in their row by default, so opening
  one card grew the empty box of the card beside it.

`READOUT_GROUP_ICON` lives in the component and **not** in `lib/constants.ts`, against the precedent
of every other readout map there. Those are strings; this is a lucide component, and `lib/readout.ts`
and `lib/score.ts` import that file while staying pure. One React import in it would drag the icon
library into both.

## The keyword table — `components/page-terms.tsx`

**It is no longer inside `MeasuredReadout`.** It sits at the end of the analysis, below the four fix
sections, in `PageTerms` — its own `PanelCard` with a heading and a paragraph saying what to take from
it, and the generated ad groups underneath. See [analysis-ui.md](analysis-ui.md).

The move is a product one rather than a layout one. The count was correct and went nowhere: four
Yes/No columns and a reader left to join them. The heading now says the thing the table was always
about — a term repeated fifteen times in the body and absent from the title is a term a crawler, an
assistant and an ad have nothing to match on — and the section below it turns those same terms into
something to spend.

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

**Re-measuring on the owner's click is bounded twice.** `POST /api/analyses/[id]/measure` is no
longer idempotent — it is the re-measure — and the `measure` rate limit is what holds the browser
cost. It spends no credit either way: a re-measure is `measurePage` and arithmetic, never a model
call.

**There is no sweep, and the click is the whole of it.** A weekly cron has existed twice here and
been removed twice, on a reasoning that has never changed: an unbounded sweep re-opening every
customer's landing page is exactly what the backfill was forbidden from becoming, and bounding it
needs something that pays for the browser time. Plans paid for it once and the monitoring
subscription paid for it again; both are gone. What is left is the surface that was always the honest
one -- the owner measures again when they have shipped something, which is also the only moment the
second measurement means anything. See [api.md](api.md) and [product.md](product.md).

**Below two snapshots there is no history, and the owner is now told so instead of shown nothing.**
The sparkline and the per-finding deltas both return null on a single measurement — which is what
almost every analysis has — so the whole history feature was built and invisible to nearly everyone
who owned one. So there are two variants and the page picks between them: `again` is the bare button,
which lives in the report header, and `trend_start` is the dashed panel naming what a second
measurement unlocks, rendered below the readout only while `history.scores.length <= 1`.

**The component no longer takes a `hasHistory` flag.** Whether there is a history is the page's
question and only the page has the answer, and the flag made the component decide between a control
and a section — two things that do not belong in the same slot. The button is in the header because
re-measuring is the action an owner repeats most and it used to sit below the entire document.

## A group whose checks all passed opens closed

Every group card is a `<details>` whose `<summary>` is the bar, and nothing else. It starts open when any finding in it is `warn` or `alert`, and closed
when they all pass; the summary carries the count either way, so a collapsed group still says "12
checks, all passing" rather than hiding that it exists.

**This is disclosure, not gating, and the distinction has to stay written down.** The readout rendered
fully expanded at once -- 41 findings across six grids, four in five of them reporting nothing wrong
-- so the rows that needed attention sat buried among the rows that did not. Nothing here is behind a
payment, a session or a wall: the same reader, one click, no state anyone else controls. The rule in
[invariants.md](invariants.md) is that a measurement of somebody's own page is never *charged for* or
walled; it has never been a rule against letting a reader fold up the part that is fine.

`ok` rows still render and still matter -- see the note on green being load-bearing above. They are
one click away instead of thirty lines of scroll.

## The fix that answers a number sits beside it

A finding cell renders the **title** of any generated fix whose `flow_fixes.finding` names it, from
`fixesByFinding`. The full card -- steps, reasoning, evidence -- stays in its tab; this is a pointer,
never a second copy.

**The pointer is a link, and it had to become one.** As plain text it named a destination without
offering it: the reader was told which card answers this number and then had to find it themselves,
several sections down, inside a panel that may be closed. `fixesByFinding` therefore hands over
`{ id, title }` rather than the title alone, and `SectionLink` opens whatever `<details>` stand in
front of the target before scrolling -- see [components.md](components.md).

**It is empty on every analysis with nothing generated**, which is every free one, and that is
deliberate rather than incidental: an affordance that appeared here and led nowhere would be a
paywall tease inside the one section [invariants.md](invariants.md) says is never gated. The map comes
back empty, the line does not render, and the free readout is exactly what it was.

Rows written before the column existed carry `null` and behave identically. So do fixes no
measurement backs -- nothing counts whether an action is repeated below the pricing table, and `null`
is the honest answer there.

## Where it renders

Mounted once, on the one analysis surface, like `FlowPlaybook`: fed by `readoutFor(analysis)`,
between the cover and the tabs on `/r/<embedKey>`. It used to be mounted on two routes that rendered
the same document — see [report.md](report.md).

**Outside every wall, for everyone.** It is the part a stranger can check against their own page in
one click, so it is what earns the rest of the document a reading; gating a measurement of someone's
own site reads as a trick.

**The trend is the owner's half of it.** `previous` and `scores` come from `readoutHistory`, which
the page only queries when `isOwner` — a delta between two of the owner's measurements is their
record of their own page, and the button that adds points to it is in the header above.

**`PageTerms` is a second mount and a separate section.** The keyword table left this component; it
now renders last in the document, below the four fix sections, and below the `UnlockWall` on a report
with nothing generated. That placement is deliberate: the terms are a measurement, so sitting under the wall does
not gate them, and a reader who has not paid seeing the counted half continue past it is the point.

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
