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

`readoutFor()` in `lib/analyses.ts` is the single place the four columns are gathered — see
[data-model.md](data-model.md).

## Rules the numbers obey

- **Thresholds (`READOUT_THRESHOLDS`) are deliberately loose.** A false alert on a healthy page is the
  expensive error: this is read by a stranger who can check it against their own site in one click,
  and one wrong accusation discredits every true finding beside it.
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
