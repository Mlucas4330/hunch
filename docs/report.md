# The report surface

**One document comes out of an analysis, and it has one route.** `/r/<embedKey>` is opened with no
session and authorized by the opaque key alone. It is the same page for the agency that ran it and for
the client it was sent to. `/analyses/[id]` is an owner-checked redirect onto it and nothing else.

## One axis through the document: `isOwner`

The page computes `isOwner = user !== null && analysis.userId === user.id`, and that flag decides
**what the reader may do**, never **what the document says**.

| Owner-only | Why |
| ---------- | --- |
| `CopyReportLink` | The link it copies *is* the embed key. |
| `readoutHistory`, so the trend and the deltas | The history is the owner's record of the page. |
| `RunAgain` and `RunInProgress` | Every run spends one of the owner's monthly quota. A reader who was handed the link must not be able to spend it. |
| `readout.run.lastRunFailed` | A failed run is the owner's to retry; the client's copy of the report simply keeps its lists. |
| "Back to dashboard" | There is no dashboard without an account. |

**The chrome follows the session, not ownership.** `app/(report)/layout.tsx` mounts the navbar and the
footer for anyone signed in. A signed-out reader gets the page's own `Wordmark` header.

## Five states, one helper

`analysisState` in `lib/analysis-state.ts` is the pure function, and `analysisStateFor` in
`lib/run-analysis.ts` reads the latest run's job only when the rows cannot settle the answer. **Both
this page and `GET /api/analyses` go through it**, so the screen and the client polling it agree.

| State | The rows | What renders |
| --- | --- | --- |
| `measuring` | nothing measured | `MeasuringNotice` |
| `generating` | measured, nothing generated, the latest run's job in flight | `GeneratingNotice` above the four sections, each with a placeholder where its list goes |
| `rerunning` | errors exist, the latest run's job in flight | the current lists, with `RunInProgress` in the owner's header |
| `failed` | the latest run has `failed_at`, or nothing generated and no job | `GenerationFailed` above the sections that have something measured, or in place of the readout when nothing was |
| `ready` | errors exist | `AnalysisSections` |

Three orderings are load bearing:

- **`failed_at` before a running job**, because both are briefly true while a failure unwinds.
- **Lists on screen outrank a failed run.** A "Run again" that fails leaves the previous lists
  `ready`, and the owner sees `readout.run.lastRunFailed` above them.
- **No job and nothing recorded is `failed`**, not a placeholder that never fills. A row from before
  the quota existed has no owner and was only ever measured, so it reads as `ready`.

`GeneratingNotice` and `RunInProgress` poll `GET /api/analyses?embedKey=` through `useAnalysisPoll`
and call `router.refresh()` once when the state stops being `generating` or `rerunning`. They stop at
`ANALYSIS_WAIT_MAX_MS`.

## The page: `app/(report)/r/[embedKey]/page.tsx`

- **Header**: back link, copy link and "Run again" for the owner, disabled with its reason when the
  month's quota is spent; the wordmark otherwise; the language switch for everyone.
- **`ReportCover`**: the host as the `<h1>`, the full URL, the date of the last finished run, and a
  summary sentence assembled in code from counted facts. With nothing generated it prints `report.summaryPending` instead, because
  "0 errors" would read as a clean page.
- **Two summary cells** when there is something generated: errors found, wording errors.
- **The rail and `StartHere`**: a sticky column of anchors above `lg`, built from `REPORT_SECTION` and
  the same section list the page renders, and the three highest-impact structure and visibility errors
  linking to their cards. Neither adds information; see [components.md](components.md).
- **`MeasuredReadout`**: the overall PageSpeed Insights score, the trend and the field data. See
  [readout.md](readout.md).
- **`AnalysisSections`**: AI, SEO, structure and copy, stacked `PanelCard`s, each opening with what
  was measured on its theme. See [analysis-ui.md](analysis-ui.md). **A closed panel is a print bug**, and `@media print` in
  `app/globals.css` prints every `<details>` open.

**Nothing on the report writes a fix.** The copy card quotes the line and says what is wrong with it;
a structure or visibility card names the error and says why. There is no replacement text, no steps,
no preview and no prompt. See [ai-pipeline.md](ai-pipeline.md).

## Copy report link: `components/copy-report-link.tsx`

One `Copy link` button for the owner, in the report header and on each dashboard card. The label stays
a word, never an icon alone. It keeps an explicit failure state and a `document.execCommand` fallback,
because `navigator.clipboard` is undefined outside a secure context.

## Open Graph

`app/(report)/r/[embedKey]/opengraph-image.tsx` renders the host, the number of errors and the
PageSpeed score. An unknown embed key produces the same card shape as a real one rather than revealing
that it does not exist. See [seo.md](seo.md).
