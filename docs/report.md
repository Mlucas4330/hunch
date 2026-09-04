# The report surface

**One document comes out of an analysis, and it has one route.** `/r/<embedKey>` is opened with no
session and authorized by the opaque key alone, and it is the same page for everybody: the reader who
paid for it, the colleague they sent it to, and the visitor who ran a free score before they had an
account. `/analyses/[id]` is a redirect onto it and nothing else.

**Two routes is the shape to keep out.** Splitting this into one authorized by owner, carrying the
app chrome, the readout trend, the re-measure button and the share card, and one authorized by key
carrying the cover, gives two renderings of the same four tabs off the same components. They drift:
the copy panel written twice in two shapes, a `generated` predicate that says `hypotheses ||
flowFixes` on one side and `hypotheses` on the other, two answers to which cards start open.

**`embedKey` is the key because it is the only one that addresses every row.** An analysis nobody has
claimed has no `user_id` (see the free/paid split in [invariants.md](invariants.md)), so it cannot be
addressed by owner. A signed-in reader with an empty balance gets an ownerless analysis too, so this
page is where **every** unpaid run ends up.

## One axis through the document: `isOwner`

The page computes `isOwner = user !== null && analysis.userId === user.id`, and that flag decides
**what the reader may do**, never **what the document says**. Everything measured and everything
generated renders identically for both; what turns on is only the set of controls that spend
something or expose something:

| Owner-only | Why |
| ---------- | --- |
| `CopyReportLink` | The link it copies *is* the embed key. A reader who was handed the link already has it; a reader who was not must not be given it. |
| `readoutHistory`, so `previous` and `scores` on `MeasuredReadout` | The trend is the owner's record of their own page. |
| `MeasurePage` (all three variants) | Every press opens a real browser against three shared slots. A prospect must not be able to spend the owner's. **Do not "fix" the missing button here** -- see [readout.md](readout.md). |
| The alternates drawer | `POST /api/hypotheses/[id]/variants` is authenticated, so for anyone else the button would answer 401. |
| `FixVerdict`, on every hypothesis and every fix card | The decision belongs to whoever owns the page, and the report is handed to clients and partners: what the owner threw out is not theirs to read. `PATCH /api/verdicts` answers 404 to them anyway. |
| "Use this one" on an alternate | `PATCH /api/hypotheses/[id]/variants` is authenticated and owner-checked. Which line gets shipped is the owner's decision, not a reader's. |
| "Back to dashboard" | There is no dashboard to go back to without an account. |
| `MeasurePage` in place of `MeasuringNotice` on an unmeasured row | Same reason: the owner can act on it, the reader can only wait. |

**The chrome follows the session, not ownership**, and that is deliberately the weaker test.
`app/(report)/layout.tsx` calls `getCurrentUser` (`cache()`d, so the page asking again costs
nothing) and mounts `Navbar` + `SiteFooter` for anyone signed in -- including someone reading a
colleague's report, who should still be able to reach their own dashboard. A signed-out reader gets
no app chrome at all and the page prints its own `Wordmark` header instead, because that reader has
no account and app navigation is noise to them.

`loadReport` in `lib/analyses.ts` is the one query, `cache()`d because the page and its
`opengraph-image` both call it. It selects the whole row, `user_id` included, so `isOwner` costs no
second query.

## The old route is a redirect, and it checks ownership

`app/(app)/analyses/[id]/page.tsx` looks the id up scoped to the signed-in user and redirects to
`/r/<embedKey>`. **The owner check is not ceremony.** The embed key is the report's only credential,
so a redirect that resolved any id into one would turn a leaked id into a leaked report. With the
check in place `/analyses` stays in `PROTECTED_PREFIXES` and `app/robots.ts` needs no change.

`components/analysis-history.tsx` and `components/url-input-form.tsx` both link straight at
`/r/<embedKey>` now, so the redirect exists for links already in the wild rather than for anything
the app itself emits.

**Nothing here carries anybody's brand but ours.** There is no PDF, no brand resolver, no
`/settings` and no brand columns: a printed version to hand to a client and a white-labelled report
both belong to a reader who sells audits to somebody else, and that is not this reader. See
[product.md](product.md).

## A measured-only report says so, and never prints zeroes

`generated` is `hypotheses.length > 0 || flowFixes.length > 0`, and when it is false the report is a
readout plus the unlock wall. **The `||` is the point**: counting hypotheses alone would put an
analysis with structural fixes and no copy ideas behind the paywall while its four tabs were sitting
there full. One predicate, on one page.

When it is false, two things must stay off that page: the cover's count sentence, and the "Changes
recommended / Copy already written" strip. Both are filled from counts of generated work, so on a
free run they read `0`, and **"we found 0 changes worth making" is the opposite of "nobody has
written them yet"**. A page scored 47 sitting under a zero reads as a clean bill of health, which is
the one thing the report must never claim by accident.

`ReportCover` takes `counts: ReportCoverCounts | null` for exactly this: no counts, no count
sentence, `report.summaryMeasured` instead. Covered by `e2e/free-analysis.spec.ts`.

## Five states, one helper, and three of them are the same row

A reader who has paid now lands here **about twenty seconds in**, as soon as the page has been
measured, `runAnalysis` commits the readout before it calls a single model, and the form navigates on
`measured` rather than on `generated`. See [api.md](api.md).

That leaves `generated: false` covering three situations that are **identical in Postgres**:

| State | The row | What decides it |
| --- | --- | --- |
| `generating` | owned, measured, empty | a job in flight |
| `failed` | owned, measured, empty | a `refund` row in the ledger |
| `locked` | owned, measured, empty | neither |

`analysisState` in `lib/analysis-state.ts` is the pure function that orders those tests, and
`analysisStateFor` in `lib/run-analysis.ts` pays for the two reads only once a row reaches the
ambiguous middle. **Both this page and `GET /api/analyses` go through it**, so the screen and the
client polling it cannot come to different conclusions about the same row.

Three orderings in that function are load bearing:

- **Ownership before the job.** An anonymous run commits its measurement and returns, and the queue
  writes the job's terminal status a moment later, so the job still says `running` exactly when the
  form navigates the reader here. Asking the job first would show a stranger four placeholders for
  fixes nobody bought.
- **A refund before a running job.** `refundCredit` commits before `runAnalysis` rethrows, so both are
  briefly true; read the other way round a failed analysis would show as generating for the length of
  that gap and for the whole of any retry.
- **Redis down means `running` is false**, so an analysis that is genuinely still working reads as
  `locked`. That is the right way round: a wall on a report still going is fixed by reloading, and a
  placeholder that will never fill is not.

### `failed` exists because the alternative was asking for money back

A generation that throws refunds the credit and leaves a row byte for byte identical to a claimed free
run, so the reader who had paid, waited and been refunded was shown the `UnlockWall` and a button to
buy a credit. **Telling somebody to buy the thing they were just given back** is the worst sentence
available at that moment, and it was the only one the report had.

**The ledger is the record, and nothing new was added to hold it.** `refundCredit` runs from exactly
one `catch`, so a `refund` row against an analysis exists if and only if that generation threw, see
`wasRefunded` in `lib/credits.ts`. It being durable is the point: `JOB_TTL_MS` is ten minutes, and
someone opening the link an hour later gets the same answer as someone who never closed the tab.

It also makes the screen's claim true by construction. `components/generation-failed.tsx` says the
credit came back, and it only renders because the row recording that it came back was found. Had
`refundCredit` itself failed there would be no row, the state would not be `failed`, and nothing would
be on screen claiming a refund that never happened. What it does **not** say is why: nothing here
knows, and naming a cause we did not observe is the invention the rest of the product refuses.

### A report can arrive without its copy tab

`generated` is `hypotheses.length > 0 || flowFixes.length > 0`, and the `||` earns its keep now that
the copy call degrades to an empty list instead of failing the analysis, see
[ai-pipeline.md](ai-pipeline.md). A report with flow and visibility fixes and no copy is a finished
report, and `AnalysisSections` already renders it correctly without being told: it filters on
`counts[tab] > 0`, so the tab is simply absent rather than empty.

**Two other places counted only hypotheses and had to be taught the same predicate**, because both
were safe only while a copy shortfall took everything else down with it:

- `analysisProgress`, otherwise the endpoint answers `generating` forever on a report the page has
  already rendered, and `GeneratingSections` polls until its deadline over a finished document.
- the idempotency guard in `runAnalysis`, otherwise a requeued job regenerates a copy-less analysis
  and inserts a second set of flow fixes beside the first, which is the duplication that guard exists
  to prevent.

### The wait polls the endpoint, not the route

`components/generating-sections.tsx` renders the four `ANALYSIS_TAB` sections by name, each with a
shimmering placeholder. Naming them is what makes a half-filled report read as deliberate rather than
as one that failed to load.

It was `setInterval(router.refresh)`, which re-ran this whole server component every two seconds
`loadReport` with its joins, the current user, the readout history and a Redis read, and had a worse
second cost: the state was recomputed from a transient signal on every pass, so a momentary Redis blip
dropped the page to the wall and the next pass brought the placeholder back. **It flickered between
"still writing" and "buy a credit".**

Now it polls `GET /api/analyses?embedKey=`, which answers off three columns and needs no session, and
calls `router.refresh()` exactly once when the state stops being `generating`. It also **stops**: the
deadline is `ANALYSIS_WAIT_MAX_MS`, the same wall clock the URL form waits on, and running out swaps
the note rather than continuing to ask.

No percentage bar anywhere: nothing measures a percentage, and a bar that advances on its own is the
timer this replaced wearing a different hat.

## The page: `app/(report)/r/[embedKey]/page.tsx`

Read by someone who may never have opened the app, so nothing here may 404 loudly or leak whether an
unknown key exists. Authorization is the opaque `embedKey` alone; `isOwner` is layered on top of it
and never decides whether the row is readable.

**It has one shape**, not one per plan. There is no white-label flag and no `gate()` helper.

The layout sets the shared `CONTAINER_CLASS` for everybody, the same measure the app pages use, so
the report is not a different width from the screen the owner sent it from. The navbar and site
footer above it are session-gated, for the reason in the `isOwner` section above.

The `Wordmark` is wrapped in `data-testid="report-brand"`, and its **presence** is what the suite
asserts.

### Layout

- Header, `ReportCover`, the two summary cells and `MeasuredReadout` stay **above** the tabs, the
  readout ungated, for the reason in [readout.md](readout.md).
- **There is no footer.** "Want a score like this for your own page? / Generated by Hunch" is a
  house ad on a document the reader is being asked to trust, and on the owner's own screen it is the
  product advertising itself to the person who has already paid for it.
- The cover carries an `InfoHint`. `ReportCover` takes it as a `hint` slot rather than building it:
  `InfoHint` is a client component and the page is not, so the page composes it and hands it down
  already built.
- Then `AnalysisSections`, the same **four fix lists**, with nothing held out, as stacked
  `PanelCard`s. See [analysis-ui.md](analysis-ui.md).
  **A closed panel is a print bug**, and `@media print` in `app/globals.css` fixes the general case:
  every `<details>` prints open. Progressive disclosure answers a screen, where the reader can click;
  on paper a closed panel is content deleted from the deliverable. Three of the four analysis panels
  start closed, as does every readout group whose checks all passed, so without that rule a printed
  report is mostly headings.

### The prompt: the report handed back to the tool that built the page

`components/fix-prompt-card.tsx` closes the document, below the fix lists it is assembled from, and
`lib/fix-prompt.ts` builds the string on the server.

**It exists because this reader does not hand-edit their page.** They built it by prompting and they
will fix it by prompting, so the last translation the report can spare them is from "here is what to
change" into "here is the instruction". Everything it needs was already written by the time it runs.

**Assembled, never generated.** No model call, no database read, nothing that can fail, and it costs
nothing. That is also why it is a pure function rather than a route: it is testable without a
browser, which is where the rules below are actually pinned (`lib/fix-prompt.test.ts`).

Four decisions, each of which had a plausible alternative:

- **Text, not a link and not a PDF.** A link would hand `embed_key` -- the report's only credential
  -- to somebody else's model, and it would arrive at a tool that mostly cannot fetch a URL anyway. A
  PDF is lossy and unreadable to most of them. A block of text pastes everywhere and carries nothing
  the reader did not choose to send. A test asserts the string never contains `/r/`.
- **Every replacement travels with the line it replaces**, quoted. A model given only the new text
  has to find the old one itself, and it picks whichever looked closest -- which is how a rewrite
  lands on the wrong element. `current_copy` was quoted verbatim off the page for this exact reason.
- **The owner's own line wins over the model's draft.** It is the one thing on a report that was
  never generated and it is what they actually shipped; sending the draft instead would undo the edit.
- **A bracketed replacement adds a rule telling the model not to fill it in.** This is the one that
  matters most. The report already warns the reader that a `[placeholder]` is a gap they have to
  fill; a prompt that dropped the warning would hand an unfinished line to a tool that will complete
  it with something plausible and false, on a page that is already live.

**It is not owner-gated**, and that is consistent rather than lax: everything in it is already
rendered above it on the same page, so a reader with the link can copy the fixes by hand today. The
owner-only list above is actions that spend a credit or record a decision, and copying visible text
is neither.

### The rail and the triage block

Two additions that carry no new information and exist entirely to make the rest of it navigable.

- **`components/report-rail.tsx`**: a sticky column of anchors above `lg`, marking the section in
  view. `REPORT_SECTION` in `lib/enums.ts` is its order, and the four middle values are spread from
  `ANALYSIS_TAB` rather than retyped, so a rail can never offer a section the page does not render.
  The page builds the list from the same conditions that decide each block; the rail never derives it.
  The scrollspy and the anchor-reveal helper are documented in [components.md](components.md).
- **`components/start-here.tsx`**: the three highest-impact fixes, linking to their own cards. It is
  a **re-presentation and never a new claim**: each row is an existing `flow_fixes` row with its own
  title, badge and impact number. Nothing is summarised or re-scored, and **no predicted outcome may
  ever appear in it.** A block called "what to change first" is exactly where that sentence wants to
  be written, and [invariants.md](invariants.md) forbids it on every surface. It renders only when
  `generated` is true, so a free report gets the `UnlockWall` and the readout grows no affordance that
  reads as a tease.
- **The readout's fix pointer is a link**, not the title of the answering fix printed as text: that
  tells the reader the name of a card and leaves them to find it several sections down, possibly
  inside a closed panel. `fixAnchor()` in `lib/constants.ts` is the one place the id is derived,
  because a link and its target live in different files and have to agree.
- **Nothing is gated by plan.** `UnlockWall` (log in, buy credits) is shown when `generated` is
  false, and it is the only wall on the page.
- **An address is asked for, and it gates nothing.** `WatchPageForm` sits below `MeasuredReadout` for
  a reader who is not the owner, and offers to email them the link to the report. It hands the reader
  something they cannot otherwise keep: an `embed_key` lives in one browser's `localStorage`, so the
  email is their only durable way back. That is the opposite of a wall holding someone else's report
  hostage to a stranger's address. It is skipped for an owner, who reaches the report from their
  dashboard. The offer must never move above the readout; see [invariants.md](invariants.md) and
  [api.md](api.md).
- Copy-tab rows are `HypothesisList`, the same component on the same page for everyone.
  `HYPOTHESIS_EXPANDED_COUNT` rows start open here as everywhere. The cards are short (see the
  drawers in [components.md](components.md)), so the counted rule is enough and nobody is handed six
  full-height cards at once.
- **Hypotheses are ranked by impact and by nothing else.** Floating auto-targetable ideas to the top
  so the previews on top are real ones quietly hands "Start here", which the first row wears, to a
  lesser idea for being easier to photograph.

### The cover: `components/report-cover.tsx`

It opens with the accent rule, `report.preparedBy` (or the generic eyebrow when no name is set), the
**host** as the `<h1>` with the analysis `InfoHint` beside it, the full URL beneath it, a
plain-language summary, and the date.

**This cover won.** The owner's screen had its own header -- an eyebrow, `What to change`, the hint
and the raw URL -- and when the two routes merged one of them had to go. This one names the page
being read rather than the tool reading it, and it already handled `counts: null`.

**The heading is the host** rather than `{count} tests to lift your conversion`, and the URL lost its
purple monospace treatment. Both date from when this document was written for an agency's client, and
both survived the pivot because they were right for either reader.

**The section labels did not.** `analysis.sections` read *Page structure / Wording / Search visibility
/ AI visibility* for that reader and now reads *Structure / Copy / SEO / AI*, the reasoning for going
back is in [analysis-ui.md](analysis-ui.md). Only the **labels** ever moved: the `PlaybookSection`
values in `lib/enums.ts` are persisted in Postgres and are not renamed.

`report.summaryBody` is **assembled in code** from counted facts, total recommendations, how many are
copy the product already wrote, how many are structural, interpolated into a dictionary string, the
same mechanism as `dictionary.readout.findings[id]` in [readout.md](readout.md). It is deliberately
**not** a generation call: a model writing this paragraph would be writing prose around numbers, which
is the failure [invariants.md](invariants.md#a-generated-evidence-carries-a-number-only-from-a-page-this-code-measured) exists to
prevent.

The two summary cells are `report.changesFound` and `report.copyWritten`, both counts of what is in
the document. `topImpact` came out: `7/10` is our internal score and means nothing to this reader.
**Neither cell may ever become a predicted outcome.** See
[invariants.md](invariants.md#the-readout-says-what-was-counted-never-what-it-will-produce).

### Variant preview: `components/variant-preview.tsx`

Rendered for everyone, behind the copy card's **On your page** drawer. One route is what keeps the
picture from reaching everyone the link was shared with and not the person who paid for it. It is a
drawer rather than a stacked panel for the reason in [components.md](components.md), and it is a
click to render, so a drawer nobody opens costs no browser.

Renders the landing page with the recommended copy swapped in, **on request only**. Each preview boots a
browser against the customer's real page, so it POSTs to `/api/report/screenshot` from a click and
never from mount: three of these on a cold report would otherwise launch three browsers before
anyone scrolled to them.

Four states:

| State | What renders |
| ----- | ------------ |
| `idle` | button + a hint naming `PREVIEW_ESTIMATE_SECONDS` |
| `waiting` | button disabled, label swapped, skeleton: **the label is what carries a 10s+ wait**, a pulse alone is not enough. It covers both `queued` and `running`: the reader does not care which, only that it is coming |
| `ready` | the image, plus `report.previewOverflow` in amber when the copy did not fit |
| `error` | a note plus a retry that returns to `idle`. **Reached only on `unavailable`**, never on a slow queue: that split is what the queue bought |

**The overflow note is not an error state.** The render worked; what it shows is the recommendation
being too long for the box the page gives that element, which the reader has to know before shipping it
and which no retry fixes. It reads as a caption on a real image rather than a failure of one, see
[scraping.md](scraping.md#fitting-the-copy-back-into-its-box).

A cached `screenshot_url` arrives as `initialUrl` and renders straight to `ready` with no button and no
request; `variants.screenshot_overflow` rides along as `initialOverflow` so a cached preview carries the
same caption a fresh one does. `manual` hypotheses never mount it at all and show a dashed "apply by hand" note instead.

### The before/after wipe

A render produces two images, and **both come out of one page load**. Same navigation, same viewport,
same scroll offset, same lazy images already settled, so the pair lines up pixel for pixel and the
only thing that differs between them is the copy that was swapped. Loading the page twice would let a
carousel advance or an ad slot fill differently, and the wipe would read as the whole page twitching
rather than as one line changing.

Two things have to happen **before either shot**, and both were learned by getting them wrong:

- **The scroll.** `scrollToTarget` runs once, ahead of both shots, and never again. Inside
  `applyVariantCopy`, which runs *between* the two, the "before" frames the top of the page and the
  "after" frames the element, so the wipe compares two different parts of the page. Re-centring
  afterwards is just as wrong: replacing the text can make the element taller, and the page would
  slide under the wipe.
- **The motion.** `freezeMotion` injects `animation-play-state: paused` and kills transitions. A
  marquee or a looping hero advances in the milliseconds between the two captures, and the wipe shows
  it jumping. Paused rather than `animation: none`, which would drop an element back to its
  unanimated rule, which for the common fade-in-from-zero is invisible.

Measured on a real page with an animated ticker: the rows above the swapped element differ by **0.0%**
and the first difference appears on the row the element starts on. Everything below it differs
legitimately, because longer copy really does push the rest of the card down.

The rewrite sits on top of the current page and is revealed by `clip-path`, never by a width: clipping
shows the right-hand slice of an image still laid out at full size, so the two stay registered.
Resizing it would slide the content sideways under the wipe and nothing would line up.

**The slider's value is how much of the rewrite is showing, never the wipe line's offset.** As the
offset, `clip-path: inset(0 0 0 ${wipe}%)` with the line at `left: ${wipe}%`, *raising* it clips the
rewrite away: dragging the handle toward the `Rewritten` label produces less rewrite and more of the
current page, and a reader watching the picture fill with the page they already have, while the
handle sits under the word "Rewritten", reads it as the two images being the wrong way round. Nothing
is ever swapped: `before` is captured
before the copy is applied, saved to `screenshot_before_url`, and rendered as the base layer, end to
end.

Both the clip and the line now derive from `100 - wipe`, so the number means what the label beside the
handle says, `report.compareValue` ("{percent}% of the rewritten page shown") is literally true rather
than backwards, and the default sits just under halfway so both images are visible at rest.

The handle is an `<input type="range">`. That is the reason it works with a keyboard and a screen
reader at all, arrows move the wipe and the value is announced, none of which exists behind a
`pointerdown` listener.

**It sits on the screenshot rather than under it**, in a translucent strip across the bottom edge of
the frame with `Now` and `Rewritten` at either end of it. Below the frame the same control read as a
stray scrollbar the reader had to connect to the image themselves; over the image it is chrome on the
thing it drives, and the whole comparison is one object. The strip is translucent because it covers
the foot of the page being compared and the reader needs to see that it does, and blurred because
the labels have to stay legible over whatever the screenshot puts behind them. The track carries the
tap target while the thumb keeps its native size, the same trade the pagination dots make in
[components.md](components.md#everything-tappable-clears-44px-on-a-phone).

`overflow` describes the `after` image alone: nothing was changed in `before` to overflow anything.

**A variant rendered before the pair existed shows its one image, and that is not a degraded
rendering.** One image is all that was ever captured for that row. `screenshot_before_url` is null
there and the slider simply does not appear.

The `POST` is bounded by `PREVIEW_REQUEST_TIMEOUT_MS`, derived from the server's real budget, never
written down. **That deadline is for one path only**: normally the POST returns the moment the job is
queued, and it runs long only when Redis is unreachable and the route renders inline instead. The polls
carry no deadline, because a dropped poll is not a verdict, the worker still holds the job, so the
client retries rather than telling the reader the preview failed.

**`onError` on the `<Image>` returns to `idle`.** Since `initialUrl` renders without ever calling the
API, this is the **only** place a pruned, lost or truncated file can be caught, and a broken image on
the one surface shared outward is the thing to avoid. Both facts are why this component owns the
recovery rather than the route.

**The polling timer is cleared on unmount.** A reader who closes a tab or switches away leaves a job
the worker is still running; without the cleanup the component keeps asking about a preview nobody is
looking at.

## Public routes behind these surfaces

**Unauthenticated + CORS `*`; excluded from auth middleware (`api/report`).** It never leaks whether
an unknown key exists.

### `POST /api/report/screenshot` and `GET` beside it

Body `{ embedKey, hypothesisId }`. **The POST renders nothing itself**: it resolves the variant,
returns a cached `screenshot_url` when there is one, and otherwise queues a job and answers
`queued`. The client then polls the `GET` on the same route until it reads `ready` or
`unavailable`. See [scraping.md](scraping.md#the-job-queue--libqueuets) for why the wait moved off
the request.

Both answer `{ status, url, overflow }`, and **`status` is the field that carries the meaning**: a
`url: null` alone means both "still working" and "this can never work", which reaches the reader as
one broken button for two different situations.

`overflow` is the swap's own verdict on whether the copy still got cut off, persisted alongside the
path on `variants.screenshot_overflow` so a cached hit answers the same thing the fresh render did.
It is **not** a reason to withhold the image: the picture of the copy not fitting is the useful part.

The filename carries a random suffix because the file is world-readable once served: a path derivable
from the variant id would make every screenshot guessable, and that id is returned by the
authenticated API. Being same-origin is why `next/image` needs no `remotePatterns` entry and the CSP
needs no `img-src` host, object storage would cost both.

**A cached URL never reaches the render path** (the report server-renders it into `initialUrl`). So a
file that has been pruned, lost with its volume, or left truncated by an interrupted write cannot be
detected server-side. **Do not add an existence check in its place**: it cannot see the path where the
breakage actually shows, and it reads a truncated PNG as present. `onError` on the `<Image>` is the
only place that catches it.

**The duplicate render is closed by construction.** The job id is `screenshot:<variantId>`, so two
readers asking for the same preview share one job instead of starting two renders and orphaning a
file.

## Copy report link: `components/copy-report-link.tsx`

**A control needs a name, and `aria-label` on an icon button is not one.** That is the rule this
component was written for and the one part of it that survived every rewrite.

What renders in the header, **for the owner only**: one `Copy link` button beside `Back to
dashboard`. Owner-gated because the link it copies *is* the embed key, and the report's only
credential must not be handed to a reader who was merely sent it.

**There is no named card and no `Open` button.** With one route a card would describe the page it
is sitting on, and `Open` would open the current URL in a new tab. Naming a destination is worth
doing when there is more than one, and there is not.

- **One component, two mounts**: the report header and each `/dashboard` card. The dashboard one
  passes `relative z-10` to escape the card's `absolute inset-0` overlay link, the same escape the
  delete cluster uses. See [analysis-ui.md](analysis-ui.md).
- **The label stays a word, never an icon alone.** Shrinking the words is allowed and dropping them
  is not. It is `flex-wrap` so the long transient `copyFailed` string wraps instead of overflowing.
- The copy button keeps its explicit failure state and `document.execCommand` fallback, because
  `navigator.clipboard` is undefined outside a secure context: on plain http the promise rejected
  unhandled and the button was simply dead.
- The origin has its trailing slash stripped, the same normalization `siteOrigin()` (`lib/app-url.ts`)
  does.
