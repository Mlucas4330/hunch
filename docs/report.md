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
| `measuring` | nothing measured | `AnalysisProgress` |
| `generating` | measured, nothing generated, the latest run's job in flight | `AnalysisProgress` above the four sections, each with a `PendingList` where its list goes |
| `rerunning` | errors exist, the latest run's job in flight | the current lists, with `RunInProgress` in the owner's header |
| `failed` | the latest run has `failed_at`, or nothing generated and no job | `GenerationFailed` above the sections that have something measured, or in place of the readout when nothing was |
| `ready` | errors exist | `AnalysisSections` |

Three orderings are load bearing:

- **`failed_at` before a running job**, because both are briefly true while a failure unwinds.
- **Lists on screen outrank a failed run.** A "Run again" that fails leaves the previous lists
  `ready`, and the owner sees `readout.run.lastRunFailed` above them.
- **No job and nothing recorded is `failed`**, not a placeholder that never fills. A row from before
  the quota existed has no owner and was only ever measured, so it reads as `ready`.

`AnalysisProgress` and `RunInProgress` poll `GET /api/analyses?embedKey=` through `useAnalysisPoll`
and call `router.refresh()` once when the state stops being `generating` or `rerunning`. They stop at
`ANALYSIS_WAIT_MAX_MS`.

## The wait

A run is minutes long: a browser opens the page, Google scores it, the site is crawled, the index is
asked, and three models write. `components/analysis-progress.tsx` is what somebody looks at for those
minutes, on the dashboard form and here, and its shape is in [components.md](components.md).

**Everything it shows is something that happened.** `lib/run-progress.ts` records a `RUN_STEP` in
Redis *after* the call it names returned, `analysisProgress` reads them back, and the four lines of
`lib/run-phases.ts` are grouped from them. A call that failed records nothing and its line stays
short, which is the honest reading: we did not measure that. The screenshot is the run's own, and the
two numbers are the ones the report opens with.

**Nothing on it is a timer**, apart from the clock and the rotating line. That line says what the
audit covers, never what it has found, because a sentence like "hero analysed, 3 errors" would be a
finding invented to fill a wait.

**It degrades rather than breaks.** Steps live in Redis and Redis is allowed to be missing, so with no
steps at all the lines still advance on `measured` and `generated`, which are read from the row. Four
lines that move twice, instead of eight steps that move once each.

## The page: `app/(report)/r/[embedKey]/page.tsx`

- **Header**: back link, copy link and "Run again" for the owner, disabled with its reason when the
  month's quota is spent; otherwise `ReportBrandMark`, the agency's logo, else its name, else the
  wordmark; the language switch for everyone. See
  [invariants.md](invariants.md#the-agencys-brand-comes-from-one-resolver-on-three-surfaces).
- **`ReportCover`**: the host as the `<h1>`, the full URL, the date of the last finished run, and a
  summary sentence assembled in code from counted facts. With nothing generated it prints `report.summaryPending` instead, because
  "0 errors" would read as a clean page.
- **The agency note**: the owner sees a textarea and a save button, everybody else sees the saved
  text, and an analysis with no note renders nothing. It is rendered as the agency's own words, with
  no mark of ours beside it, for the same reason the header shows their logo. The action behind it
  re-checks the session and the ownership itself. See
  [invariants.md](invariants.md#the-agencys-brand-comes-from-one-resolver-on-three-surfaces).
- **Two summary cells** when there is something generated: errors found, wording errors.
- **The rail and `StartHere`**: a sticky column of anchors above `lg`, built from `REPORT_SECTION` and
  the same section list the page renders, and the three highest-impact structure and visibility errors
  linking to their cards. Neither adds information; see [components.md](components.md).
- **`MeasuredReadout`**: the overall PageSpeed Insights score, the trend and the field data. See
  [readout.md](readout.md). Under it, the phone screenshot of the page from the run that measured
  it, and **nothing at all when that run took none**: an empty frame would read as a page that
  renders nothing, which is a verdict on the site rather than on our storage.
- **Every error card carries its severity and what it costs**: `SeverityBadge`, read from the impact
  score the card already shows, and one sentence of `business_impact`. A copy card also carries
  `ElementCrop`, the quoted line framed inside that same screenshot, which renders only when the run
  measured a box for it in the phone layout. **The frame is CSS over one shared picture**, never a
  file cut per error, and it divides by `SCREENSHOT_PIXEL_RATIO` because the box is in CSS pixels
  while the picture is not. See [scraping.md](scraping.md#the-screenshot-and-the-element-boxes). It
  is capped at `ELEMENT_CROP_MAX_HEIGHT_PX`, because a line quoted from a section that runs most of
  the screen would otherwise get a frame taller than the card it belongs to.
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
PageSpeed score, under the agency's name when the owner set a brand. An unknown embed key produces the same card shape as a real one rather than revealing
that it does not exist. See [seo.md](seo.md).
