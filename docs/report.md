# The report surface

One document comes out of an analysis: the **public report** at `/r/<embedKey>`, opened with no
session and authorized by the opaque key alone.

**It used to be two, and both used to carry the reader's own brand.** The print report existed
because the landing page sold "hand the printed version to your client", and white-label existed
because the reader was an agency. Neither reader exists now, so the PDF, the brand resolver
(`lib/report.ts`), `ReportBrandMark`, `/settings` and the three brand columns are gone.

**What the surface is now:** the page the owner shares, and the page someone sees before they have an
account. Anonymous analysis has landed, and so has its wider case: a signed-in reader with an empty
balance gets an ownerless analysis too, so this page is where **every** unpaid run ends up. That second job is why it survived the deletion at
all: an anonymous analysis has no `userId`, so it cannot live on `/analyses/[id]`, which authorizes
by owner.

`loadReport` moved to `lib/analyses.ts` when `lib/report.ts` went. That file existed to resolve a
brand; the lookup it also held did not deserve to die with it, and it belongs beside the other
analysis queries anyway.

## A measured-only report says so, and never prints zeroes

`generated` is `hypotheses.length > 0`, and when it is false the report is a readout plus the unlock
wall. Two things must stay off that page: the cover's count sentence, and the "Changes recommended /
Copy already written" strip. Both are filled from counts of generated work, so on a free run they read
`0` — and **"we found 0 changes worth making" is the opposite of "nobody has written them yet"**. A
page scored 47 sitting under a zero reads as a clean bill of health, which is the one thing the report
must never claim by accident.

`ReportCover` takes `counts: ReportCoverCounts | null` for exactly this: no counts, no count
sentence, `report.summaryMeasured` instead. Covered by `e2e/free-analysis.spec.ts`.

## Public report — `app/(report)/r/[embedKey]/page.tsx`

No session, no navbar, its own layout. Read by someone who may never have opened the app, so nothing
here may 404 loudly or leak whether an unknown key exists. Authorization is the opaque `embedKey`
alone.

**It has one shape.** It used to have two, decided by the owner's plan: a free lead magnet with our
`Wordmark` and an email wall per tab, and a paid deliverable with no mark of ours and nothing
blurred. Plans are gone, so `reportIsWhiteLabelled`, `canWhiteLabel` and the `gate()` helper went
with them.

`app/(report)/layout.tsx` deliberately mounts no site chrome — no navbar and **no site footer**. That
began as a white-label constraint (the layout sits above the `[embedKey]` segment, so it could not
know whose report it was) and it survives on its own merit: this page is shared outward, and app
chrome on it is noise for a reader with no account. What the layout does set is the shared
`CONTAINER_CLASS`, the same measure the app pages use, so the report is not a different width from
the screen the owner sent it from.

The `Wordmark` is still wrapped in `data-testid="report-brand"`. Its **presence** is now the thing
worth asserting, which is the opposite of what the wrapper was added for.

### Layout

- Header, `ReportCover`, the two summary cells and `MeasuredReadout` stay **above** the tabs — the
  readout ungated, for the reason in [readout.md](readout.md).
- Then the same shell as the analysis screen (`AnalysisTabs`) — the same **four tabs**,
  with nothing held out. This surface used to pass `tests: 0` to keep a fifth tab away from a reader;
  running a test is now its own screen, so there is no longer a tab to exclude. See
  [analysis-ui.md](analysis-ui.md).
- **Nothing is gated today.** The wall was an email capture for an agency's lead magnet, and it went
  with the waitlist. The wall that replaces it is a different wall — log in, buy credits — and it
  arrives with anonymous analysis. `gate()`, `Gated` and `BlurredRow` were removed rather than left
  behind as a pass-through with a misleading name.
- Copy-tab rows are the same `HypothesisCard` the owner's list renders ([components.md](components.md)),
  with this surface's own body, and they all **start open**, unlike the owner's screen — a reader who
  has to click to see anything sees nothing. Auto-targetable ideas are ordered first so the previews on
  top are real ones.
- The **"Why this works"** block is open on each shown idea, not folded into a `<details>` summary: it is
  the argument for the change the reader is being asked to believe.

### The cover — `components/report-cover.tsx`

Shared by both surfaces. It opens with the accent rule, `report.preparedBy` (or the generic eyebrow
when no name is set), the **host** as the `<h1>`, the full URL beneath it, a plain-language summary,
and the date.

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

Rendered on both surfaces: the public report and the owner's own analysis screen. It was on the report
alone for a while, which meant the picture reached everyone the link was shared with and never the
person who paid for it -- see [analysis-ui.md](analysis-ui.md).

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

The rewrite sits on top of the current page and is revealed by `clip-path`, never by a width: clipping
shows the right-hand slice of an image still laid out at full size, so the two stay registered.
Resizing it would slide the content sideways under the wipe and nothing would line up.

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

## Report deliverables — `components/report-deliverables.tsx`

**One named destination, not an unlabelled button.** The analysis produces the public report, and it
used to have no name anywhere in the product: the header carried a bare `Copy report link` button. A
reader who had never seen `/r/` had no reason to press a control that silently writes a URL to the
clipboard.

What renders on `/analyses/[id]` above `MeasuredReadout`: one card under the eyebrow
**Deliverables**, with a name, a line on who it is for, `Open` (new tab) and `Copy link`.

**This used to be two cards, and the doc used to argue for exactly that** — "two named documents, not
three unlabelled controls" — because there was a PDF to tell apart from the link. With one document
the naming is the card's own heading and nothing else. The rule that survives is the one that was
actually right: a control needs a name, and `aria-label` on an icon button is not one.

- **`variant="compact"`** renders the same destination as a small labelled ghost button in each
  `/dashboard` card, so the report is discoverable before an analysis is opened. It carries
  `relative z-10` to escape the card's `absolute inset-0` overlay link, the same escape the delete
  cluster uses — see [analysis-ui.md](analysis-ui.md).
- **The label stays a word, never an icon alone.** Unlabelled controls are the problem this component
  was written to solve, so shrinking the words is allowed and dropping them is not. The row is
  `flex-wrap` so the long transient `copyFailed` string wraps instead of overflowing.
- The copy button keeps its explicit failure state and `document.execCommand` fallback, because
  `navigator.clipboard` is undefined outside a secure context: on plain http the promise rejected
  unhandled and the button was simply dead.
- The origin has its trailing slash stripped, the same normalization `siteOrigin()` (`lib/app-url.ts`)
  does.
