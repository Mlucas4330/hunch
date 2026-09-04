# The analysis screens

## Routes

| Route | Page | Description |
| ----- | ---- | ----------- |
| `/` | Landing page | Self-serve funnel for the page's own owner: the score, one track of three steps |
| `/blog` | Blog index | Three posts, the destination for paid traffic -- see [seo.md](seo.md#indexability) |
| `/blog/[slug]` | Blog post | One post, closing on the same CTA |
| `/auth/signin` | Auth | Google, and GitHub when `AUTH_GITHUB_ID`/`SECRET` are set; returns to `callbackUrl` |
| `/dashboard` | My pages | Grid of past analyses, one card per page, above the new-analysis form |
| `/analyses/[id]` | Redirect | Owner-checked, then `redirect('/r/<embedKey>')`. Nothing renders: see [report.md](report.md) |
| `/r/[embedKey]` | The analysis | The one analysis surface: cover, readout, then four tabs: structure, copy, SEO, AI. Public, authorized by the opaque key, with owner-only controls layered on `isOwner`: see [report.md](report.md) |
| `/admin/credits` | Grant credits | Operator only. `notFound()` for anyone whose stored role is not `admin`: see [invariants.md](invariants.md) |

The app routes live under the `(app)` route group; the analysis itself lives in its own,
`app/(report)/r/[embedKey]/`. **There is one analysis screen, not two.** `/analyses/[id]` was a
second render of the same document, authorized by owner instead of by key, and two renders of one
document drift in every direction at once. See [report.md](report.md).

**`/admin/credits` is the only operator screen, and there is no `/settings`.** The gate behind it is
`users.role`, `isAdmin`, `isAdminEmail` and `ADMIN_EMAIL`. See [security.md](security.md).

## Landing page

Written for the person who **owns the landing page**, not for someone selling audits. It is a
self-serve funnel: paste a URL, get a score, unlock the fixes. All copy comes from
`dictionary.landing`.

**The whole page argues one thesis: here is your number, and we counted it.** The score is the hero
because it is the half that costs no model tokens, the half the reader can check against their own
page in one click, and the only thing here anyone shares unprompted.

- **The hero carries the form, not a link to a sign in screen.** `POST /api/analyses` has always
  served an ownerless run, measured, zero tokens, landing on `/r/<embedKey>`, but every CTA pointed
  at `/auth/signin` and `UrlInputForm` rendered only on the protected dashboard, so **the page
  promised a score with no account and offered no way to get one**. Four strings said it
  (`landing.eyebrow`, `lead`, `ctaNote`, `how.intro`) and all four were false. The closing CTA and the
  blog CTA now scroll to `#top` rather than sending a stranger to sign in.
  `e2e/anon-hero.spec.ts` drops the storage state and walks it.
- The hero form passes `showBrief={false}`, and that one flag now gates two fields. The brief only
  reaches a prompt on a run that generates, and an ownerless one never does, so asking four questions
  there is asking for answers nothing will read. **The competitor URL is gated on the identical fact
  for the identical reason**: only the owned branch of `runAnalysis` measures a second page, so
  offering the field in the hero would take a URL and quietly ignore it. It carries
  `submitLabel={d.landing.cta}` so the button keeps the page's own wording instead of the neutral
  "Analyze".
- **An empty balance is said out loud.** `CreditBalance` renders `credits.freeHalf` at zero only
  "You have no credits" beside a Buy button otherwise reads as a dead end, when the whole measured
  readout is still available. The FAQ answers the same question directly. At one credit the line is
  noise, so it is not shown.
- **The balance lives in the account menu, not on the dashboard.** Above the form that spends it, it
  exists on exactly one screen; in `AccountPanel` it is on every screen and in the mobile menu for
  free, because the navbar already renders that panel in both. It is read off the user row on every
  render: `getCurrentUser()` returns the row, so `user.credits` costs no
  extra query and is never the stale number a JWT would carry. `CreditBalance` takes a `variant`: the
  `menu` one drops its border, since the panel around it already is a card. The two variants carry
  different `data-testid`s because the admin screen renders the card one while the navbar renders the
  menu one, and a shared id would be two matches for one selector.
- Hero: the reader's own page, scored. The hero card is a **static mock of a readout**: a score and a
  few finding rows on the placeholder domain in `landing.heroCard.domain`.
- **What the hero card may never show is a miracle number.** A lift, a conversion rate, a revenue
  figure, "X% more signups". A fabricated "+18% lift, Significant" strip on the page whose whole
  thesis is that nothing is invented is the exact thing to keep out.
  Example **readout** values are a different animal: they are the shape of what the product returns,
  shown on a domain nobody mistakes for a real measurement, the same way a screenshot of an interface
  works on any sales page. The rule is therefore narrow and absolute: **no invented outcome, ever,
  and no number presented as measured from anyone's real page.**
- **`#how` sits directly under the hero**, and its position is the argument. It renders
  `landing.steps`. **one** track of three, numbered from 01: paste the URL, get the score, unlock
  the fixes, then the demo. Someone who has read the headline and not yet pasted a URL wants to know
  what they are about to get, and this is the only section that shows it. Below the pains, the page
  argues at the reader for a full scroll before showing them anything.

  **One track, not two.** A second track beside it ("make the report yours") is a path a self-serve
  funnel does not have.

  **The steps are cards that show the screen each one produces** (`components/landing-steps.tsx`),
  two up and the third across the full measure. As three columns of prose (a number, a hairline, a
  heading, a paragraph) under a `ProductDemo` that renders nothing whenever
  `SUPADEMO_DEMO_ID` is unset, which is most environments. So the one section whose job is to *show*
  what the reader is about to get described it in words and showed nothing. The third step gets the
  wide card because it is the one behind a credit, and it sets its text beside its picture rather
  than above it.

  **The illustrations are CSS, and that is a decision with four reasons rather than a preference.** A
  screenshot of a light screen is broken in dark mode; there is no `public/`, no `images` config and
  no `img-src` for a new host in the CSP, so a screenshot is infrastructure rather than design; three
  images of UI on the page that sells "your page is too heavy" argues against itself; and the pattern
  already existed, `HeroReadout` is a CSS reproduction of the real readout card, fed by dictionary
  strings. Each preview is `aria-hidden`: it is a picture of an interface, not one, and the step's own
  heading and body say the same thing in words directly above it.

  Step two shows the **per-group rails, deliberately not the big score**, `HeroReadout` already puts
  `47/100` at `text-7xl` one section above on the same screen, so repeating it would be one picture
  twice. Numbers in the previews are stand-ins exactly as `heroCard.score` is, and **may never become
  a claim about what a change produces**; see [invariants.md](invariants.md). Pill colours come from
  `STEP_CHANNEL_CLASS`, which ends on `--purple`, the channel the featured credit pack already wears
 , because the last step is the one being sold.
- The three pains (`landing.pains`) are the page owner's, not an auditor's: not knowing which part is
  losing people, tools that disagree with each other, and an AI that writes advice about a page it
  never opened. That last one names the real alternative the reader will have already tried. They sit
  in `components/swipe-track.tsx`, which is a snap-scrolling deck with dots under `sm` and the plain
  stack it always was above it. Native scroll snap, not a drag handler: unlike the sphere, a
  horizontal deck **is** a scroll container, so momentum, the trackpad, Tab and the screen reader all
  come free. The dots read position from an `IntersectionObserver` so they are right whatever moved
  the track. Channel colours come from `PAIN_CHANNEL_CLASS`.
- **Sections were merged because the page read as a stack of unrelated blocks.** It had eleven of
  them, each with its own eyebrow and heading, and two seams did most of the damage. The three pains
  and the AI block are now **one** section under `#ai`: the third pain is "asking an AI gets you
  generic advice", and the AI block is what that means, so it sits under the same heading behind a
  rule. Its three points are **list items rather than Cards.** The page carried five different card
  treatments and cutting one was worth more than another bordered box.
- `components/product-demo.tsx` frames the Supademo tour and **carries no heading of its own**: it is
  a `<figure>` inside `#how`, directly under the three steps it is a picture of, and it moved up the
  page with that section rather than separately. Keeping it inside `#how` is the point, a demo
  floating between blocks is what the merges below were undoing. It renders nothing
  while `SUPADEMO_DEMO_ID` is unset, so a missing id is a missing figure and never a broken frame.
  **`SUPADEMO_ASPECT` has to match the recording.** Supademo letterboxes, it preserves the captured
  screen's aspect and pads whatever box it is given, so a container that does not match shows as
  bars rather than as a bigger demo. Re-recording at a different window size means changing that
  constant with it; measure it by screenshotting the iframe and dividing its width by the height of
  the part that is not padding. **It is a client component for one reason:** a lazy third party frame
  is blank for however long someone else's app takes to boot, and the pinned ratio makes that
  blankness a hole the exact size of the demo. A `Skeleton` fills the same box until the iframe's own
  `load` fires and the frame fades in over it, so the section reads as loading rather than as broken.
  Nothing there paints once the frame is up, which is what keeps the no-border rule above intact.
- **On a phone the frame is full bleed, and 375px of width is the ceiling.** A negative margin
  cancels the container's own padding, which is the only lever there is: the frame's height is its
  width divided by `SUPADEMO_ASPECT`, so a 2:1 desktop capture in a 375px column is 187px tall
  however it is presented. That was measured rather than assumed, an expanded modal came out at
  373x187 against the inline 375x188, which is why there is no "enlarge" button. **Turning the phone
  is the one thing that helps**, and the same inline frame then measures 780x390, so a portrait phone
  gets one line of copy saying so and nothing else. The line is two nested elements rather than one
  class list, because "below `sm`" and "in portrait" are different media queries and their order in
  the generated stylesheet is not something to rely on.
- **There is deliberately no link out to the tour's own page.** It would have given the demo the whole
  viewport by handing a visitor who is halfway down the landing page to somebody else's domain.
  Traffic that arrived here does not leave here for a bigger picture.
- **In-page links scroll rather than jump.** `scroll-smooth` sits on `<html>` in `app/layout.tsx`, so
  every anchor on the page -- `howItWorksLink` to `#how`, the closing CTAs to `#top`, the FAQ -- eases
  to its target instead of teleporting, and the reader keeps track of where the page went. Each
  target section carries `scroll-mt-20` so the sticky header does not land on its heading.
  `prefers-reduced-motion: reduce` puts `scroll-behavior` back to `auto` in `app/globals.css`,
  alongside the other animations it stops.
- `components/landing-faq.tsx` renders `landing.faq` as `DisclosureCard` rows and emits the
  `FAQPage` JSON-LD **from the same array**, so the answer a reader opens and the answer a crawler
  quotes cannot drift. The last question is load-bearing: it is where the page says out loud that it
  will not predict a lift, because nobody measured one.

  **Two columns above `lg`: the heading anchors on the left, the questions run down the right.**
  Stacked, a row stretched the full 1440px measure, and a question set in a line that long is one
  nobody scans, the eye has no left edge to come back to. The split is `lg` and not `md` on purpose:
  on a tablet two columns leave each question a pocket-width column with more wrapping than words, so
  one column is the default and the split is the exception. The rows themselves did not change, which
  is what keeps this off the report surfaces that share `DisclosureCard`. `min-w-0` on the list column
  and `self-start` beside the heading's `sticky` are both load-bearing, see
  [components.md](components.md). The JSON-LD `<script>` sits **outside** the grid: it is
  `display: none` so it lays out nothing either way, but an invisible item among the columns is a trap
  for the next edit.
- `landing.ctaNote` sits under both CTA buttons and states the price of clicking: no signup, no card,
  no install. It is a fact about the product, and it is the closest this page comes to urgency
  **there is no countdown, no scarcity count and no "N spots left"**, because none of those would be
  something code counted.
- **`pt-BR` argues a different case than `en`**, per
  [i18n.md](i18n.md#pt-br-is-a-rewrite-not-a-translation). The keys are identical either way; only
  the argument differs.

### The AI section

`#ai`, below `#how`, from `landing.aiSearch`. It holds the pains and the AI block together. It is the one place on the page that
names a capability rather than the score: the analysis has an **AI** tab, and nothing on the landing
said so.

**It argues a mechanism and never a forecast.** An assistant's crawler fetches the document and reads
what the page declares about itself, so anything assembled on screen is not there for it. That is a
statement about how a page is read, and it is checkable.

What it may never say is how much traffic comes from assistants, whether one mentions the reader
today, or what fixing this will produce -- none of which was measured, per
[invariants.md](invariants.md#the-audit-measured-the-page-not-the-index). It carries **no disclaimer
line** saying so: one was written and then cut, because on a section that only ever describes how a
page is read, a paragraph about what cannot be known raises a doubt the copy above never created. The
limit is held by what the section claims, not by a caveat under it -- which means a future edit that
promises a ranking or a citation has nothing left to catch it.

The section closes with a link into `/blog/ai-is-the-new-google`, which is the same argument at
length. `AI_POST_SLUG` names the target so the link cannot outlive the post.

### The credit packs

`components/credit-packs.tsx`, under `#credits`. Three cards: the free half first, then the two from
`CREDIT_PACKS`, R$47 for one analysis, R$147 for three, each with its price, its price **per
analysis**, a one-line tagline and what it includes, all from `dictionary.credits`.

**The free card sells nothing and is deliberately not in `CREDIT_PACKS`.** It has no amount the
Payment Brick could send and no price id, because there is no payment to match it against; what it
describes is the half the product already gives away, and the readout costs a browser slot and zero
tokens, which is what lets it be printed as an offer rather than as a teaser. Its last feature line
says plainly what is *not* in it, a card headed "free" that omits the limit is the wall this product
removed. Its button opens no checkout: it scrolls back to the hero and focuses the URL field
(`URL_FIELD_ID`), because the only thing left to do is start an analysis.

`FEATURED_CREDIT_PACK` names the one marked `credits.mostChosen`; it is `single`, which with the free
card first also puts the mark on the middle of the three. The card carries the ring and the filled
button and no lift: the three are `items-stretch` and the same height, because cards of three
heights read as three different kinds of offer. **It is a claim about the offer, not about the
reader**, and nothing here reads a session, so the mark is the same for everyone and cannot become a
fabricated personal recommendation.

**The displayed price, `CREDIT_PACKS.amountBrl` and the Stripe price id must move together.** The
amount is a dictionary string because the page renders for a reader with no session and no round trip;
a price edited at a provider and not here is a page that lies about what it costs. See
[api.md](api.md).

**The third card is the free half, and it is not a plan.** A monitoring subscription was sold under
this grid and has been removed. See [product.md](product.md). The layout consequence worth keeping is
the one that predicted the problem: it sat below the grid rather than in it because side by side a
reader compared R$97 against R$99 and read it as an expensive pack. That comparison was the correct
one to make, and it is the reason the free card *is* in the grid: comparing it to R$47 is exactly what
a reader should be doing, since the difference between them is the whole product.

**The buy button does one of two things, and the server decides which.** With Mercado Pago configured
it opens the Payment Brick in a modal over the page, card, Pix and boleto, no redirect, and
otherwise it leaves for Stripe checkout. **One dialog serves both cards**, keyed on which pack is
open: two mounted Bricks would be two SDK initialisations racing for one container id. Pix clears after the reader has finished with the form, so what the Brick
says afterwards is that the credits land when the payment is confirmed: **the page may not report a
balance it has not read back.**

**No feature line may promise an outcome.** They say what the credit buys, the score and its rows,
the ranked fixes, the written copy, the preview, never what any of it will produce. Same rule as the
readout's, and a pricing table is where it is easiest to break.

### The live board

`components/analysis-pulse.tsx`, which owns the sphere, the ranked list and the toast.

- The board is `publicLeaderboard()`, the current score of every measured page, deduplicated by
  domain with the best score winning, and the feed is `analysisPulse()`. **What may appear on it, and
  what may never leave the server with it**, is in
  [invariants.md](invariants.md#the-public-board-carries-a-domain-and-a-score-and-nothing-else).
- **A failed query costs the section, never the page.** This is where ad traffic lands, so
  `pulseData()` catches and returns nothing.
- The feed deduplicates by domain too. The same page is measured repeatedly, by its owner after a
  change, by whoever pastes the URL next, and a ticker naming one site twelve times running reads as
  a fake rather than as what the tool is doing.
- **A row with no measurement is only `running` while it still could be.** Past
  `PULSE_RUNNING_MAX_AGE_MS` (the deadline the analysis form itself gives up on) it is a job that
  died, and the feed drops it rather than announcing a page nobody is looking at.
- `components/analysis-sphere.tsx` places the chips on a Fibonacci lattice and turns it in
  `requestAnimationFrame`, writing transforms onto the nodes so spinning costs no renders. Chips are
  billboarded, always square to the reader, which is why the rotation is scripted rather than CSS.
  Rank is deliberately **decorrelated from latitude**: handing the ranked entries to the lattice in
  order puts the best score at one pole and reads as a sorted list rather than a sphere.
- Under `prefers-reduced-motion` there is no idle spin and no idle frame; the sphere still answers a
  drag.
- The toast (`components/analysis-pulse-toast.tsx`) states one row at a time: a page being analyzed
  now, or one just measured. **It is portalled to the body**, because the landing wrapper's
  `animate-fade-up` leaves a transform behind and a transformed ancestor captures `position: fixed`.
  Closing it silences the toast for the tab.
- **The domain is its own element, not a token inside the sentence.** Interpolated into
  `pulse.running` / `pulse.done` it was one run of text in a chip narrow enough that `truncate` ate
  the end of it, and the end is where the score lives. Split across two lines the domain gets the
  emphasis it deserves in mono, the sentence gets its own line, and neither is cut at 375px. Only the
  domain may truncate: it is a hostname and its start identifies it.
- **A bar on a phone, a chip on a desktop.** Pinning only `left` gave the toast the width of its
  content, which on a 375px screen is a box with no room for the sentence inside it. Both edges are
  pinned below `sm`; above it the toast goes back to the corner.
- **The state rule down the left edge is a child element, never `border-l-4` plus a colour class.**
  `cn` runs tailwind-merge, which reads `border-l-4` and `border-l-green` as one group and drops one
  of them, the toast shipped a four pixel rule in the default grey until this was measured. A child
  cannot be merged away, and it leaves the card its own border on all four sides. The running state
  additionally carries an `animate-ping` halo: it is the one that says the tool is working on
  somebody's page at this moment, and a measured row has already happened and sits still.
- A row with no score reads as running whatever its `state` says, and the sentence, the dot and the
  rule all read the same flag, one claim shown three ways cannot be allowed to disagree with itself.

## The blog

Two screens under the `(app)` group, so they inherit the navbar, the footer and the one container.
The index is three cards over `BLOG_SLUG`; the post is `components/blog-article.tsx` followed by the
other two titles and `components/blog-cta.tsx` -- see [components.md](components.md#the-blog-pieces).

- **It exists for paid traffic.** The reader arrives from an ad knowing they have a landing page
  problem and not knowing what to call it, which is why the three posts are what SEO is, what copy is,
  and what changes now that people ask an assistant. Every one of them ends on the same button.
- **A post is subject to the same rule as every other surface: no invented number.** No "X% of
  searches", no lift figure, no "studies show". A post argues the mechanism, exactly as a generated
  `evidence` must -- see
  [invariants.md](invariants.md#a-generated-evidence-carries-a-number-only-from-a-page-this-code-measured). A blog is where that
  rule is easiest to break and most expensive to break, because it is the first thing the reader ever
  sees us say.
- The AI post additionally states what nobody can know: whether an assistant mentions the reader
  today, per [invariants.md](invariants.md#the-audit-measured-the-page-not-the-index).
- `BLOG_SLUG` is the render order, the URL segment and the dictionary key at once. Adding a post is
  adding a slug, then writing it in both locales; nothing else knows the list.
- **Slugs stay English in both locales**, because the locale is a cookie and the two languages are
  genuinely the same URL -- see [i18n.md](i18n.md#why-the-locale-is-a-cookie-and-not-a-url-segment).
  A `pt-BR` slug would be a second URL for one post and a canonical claiming otherwise.

## Dashboard: the My pages screen

`components/analysis-history.tsx`. The dashboard lists the reader's **own** pages, one card each.
Who the reader is has never been a schema question: there is no `client_name` column and no `clients`
table.

### Paging

**The steps pass `scroll={false}`.** The App Router scrolls to the top of the document on every
navigation, and these controls sit at the bottom of the grid they page, so the default threw the
reader back up to the URL form on each click: the button jumped out from under the cursor and the rows
being paged through went off screen. `e2e/pagination.spec.ts` holds the regression, it plants eleven
rows, clicks Older, and asserts `window.scrollY` is still past zero.

`listAnalysesForUser` returns ten a page, and the page comes from `?page=` rather than from client
state, so a reload keeps it and the back button works on a grid that stays server rendered.

- **The controls say Newer and Older, not Previous and Next.** The grid is newest first, which makes
  "previous" ambiguous the moment a reader thinks about it, the page they came from, or the analyses
  before these? Naming the direction by what is in it settles that.
- **A page past the end is clamped to the last one**, in the query helper rather than in the page, so
  the API answers the same way. Returning no rows would render the *empty state*, telling someone
  with thirty analyses that they have none, which reads as data loss rather than as a stale link.
- A number that is not a positive integer falls back to page one. `parsePaging` is shared with
  `GET /api/analyses` so the two cannot drift.
- The nav renders nothing at one page, which is every account until it has eleven analyses.

This is not cosmetic: without it the ten newest were the only ones reachable, and anything older was
stranded with no route to it.

- `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`, so three cards a row fit the `CONTAINER_CLASS` measure
  `app/(app)/layout.tsx` already sets. See [components.md](components.md). The `Card` is
  `flex flex-col` and the footer is `mt-auto`, so
  cards in a row end level whatever the host and url lengths are.
- **The card is named by the hostname**, derived by `displayHost()` (`lib/host.ts`), the one helper the
  public report's title and its OG card both read, so a host is spelled the same way
  everywhere. Resolved server-side in the page's projection, like `formatDate` and the `labels.market`
  label beside it, so the client component receives finished strings.
- **The full url is rendered under it, wrapping (`break-all`), never truncated.** It is the only thing
  separating two analyses of one host, and what distinguishes them is the path and query at the
  *end*, exactly what an ellipsis eats. It also has to stay **one text node**: `e2e/core.spec.ts`
  locates a run by matching the whole url inside `analysis-history`.
- Footer: date, a CSS dot, and the analysis's market.
- **Delete is an icon** (`Trash2`), and confirm/cancel are icons too (`Check` / `X`). The two-step
  inline confirm stays even though `components/ui/dialog.tsx` now exists: a modal to confirm one
  reversible row is heavier than the action it guards. Also unchanged is the rule from
  `copy-report-link.tsx`: the accessible name is `aria-label` on the button, the icon is
  `aria-hidden`. No new dictionary keys; `common.delete` / `common.deleting` / `common.cancel` are the
  labels.
- The whole card is a link via an `absolute inset-0` overlay, so the action cluster escapes it with
  `relative z-10`.
- The footer also carries `CopyReportLink`, the same component the report header mounts, so the
  link is reachable before an analysis is opened. It escapes the overlay the same way. See
  [report.md](report.md#copy-report-link--componentscopy-report-linktsx).
- **Empty state**: shown when the user has no pages yet. Single CTA, paste a landing page URL above.

### URL input form

- Single text input + submit, validating URL format client-side and disabling submit while an analysis
  is in progress.
- **Input and button share a row only when the form's own box can hold both**, which is a
  `@container` query rather than a viewport breakpoint. The same component renders in the dashboard,
  where it owns the column, and in the landing hero, where it has a ~450px grid track beside the
  readout card, a viewport breakpoint cannot tell those apart, and `sm:flex-row` left the field at
  200px on every desktop from 1024 to 1920 with the CTA taking the rest. Below the threshold the
  button drops under the field, which is the mobile shape. Covered by `e2e/core.spec.ts`.
- **Each URL field owns its own error.** There was one shared message slot: a malformed competitor URL
  printed at the bottom of the form, below the pending strip and below the brief disclosure, and set
  `aria-invalid` on the *page* URL input, so a screen reader was told the wrong field was wrong. The
  competitor message now renders under the competitor field, tied to it by `aria-describedby`, and
  replaces that field's hint rather than stacking below it.
- A collapsible `<details>` "Add business details (optional)" holding `components/brief-wizard.tsx`:
  four questions, one screen each, answered by **tapping an option**. Who lands here, what you sell
  them, what they should do, what stops them. Selecting advances on its own, a segmented bar shows
  which of the four have answers, and "Something else" opens a text input for anyone the presets do
  not fit.
- **What is stored is the option's own sentence, not its id.** `BRIEF_OPTION` in `lib/enums.ts` holds
  the ids, the labels are dictionary strings like everything else, and `composeBrief` receives the
  chosen label exactly as it would receive typed text. So the prompt reads the same prose it always
  did, `lib/brief.ts` never learned what an option is, and adding or renaming one changes nothing
  downstream.
- **Where the reader has a credit, the four answers are the price, and the panel says so and opens.**
  `briefRequired` is `user.credits > 0`, and all it does is open the disclosure and swap the summary
  and the intro. **It never blocks the submit**: a reader with a credit and no brief still gets their
  score, because gating a measurement of somebody's own page is the one thing no surface may do (see
  [invariants.md](invariants.md#the-free-half-is-what-code-counted-the-paid-half-is-what-a-model-wrote)). The
  run is then the free half it already knows how to be, and `POST /api/analyses` is what decides that.
  See [api.md](api.md).
- **The wizard opens pre-filled with the last brief this reader wrote**, from `defaultBrief`, so the
  price is four taps once and zero on every analysis after it. It is also why an e2e spec cannot
  assert the briefless path through the form.
- **A brief that arrives complete opens as a summary.** The wizard started at step 0 whatever it was
  handed, so a carried-over brief printed "step 1 of 4" above a segmented bar with all four segments
  already filled: the counter and the bar disagreeing about the same four answers. The summary lists
  `briefFields[field].label` against each stored answer with `briefWizard.edit` beside it, and both
  strings had been sitting in the dictionaries with nothing reading them. `step` is `number | null`,
  `null` being the summary. A partial brief resumes at its first unanswered question, and answering
  the last question with no gaps left lands on the summary, which is where a single edit opened from
  the summary returns to as well.
- **The carried-over brief describes the last page this reader measured, and the next credit may be
  spent on a different one.** That is what the summary is for: the four answers are readable and
  individually changeable before the submit, rather than folded behind a step counter.
- **The report is where the owner answers back.** Every hypothesis and every fix card carries
  `FixVerdict` for the owner: applied, not for me, or undecided. It is the only judgement this
  product holds about its own output and the only thing an acceptance rate can be built from. See
  [components.md](components.md) and [report.md](report.md).
- **A preset states a fact about the business, so it may only state what the question asks.** The
  offer option read "Software on a subscription", and Hunch itself sells a credit per analysis: the
  only option a reader like that can tap asserts a billing model they do not have, and the prompt
  reads the brief as truth. It says "Software or an app" now. The question is what you sell, never how
  you charge for it, and no option may answer a question that was not asked. Adding a sixth option
  instead is the wrong repair, for the reason `BRIEF_OPTION` gives: past about five the step stops
  being a choice.
- It was four text inputs, and before that one textarea. The direction is the point: a blank box asks
  the reader to work out what would be useful, and almost all of them answered it by writing nothing.
  The `<details>` still starts shut, because the fast path is paste and go.
- **Nothing in the wizard navigates.** Every step change is state, never a link or a `scrollIntoView`,
  so the viewport cannot jump out from under the finger that just tapped. See the pagination note
  below for the bug that rule exists to avoid.

### Analysis loader

One label and a running clock while `POST /api/analyses` is pending, and the wait is short: the form
leaves as soon as the page has been **measured**, which is about twenty seconds, rather than waiting
for the generation.

**Nothing here narrates a phase.** Scripted phases paced by `setTimeout` announce "writing the new
copy" at forty six seconds whatever is actually happening, with no component reading any state. The
elapsed counter is the exception, because it measures a real clock.

The rest of the wait belongs where there is something to put beside it: the report screen, under the
reader's own score. See [report.md](report.md).

### There is no usage gate

There is no monthly free allowance and no `blocked` prop on the URL form. Credits are the whole
entitlement, and nothing on this screen counts anything else.

## The analysis screen (`app/(report)/r/[embedKey]/page.tsx`)

**The analysis is the whole product, and it needs nothing but the URL.** See
[product.md](product.md). There is no manual "pick a winner" circuit: the AI recommends one
replacement line (`variants[0]`, the only variant written during the analysis) and the reader can ask
for two alternates beside it.

**There is one of this screen.** See [report.md](report.md) for why `embedKey` is the key and what
`isOwner` does and does not decide.

- **`CopyReportLink`** sits in the header beside `Back to dashboard`, **for the owner only**. A named
  "Deliverables" card above the readout would describe the page it sits on, since there is one route
  and nothing to tell apart. See
  [report.md](report.md#copy-report-link--componentscopy-report-linktsx).
- **`MeasurePage variant="again"` sits in the same header**, also owner-only, passed in as the
  `remeasure` prop rather than built by `ReportHeader`. Below the entire readout is the last thing an
  owner reaches, and this is the action they repeat most. The unmeasured branch
  passes nothing, because that reader already gets the whole `MeasurePage` section below the header
  and a button offering the same thing above it would be the action twice.
- `MeasuredReadout` above the sections, with the score and the group cards for everyone, plus the trend
  for the owner, and `MeasurePage variant="trend_start"` below it while there is only one
  measurement. An analysis with nothing measured shows `MeasurePage` alone to the owner and a
  read-only `MeasuringNotice` to everyone else. See [readout.md](readout.md).
- **`PageTerms` closes the document**, below the four sections: the terms counted on the page and,
  for the owner, the ad groups written off them. It starts **closed.** See [report.md](report.md).
- **A sticky rail runs beside the document above `lg`**, and a triage block opens it. Both exist
  because a generated report is roughly fifteen sections and near a hundred discrete numbers on one
  scroll, with no table of contents and no answer to "of all this, what do I do first". Neither adds
  information: the rail names sections that already render, and `StartHere` re-presents the three
  highest-impact fixes that are already ranked below. The structural rules for both, and the
  prohibition on `StartHere` ever predicting an outcome, are in [report.md](report.md).
- **The document sits in a two-column grid**, and the content column carries `min-w-0`. That is not
  defensive: the keyword table and the `break-all` URLs push a grid track past the viewport without
  it. See [components.md](components.md).

### Four sections: `components/analysis-sections.tsx`, over the `ANALYSIS_TAB` enum

**Structure** (the playbook), **Copy** (the hypotheses), **SEO** and **AI**, stacked, each one a
`PanelCard`. See [components.md](components.md). The first non-empty one opens and the rest start
closed.

**They were tabs, and the shape has now changed four times.** Each fix is worth keeping because each
one created the next problem:

1. An **underline rail**: one `border-b-2` that was `border-transparent` while inactive, so three of
   the four targets had no edge at all and the row read as a strip of words with one of them
   coloured. A reader could not see where one target ended and the next began without hovering it.
2. **A border on every tab**, which fixed that and left four bordered boxes floating on the page's own
   graph-paper background with no container anywhere, four separate components that happened to sit
   above some content, rather than the selector for it.
3. **One `Card` around the strip and the panel**, which fixed the floating and left the report with
   two container idioms on one screen: the readout's collapsing group cards above, a tab strip below.
4. **The same `PanelCard` as everything else**, which is where it is now.

**The reader gains something the tab version could never give them: more than one open at a time.** A
tab is a claim that these are alternative views of one thing. They are not: they are four lists of
work, and somebody deciding what to ship this week wants the structural fixes and the copy on screen
together.

**All four open is not an option and neither is all four closed.** Open is up to twenty fix cards and
eight hypotheses at once, a page nobody reads the start of; closed is four black bars and none of what
the reader paid for.

**Every section here is about what to change, and every one of them needs nothing but the URL.**
There are four and there is no fifth: a live A/B testing stage is not part of this product, so
nothing carries a `counts.tests` prop or a `tests: 0` pair to hold one out of a report. See
[product.md](product.md).

**The labels are technical terms.** Softening them to *Page structure / Wording / Search visibility /
AI visibility* is written for the client of an agency rather than for this reader: someone who owns a
landing page knows what SEO is, and the technical word is both shorter and more precise.

Each panel then opens with a **direct question** from `analysis.sectionQuestions[tab]`, *A sua
página está espantando quem chega?*, *O Google acha a sua página?*, because the bar shares its line
with a count and a panel has width for a sentence. The question frames; it never asserts. What may not
be invented is any **number**, and that rule is untouched.

**Only the labels changed**; the enum values are persisted in Postgres. `ANALYSIS_TAB` keeps its name
because it is still the order and the dictionary key, and the values are the same four things.

- **An empty section is not rendered.** `FlowPlaybook` returns `null` for an empty list, so the shell
  computes emptiness itself. This is the normal case for analyses generated before the visibility audit
  existed: their rows are all `flow`, so SEO and AI are genuinely empty.
- `seo` and `ai` are the same rows cut by category. See [data-model.md](data-model.md).
- **Every panel is mounted**, open or closed, so opening one never remounts an already-rendered
  preview. `<details>` hides the body rather than unmounting it, which is what the tab version got
  from `hidden`.
- **Each panel is wrapped in a `<div>` of its own, and that is a React key fix rather than layout.** A
  panel is built by the page that owns these sections and handed over as a prop, so it is created in a
  server component and reconciled by a client one, which costs it the marking that says it is a
  statically placed child. Dropped in beside the panel heading it becomes the second entry of a
  children array with no key, and dev warns, naming `AnalysisSections` (where the array is) and the
  page (where the element came from). The old fix was a `key` on every panel at every call site, which
  worked on `/analyses/[id]` and was never done on the public report, a fair illustration of what
  two routes rendering one document cost, and one of the reasons there is now one. The wrapper makes
  the panel an only child instead of an array member, and no call site has to know any of this.

### The header over a ranked list: `components/ranked-list-header.tsx`

Eyebrow, title, the section's own `InfoHint`, and the impact legend. It sits **below** the section's
question (`analysis.sectionQuestions`, rendered by `AnalysisSections`): the question frames the
section, this names the list and states what was checked.

**It is a component because there are two lists and they had already drifted.** `FlowPlaybook` built
this markup inline for its three sections and `HypothesisList` had none at all, so the copy tab was
the only one of the four opening straight onto cards. Written twice it drifts again the first time
either is touched, the same failure this whole surface was merged to stop, one level down.

**The copy tab's strings live in `hypothesisList`, not in a `copy` subtree beside `flow`/`seo`/`ai`.**
Those three are `PLAYBOOK_SECTION` values reached through `dictionary[section]` and must mirror each
other key for key; a `copy` sitting next to them would look like a fourth member of a union it can
never join, and would need `stepsLabel` and `evidenceLabel` for cards that have no steps. `copy` is an
`ANALYSIS_TAB` value, and the two enums are deliberately different lists rather than one, the tabs are
what a reader clicks, the sections are what has a dictionary subtree.

### The ranked hypothesis list: `components/hypothesis-list.tsx`

**It is the only copy panel there is**, rendering for everyone. A second copy as inline JSX on
another route is the drift one route exists to prevent; see [report.md](report.md). It takes
`isOwner` for one reason: the alternates call is authenticated.

It takes `embedKey` because the preview route authenticates on the key rather than on a session, so
the key is what has to reach the card.

Impact descending, and **by nothing else**. Floating auto-targetable ideas to the top so the
previews on top are real ones hands "Start here", which the first row wears, to a lesser idea for
being easier to photograph.

**Every row is a `HypothesisCard`.** See [components.md](components.md), over one `DisclosureCard`
shape, no tiers. The first `HYPOTHESIS_EXPANDED_COUNT` (3) merely start open; being open is always a
default, never a state the reader is stuck in.

**An open card is the decision and nothing else.** The body is `current_copy` struck through, the
recommended challenger copy (`variants[0]`) below it, and a row of drawer toggles. Everything that
argues for the change sits behind one of those. See the drawers in [components.md](components.md).

- **The struck line is not decoration.** The list showed only the challenger for a long time, which
  reads as a suggestion floating free of the page: a reader who cannot see the line being replaced
  cannot judge whether replacing it is an improvement, and the section badge alone does not locate it
  on a page with four headings.
- **The two lines carry no visible labels.** `Current` / `Recommended challenger` panel-labels
  inside a tinted panel put four 0.6rem eyebrows above the one sentence the reader came for. The
  strikethrough is the label, and it is the diff convention every reader already has. `report.current` and `report.changeTo` survive as `sr-only` text, because a
  screen reader has no strikethrough to read.
- **The impact number is explained once, in the list header** (`components/impact-legend.tsx`), not
  on each card: an `InfoHint` is a button, and a button inside a `<summary>` toggles the card. What it
  says is bounded, the score ranks the fixes against each other, was written by a model rather than
  counted, and forecasts nothing. See [invariants.md](invariants.md).
- **Why this works** is a drawer holding **two different things**, marked apart on purpose:
  `rationale` argues why the challenger wins, while the variant's `evidence` names the CRO mechanism
  the rewrite uses, what the current line leaves the visitor to infer, and what the replacement
  states outright. The evidence paragraph keeps its `panel-label` prefix
  (`hypothesisList.evidenceMechanism`). Unprefixed, the two read as one undifferentiated paragraph and
  the argument for the change lands as generic reasoning. **Nothing new is generated there**, and what
  is generated obeys
  [invariants.md](invariants.md#a-generated-evidence-carries-a-number-only-from-a-page-this-code-measured) like every other
  `evidence` field.
- **On your page** is the variant preview drawer, and only for an `auto` target. A manual one has no
  selector to swap, so there is nothing to photograph, a line under the copy
  (`report.manualSetupBody`) says so, and the drawer simply has no button.
- **Other options** writes two alternates on demand, **owner only**, and **opening the drawer is what
  buys them**: the `POST /api/hypotheses/[id]/variants` fires once, on first open. There is no loose
  button in the middle of the copy panel, because the drawer is both the control and the place the
  answer lands. **Fail-quiet by design**: the recommendation is already usable, so a failed
  generation shows one line saying so rather than an error the reader cannot act on. Once a hypothesis
  has its alternates they render on open with no second call.

### Nothing shows an effort score, anywhere

`ScoreIndicator` renders **impact only**, on every surface and for both families. There is no `kind`
prop and no effort scale: the widget has one job.

The reason is that the number was never measuring what it claimed to. Effort is the cost of *applying*
a change, and this product does not apply anything, it hands over a document. A reader's real cost
depends on their stack, their CMS and who on their team does the work, none of which the model can see.
A single integer written by a model that has read one page is a guess wearing a gauge.

That was already true for copy hypotheses, where every idea is a single-element text swap
(`lib/ai/prompt.ts` forbids structural ideas and turns them into flow fixes), so the cost is a constant.
It is true for a flow fix too, from the other direction: "add a Q&A block" costs an afternoon or a
sprint depending on the site, and the model cannot tell which.

The one real cost difference the product **can** state is **auto vs manual** on a copy hypothesis, and
code decides it after generation: `resolveTarget` (`lib/prompt-elements.ts`) matches `current_copy`
against the scraped elements and persists the verdict to `hypotheses.target`. The model could not have
known it. That fact is carried by the *Manual setup* badge, which is its single carrier.

**`manual` means we cannot point at the line, and it does not cover a line that is not there.** A
hypothesis quoting text on no element is dropped before it is ever stored, see
[ai-pipeline.md](ai-pipeline.md). What still lands on the badge is a line the page says twice, an
ambiguous near match, and a fragment too short to swap safely: all of them real copy off the reader's
own page, none of them pointable without guessing which occurrence was meant.

No `effort_score` exists anywhere: not in the three prompts, not in either Zod schema, not as a
column. See [ai-pipeline.md](ai-pipeline.md).

**There is no sort/filter bar.** With impact the only scale, sorting is impact alone, and an
auto/manual filter would duplicate a badge that already says the same thing. The list is impact
descending, fixed.

**"Start here" is tied to the default order.** It renders only under impact sort with no filters
applied; under any other order the first row is the first match, not a recommendation.

## The two ranked fix lists: `components/flow-playbook.tsx`

**Two lists, one component.** The flow playbook (structural conversion fixes) and the visibility audit
have the identical shape and share one table, so one component renders both, in all four tabs.
Nothing is duplicated per surface or per kind.

`section` (`PLAYBOOK_SECTION`: `flow` by default, or `seo` / `ai`) selects the dictionary subtree and
the `data-testid`, **and nothing else.** There is no branch on it below the heading, which is the
point. Consequences:

- `dictionary.flow`, `.seo` and `.ai` mirror each other key for key and are keyed by the enum value, so
  the component reads `dictionary[section]` with no mapping table. A key added to one must be added to
  all three or the union access stops typechecking.
- Test ids are `${section}-playbook` and `${section}-fix`, so no two families can be counted as one. **A
  shared `flow-fix` id across sections would break the e2e counts silently.** Those counts are what
  assert the families never merge.
- Rows are split by `splitFixes` and `splitVisibility`, never filtered inline at a call site.
- **`visibility` is deliberately not in this enum.** Writing `PLAYBOOK_SECTION` as
  `[...FIX_KIND, 'seo', 'ai']`, so a kind added to `FIX_KIND` cannot be forgotten here, breaks on the
  one kind that *parents* the others: `splitVisibility` cuts `visibility` into seo and ai and no call
  site ever passes it, so deriving from `FIX_KIND` demands a `dictionary.visibility` nothing can
  reach, which then sits unrendered as a near-copy of `dictionary.seo`. The enum is the three
  sections that actually render.

They render as **separate sections rather than one impact-ranked list**: a founder deciding what to fix
first should not have "write a meta description" ranked in among the conversion fixes.

- Per fix: `FlowCategoryBadge`, two `ScoreIndicator`s, the title, the problem sentence, then a
  `CardDrawers` row of **Why** and **How to ship it.** The `steps` as an `<ol>` numbered `01`-style
  (`font-mono tabular-nums`, the same idiom as `landing.tracks`). Cards carry `break-inside-avoid`
  from when one surface was a print view.
- **The "Why" comes first in the row, and the steps open by default.** Those are two separate rules.
  The order is a hard constraint: as 12px muted text *under* the steps block with a 9.6px label, the
  Why goes unnoticed, and readers reported never seeing that the reasoning existed. **It must never
  go below the thing it explains.** Which drawer starts open is the other question, and the steps win
  it: they are what the card exists to hand over. A closed drawer is not a footnote, it is a labelled
  control the reader chose not to press yet, sitting above the panel it opens.
- **A flow fix changes structure, not one line of text**, so it is shipped by hand rather than as a
  wording swap. The `InfoHint` on the heading exists to say exactly that.
- **Renders `null` when there are no fixes**, so an analysis whose playbook generation failed simply has
  no section. `AnalysisSections` relies on this.
- **Every fix is a `DisclosureCard`.** `expandFrom` is the index past which they *start* closed, the two
  tabbed surfaces pass `PLAYBOOK_EXPANDED_COUNT` (2), and a stacked surface would pass nothing**, so every fix
  starts open. Either way a row can be closed.
- The visibility section's `hint` states the limit of what was measured, per
  [invariants.md](invariants.md#the-audit-measured-the-page-not-the-index).

## The page's own words, and what can be bought with them

`components/page-terms.tsx`, the last section of the analysis, below the four fix sections and in
the same `PanelCard` idiom. Three parts inside it: a heading and a paragraph saying what to take from
the terms, `KeywordTable`, and `AdIdeas` under it. **It starts closed**, like the four above it: open
it is the single largest block in the document, and the rail reaches it in one click from anywhere.

The table counts the terms a page repeats and marks which of its own surfaces already carry each one,
which is the only keyword data this product can honestly produce. See
[invariants.md](invariants.md#keywords-measure-the-pages-own-words-never-the-index). Four Yes/No
columns alone leave the reader to work out that a term said fifteen times in the body and missing
from the title is the finding, so the heading says it and the section below turns the same terms into
something to spend.

`readout.keywords.hint` stays under the table, where the columns it qualifies are, and is
deliberately **not** repeated as an `InfoHint` on the section heading.

### `components/ad-ideas.tsx`

Ad groups for a search campaign, written off the measured terms. Four states like `MeasurePage`
idle with a button, loading, error, and the result, and once written it comes back from the column
rather than the model.

- **Owner only, and it renders nothing at all for anyone else** unless the ideas already exist. A
  reader handed the link sees the measured terms and no affordance leading somewhere they cannot go.
- Each group is a card: the theme, the terms it rests on as chips, then the headlines and the
  descriptions. The negatives close the section.
- **Every line carries its character count against Google's ceiling.** That is the one number that
  belongs in this section, and it is arithmetic over text this code is holding, a headline past
  `AD_HEADLINE_MAX_CHARS` is rejected at upload, so the reader needs to see how much room an edit has.
- **No search volume, no cost per click, no competition, anywhere.** This is the first surface in the
  product whose output *looks* like a keyword tool's, which is exactly why the prohibition is stated
  in the prompt, in the copy, and here. See [ai-pipeline.md](ai-pipeline.md) and
  [ads.md](ads.md).
