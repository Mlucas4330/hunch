# The report surface

**One document comes out of an analysis, and now it has one route.** `/r/<embedKey>` is opened with
no session and authorized by the opaque key alone, and it is the same page for everybody -- the
reader who paid for it, the colleague they sent it to, and the visitor who ran a free score before
they had an account.

**It used to be two routes**, and that is the change worth reading this file for. `/analyses/[id]`
authorized by owner and carried the app chrome, the readout trend, the re-measure button and the
share card; this one authorized by key and carried the cover. They rendered the same four tabs off
the same components, and predictably they drifted: the copy panel was written twice in two shapes,
the `generated` predicate said `hypotheses || flowFixes` on one and `hypotheses` on the other, and
they disagreed about which cards start open. `/analyses/[id]` is now a redirect and nothing else.

**`embedKey` is the surviving key because it is the only one that addresses every row.** An analysis
nobody has claimed has no `user_id` -- see the free/paid split in [invariants.md](invariants.md) --
so it could never have been addressed by owner. Anonymous analysis has landed and so has its wider
case: a signed-in reader with an empty balance gets an ownerless analysis too, so this page is where
**every** unpaid run ends up.

## One axis through the document: `isOwner`

The page computes `isOwner = user !== null && analysis.userId === user.id`, and that flag decides
**what the reader may do**, never **what the document says**. Everything measured and everything
generated renders identically for both; what turns on is only the set of controls that spend
something or expose something:

| Owner-only | Why |
| ---------- | --- |
| `CopyReportLink` | The link it copies *is* the embed key. A reader who was handed the link already has it; a reader who was not must not be given it. |
| `readoutHistory`, so `previous` and `scores` on `MeasuredReadout` | The trend is the owner's record of their own page. |
| `MeasurePage` (both variants) | Every press opens a real browser against three shared slots. A prospect must not be able to spend the owner's. **Do not "fix" the missing button here** -- see [readout.md](readout.md). |
| The alternates drawer | `POST /api/hypotheses/[id]/variants` is authenticated, so for anyone else the button would answer 401. |
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

**Both surfaces used to carry the reader's own brand.** The print report existed because the landing
page sold "hand the printed version to your client", and white-label existed because the reader was
an agency. Neither reader exists now, so the PDF, the brand resolver (`lib/report.ts`),
`ReportBrandMark`, `/settings` and the three brand columns are gone.

## A measured-only report says so, and never prints zeroes

`generated` is `hypotheses.length > 0 || flowFixes.length > 0`, and when it is false the report is a
readout plus the unlock wall. **The `||` is the point**: the two routes used to disagree here, one
counting both lists and one counting hypotheses alone, so an analysis with structural fixes and no
copy ideas showed four tabs on one screen and a paywall on the other. One predicate now, on one page.

When it is false, two things must stay off that page: the cover's count sentence, and the "Changes
recommended / Copy already written" strip. Both are filled from counts of generated work, so on a
free run they read `0` — and **"we found 0 changes worth making" is the opposite of "nobody has
written them yet"**. A page scored 47 sitting under a zero reads as a clean bill of health, which is
the one thing the report must never claim by accident.

`ReportCover` takes `counts: ReportCoverCounts | null` for exactly this: no counts, no count
sentence, `report.summaryMeasured` instead. Covered by `e2e/free-analysis.spec.ts`.

## The page — `app/(report)/r/[embedKey]/page.tsx`

Read by someone who may never have opened the app, so nothing here may 404 loudly or leak whether an
unknown key exists. Authorization is the opaque `embedKey` alone; `isOwner` is layered on top of it
and never decides whether the row is readable.

**It has one shape.** It used to have two, decided by the owner's plan: a free lead magnet with our
`Wordmark` and an email wall per tab, and a paid deliverable with no mark of ours and nothing
blurred. Plans are gone, so `reportIsWhiteLabelled`, `canWhiteLabel` and the `gate()` helper went
with them.

What the layout sets for everybody is the shared `CONTAINER_CLASS`, the same measure the app pages
use, so the report is not a different width from the screen the owner sent it from. The navbar and
site footer above it are session-gated, for the reason in the `isOwner` section above — for a long
time this layout mounted no chrome at all, which was right while this was a second route and is
wrong now that it is the only one.

The `Wordmark` is still wrapped in `data-testid="report-brand"`. Its **presence** is now the thing
worth asserting, which is the opposite of what the wrapper was added for.

### Layout

- Header, `ReportCover`, the two summary cells and `MeasuredReadout` stay **above** the tabs — the
  readout ungated, for the reason in [readout.md](readout.md).
- **There is no footer.** It read "Want a score like this for your own page? / Generated by Hunch",
  which was a house ad on a document the reader is being asked to trust — and on the owner's own
  screen it was the product advertising itself to the person who had already paid for it.
- The cover carries the `InfoHint` that used to sit beside the old screen's `What to change`
  heading. `ReportCover` takes it as a `hint` slot rather than building it: `InfoHint` is a client
  component and the page is not, so the page composes it and hands it down already built.
- Then `AnalysisTabs` — the same **four tabs**, with nothing held out. This surface used to pass
  `tests: 0` to keep a fifth tab away from a reader; running a test is now its own screen, so there
  is no longer a tab to exclude. See [analysis-ui.md](analysis-ui.md).
- **Nothing is gated by plan today.** The wall was an email capture for an agency's lead magnet, and
  it went with the waitlist. What replaces it is `UnlockWall` — log in, buy credits — shown when
  `generated` is false. `gate()`, `Gated` and `BlurredRow` were removed rather than left behind as a
  pass-through with a misleading name.
- **An address is asked for again, and this time it gates nothing.** `WatchPageForm` sits below
  `MeasuredReadout` for a reader who is not the owner, and offers to email them the link to the
  report. The difference from the wall that was removed is the whole point: that one held someone
  else's report hostage to a stranger's address, this one hands the reader something they cannot
  otherwise keep — an `embed_key` lives in one browser's `localStorage`, so the email is their only
  durable way back. It is skipped for an owner, who reaches the report from their dashboard. The
  offer must never move above the readout; see [invariants.md](invariants.md) and
  [api.md](api.md).
- Copy-tab rows are `HypothesisList`, the same component on the same page for everyone. It used to
  be that component on one route and eighty-five lines of inline JSX on the other; the inline copy
  is gone. `HYPOTHESIS_EXPANDED_COUNT` rows start open here as everywhere, which is a change for
  this route — it opened every card, on the argument that a reader who has to click sees nothing.
  The cards got much shorter (see the drawers in [components.md](components.md)), so the counted
  rule is enough and a reader is no longer handed six full-height cards at once.
- **Hypotheses are ranked by impact and by nothing else.** This route used to float auto-targetable
  ideas to the top so the previews on top were real ones. That is gone: the first row wears "Start
  here", and a second sort key quietly hands that label to a lesser idea for being easier to
  photograph.

### The cover — `components/report-cover.tsx`

It opens with the accent rule, `report.preparedBy` (or the generic eyebrow when no name is set), the
**host** as the `<h1>` with the analysis `InfoHint` beside it, the full URL beneath it, a
plain-language summary, and the date.

**This cover won.** The owner's screen had its own header -- an eyebrow, `What to change`, the hint
and the raw URL -- and when the two routes merged one of them had to go. This one names the page
being read rather than the tool reading it, and it already handled `counts: null`.

**The reader is the client's business owner, not a developer.** That is why the heading is the host
rather than `{count} tests to lift your conversion`, why the URL lost its purple monospace treatment,
and why the tab labels in `analysis.tabs` read *Page structure / Wording / Search visibility / AI
visibility* instead of *Flow / Copy / SEO / Found by AI*. Only the **labels** moved: the
`PlaybookSection` values in `lib/enums.ts` are persisted in Postgres and are not renamed.

`report.summaryBody` is **assembled in code** from counted facts — total recommendations, how many are
copy the product already wrote, how many are structural — interpolated into a dictionary string, the
same mechanism as `dictionary.readout.findings[id]` in [readout.md](readout.md). It is deliberately
**not** a generation call: a model writing this paragraph would be writing prose around numbers, which
is the failure [invariants.md](invariants.md#a-generated-evidence-carries-a-number-only-from-a-page-this-code-measured) exists to
prevent.

The two summary cells are `report.changesFound` and `report.copyWritten`, both counts of what is in
the document. `topImpact` came out: `7/10` is our internal score and means nothing to this reader.
**Neither cell may ever become a predicted outcome** — see
[invariants.md](invariants.md#the-readout-says-what-was-counted-never-what-it-will-produce).

### Variant preview — `components/variant-preview.tsx`

Rendered for everyone, behind the copy card's **On your page** drawer. It was on the public route
alone for a while, which meant the picture reached everyone the link was shared with and never the
person who paid for it; with one route that whole class of mistake is gone. It is a drawer rather
than a stacked panel for the reason in [components.md](components.md) -- and it is still a click to
render, so a drawer nobody opens costs no browser.

Renders the landing page with the recommended copy swapped in, **on request only**. Each preview boots a
browser against the customer's real page, so it POSTs to `/api/report/screenshot` from a click and never
from mount — three of these on a cold report used to launch three browsers before anyone scrolled to
them.

Four states:

| State | What renders |
| ----- | ------------ |
| `idle` | button + a hint naming `PREVIEW_ESTIMATE_SECONDS` |
| `waiting` | button disabled, label swapped, skeleton — **the label is what carries a 10s+ wait**, a pulse alone is not enough. It covers both `queued` and `running`: the reader does not care which, only that it is coming |
| `ready` | the image, plus `report.previewOverflow` in amber when the copy did not fit |
| `error` | a note plus a retry that returns to `idle`. **Reached only on `unavailable`**, never on a slow queue — that split is what the queue bought |

**The overflow note is not an error state.** The render worked; what it shows is the recommendation
being too long for the box the page gives that element, which the reader has to know before shipping it
and which no retry fixes. It reads as a caption on a real image rather than a failure of one — see
[scraping.md](scraping.md#fitting-the-copy-back-into-its-box).

A cached `screenshot_url` arrives as `initialUrl` and renders straight to `ready` with no button and no
request; `variants.screenshot_overflow` rides along as `initialOverflow` so a cached preview carries the
same caption a fresh one does. `manual` hypotheses never mount it at all and show a dashed "apply by hand" note instead.

### The before/after wipe

A render produces two images, and **both come out of one page load**. Same navigation, same viewport,
same scroll offset, same lazy images already settled — so the pair lines up pixel for pixel and the
only thing that differs between them is the copy that was swapped. Loading the page twice would let a
carousel advance or an ad slot fill differently, and the wipe would read as the whole page twitching
rather than as one line changing.

Two things have to happen **before either shot**, and both were learned by getting them wrong:

- **The scroll.** `scrollIntoView` used to live inside `applyVariantCopy`, which runs *between* the
  two shots — so the "before" framed the top of the page and the "after" framed the element, and the
  wipe compared two different parts of the page. `scrollToTarget` now runs once, ahead of both, and
  never again: replacing the text can make the element taller, and re-centring on the new height
  would slide the page under the wipe.
- **The motion.** `freezeMotion` injects `animation-play-state: paused` and kills transitions. A
  marquee or a looping hero advances in the milliseconds between the two captures, and the wipe shows
  it jumping. Paused rather than `animation: none`, which would drop an element back to its
  unanimated rule — invisible, for the common fade-in-from-zero.

Measured on a real page with an animated ticker: the rows above the swapped element differ by **0.0%**
and the first difference appears on the row the element starts on. Everything below it differs
legitimately, because longer copy really does push the rest of the card down.

The rewrite sits on top of the current page and is revealed by `clip-path`, never by a width: clipping
shows the right-hand slice of an image still laid out at full size, so the two stay registered.
Resizing it would slide the content sideways under the wipe and nothing would line up.

**The slider's value is how much of the rewrite is showing, never the wipe line's offset**, and the
distinction is a bug that shipped. It used to be the offset: `clip-path: inset(0 0 0 ${wipe}%)` with
the line at `left: ${wipe}%`, so *raising* it clipped the rewrite away. Dragging the handle toward the
`Rewritten` label produced less rewrite and more of the current page — and a reader watching the
picture fill with the page they already have, while the handle sits under the word "Rewritten",
reads it as the two images being the wrong way round. Nothing was ever swapped: `before` is captured
before the copy is applied, saved to `screenshot_before_url`, and rendered as the base layer, end to
end.

Both the clip and the line now derive from `100 - wipe`, so the number means what the label under the
handle says, `report.compareValue` ("{percent}% of the rewritten page shown") is literally true rather
than backwards, and the default sits just under halfway so both images are visible at rest.

The handle is an `<input type="range">`. That is the reason it works with a keyboard and a screen
reader at all — arrows move the wipe and the value is announced, none of which exists behind a
`pointerdown` listener.

`overflow` describes the `after` image alone: nothing was changed in `before` to overflow anything.

**A variant rendered before the pair existed shows its one image, and that is not a degraded
rendering** — one image is all that was ever captured for that row. `screenshot_before_url` is null
there and the slider simply does not appear.

The `POST` is bounded by `PREVIEW_REQUEST_TIMEOUT_MS` — derived from the server's real budget, never
written down. **That deadline is for one path only**: normally the POST returns the moment the job is
queued, and it runs long only when Redis is unreachable and the route renders inline instead. The polls
carry no deadline, because a dropped poll is not a verdict — the worker still holds the job, so the
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

Body `{ embedKey, hypothesisId }`. **The POST no longer renders anything**: it resolves the variant,
returns a cached `screenshot_url` when there is one, and otherwise queues a job and answers
`queued`. The client then polls the `GET` on the same route until it reads `ready` or
`unavailable`. See [scraping.md](scraping.md#the-job-queue--libqueuets) for why the wait moved off
the request.

Both answer `{ status, url, overflow }`, and **`status` is the field that carries the meaning the
old shape could not**: a `url: null` used to mean both "still working" and "this can never work", so
the reader saw one broken button for two different situations.

`overflow` is the swap's own verdict on whether the copy still got cut off, persisted alongside the
path on `variants.screenshot_overflow` so a cached hit answers the same thing the fresh render did.
It is **not** a reason to withhold the image: the picture of the copy not fitting is the useful part.

The filename carries a random suffix because the file is world-readable once served: a path derivable
from the variant id would make every screenshot guessable, and that id is returned by the
authenticated API. Being same-origin is why `next/image` needs no `remotePatterns` entry and the CSP
needs no `img-src` host — object storage would cost both.

**A cached URL never reaches the render path** (the report server-renders it into `initialUrl`). So a
file that has been pruned, lost with its volume, or left truncated by an interrupted write cannot be
detected server-side. **Do not add an existence check in its place**: it cannot see the path where the
breakage actually shows, and it reads a truncated PNG as present. `onError` on the `<Image>` is the
only place that catches it.

**The duplicate render is now closed by construction.** The job id is `screenshot:<variantId>`, so two
readers asking for the same preview share one job instead of starting two renders and orphaning a
file. That used to be an accepted cost bounded by `RATE_LIMITS.screenshot`.

## Copy report link — `components/copy-report-link.tsx`

**A control needs a name, and `aria-label` on an icon button is not one.** That is the rule this
component was written for and the one part of it that survived every rewrite.

What renders in the header, **for the owner only**: one `Copy link` button beside `Back to
dashboard`. Owner-gated because the link it copies *is* the embed key, and the report's only
credential must not be handed to a reader who was merely sent it.

**It used to be a named card with an `Open` button**, and the card made sense while the owner read
this document on a *different* route: it named the thing the link pointed at. With one route the
card described the page it was sitting on, and `Open` opened the current URL in a new tab. What
survives is the only part that still does something.

**It used to be two cards, then one, now none** — the doc once argued for "two named documents, not
three unlabelled controls", because there was a PDF to tell apart from the link. The PDF went, then
the second route went, and with it the last reason to name a destination at all.

- **One component, two mounts**: the report header and each `/dashboard` card. The dashboard one
  passes `relative z-10` to escape the card's `absolute inset-0` overlay link, the same escape the
  delete cluster uses — see [analysis-ui.md](analysis-ui.md).
- **The label stays a word, never an icon alone.** Shrinking the words is allowed and dropping them
  is not. It is `flex-wrap` so the long transient `copyFailed` string wraps instead of overflowing.
- The copy button keeps its explicit failure state and `document.execCommand` fallback, because
  `navigator.clipboard` is undefined outside a secure context: on plain http the promise rejected
  unhandled and the button was simply dead.
- The origin has its trailing slash stripped, the same normalization `siteOrigin()` (`lib/app-url.ts`)
  does.
