# The analysis screens

## Routes

| Route | Page | Description |
| ----- | ---- | ----------- |
| `/` | Landing page | Self-serve funnel for the page's own owner: the score, one track of three steps |
| `/blog` | Blog index | Three posts, the destination for paid traffic -- see [seo.md](seo.md#indexability) |
| `/blog/[slug]` | Blog post | One post, closing on the same CTA |
| `/auth/signin` | Auth | Google, and GitHub when `AUTH_GITHUB_ID`/`SECRET` are set; returns to `callbackUrl` |
| `/dashboard` | My pages | Grid of past analyses, one card per page, above the new-analysis form |
| `/analyses/[id]` | What to change | The report link, then four tabs: structure, copy, SEO, AI |
| `/r/[embedKey]` | Public report | No session, authorized by the opaque key — see [report.md](report.md) |
| `/admin/credits` | Grant credits | Operator only. `notFound()` for anyone whose stored role is not `admin` — see [invariants.md](invariants.md) |

The app routes live under the `(app)` route group (`app/(app)/analyses/...`); the public report has its
own group, `app/(report)/r/[embedKey]/`.

**There is no `/admin` and no `/settings`.** The three operator screens went with the features they
read (plans, waitlist leads, report opens) and the settings page existed only for white-label. The
**gate** survives — `users.role`, `isAdmin`, `isAdminEmail`, `ADMIN_EMAIL` — because sign-in already
writes the role and a credits screen will want it back.

## Landing page

Written for the person who **owns the landing page**, not for someone selling audits. It is a
self-serve funnel: paste a URL, get a score, unlock the fixes. All copy comes from
`dictionary.landing`.

**The whole page argues one thesis: here is your number, and we counted it.** The score is the hero
because it is the half that costs no model tokens, the half the reader can check against their own
page in one click, and the only thing here anyone shares unprompted.

- **The hero carries the form, not a link to a sign in screen.** `POST /api/analyses` has always
  served an ownerless run — measured, zero tokens, landing on `/r/<embedKey>` — but every CTA pointed
  at `/auth/signin` and `UrlInputForm` rendered only on the protected dashboard, so **the page
  promised a score with no account and offered no way to get one**. Four strings said it
  (`landing.eyebrow`, `lead`, `ctaNote`, `how.intro`) and all four were false. The closing CTA and the
  blog CTA now scroll to `#top` rather than sending a stranger to sign in.
  `e2e/anon-hero.spec.ts` drops the storage state and walks it.
- The hero form passes `showBrief={false}`: the brief only reaches a prompt on a run that generates,
  and an ownerless one never does, so asking four questions there is asking for answers nothing will
  read. It carries `submitLabel={d.landing.cta}` so the button keeps the page's own wording instead of
  the neutral "Analyze".
- **An empty balance is said out loud.** `CreditBalance` renders `credits.freeHalf` at zero only —
  "You have no credits" beside a Buy button otherwise reads as a dead end, when the whole measured
  readout is still available. The FAQ answers the same question directly. At one credit the line is
  noise, so it is not shown.
- Hero: the reader's own page, scored. The hero card is a **static mock of a readout**: a score and a
  few finding rows on the placeholder domain in `landing.heroCard.domain`.
- **What the hero card may never show is a miracle number** — a lift, a conversion rate, a revenue
  figure, "X% more signups". It used to carry a fabricated "+18% lift, Significant" strip, on the
  page whose whole thesis is that nothing is invented, and that is the thing to keep out.
  Example **readout** values are a different animal: they are the shape of what the product returns,
  shown on a domain nobody mistakes for a real measurement, the same way a screenshot of an interface
  works on any sales page. The rule is therefore narrow and absolute: **no invented outcome, ever,
  and no number presented as measured from anyone's real page.**
- `#how` renders `landing.steps`, **one** track of three, numbered from 01: paste the URL, get the
  score, unlock the fixes. It used to be two tracks side by side (`lg:grid-cols-2`), the second one
  being "make the report yours" — that half went with white-label, and one path is what a self-serve
  funnel has.
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
  rule. Its three points are **list items rather than Cards** — the page carried five different card
  treatments and cutting one was worth more than another bordered box.
- `components/product-demo.tsx` frames the Supademo tour and **carries no heading of its own**: it is
  a `<figure>` inside `#how`, directly under the three steps it is a picture of. It renders nothing
  while `SUPADEMO_DEMO_ID` is unset, so a missing id is a missing figure and never a broken frame.
  **`SUPADEMO_ASPECT` has to match the recording.** Supademo letterboxes — it preserves the captured
  screen's aspect and pads whatever box it is given — so a container that does not match shows as
  bars rather than as a bigger demo. Re-recording at a different window size means changing that
  constant with it; measure it by screenshotting the iframe and dividing its width by the height of
  the part that is not padding.
- `components/landing-faq.tsx` renders `landing.faq` as `DisclosureCard` rows and emits the
  `FAQPage` JSON-LD **from the same array**, so the answer a reader opens and the answer a crawler
  quotes cannot drift. The last question is load-bearing: it is where the page says out loud that it
  will not predict a lift, because nobody measured one.
- `landing.ctaNote` sits under both CTA buttons and states the price of clicking: no signup, no card,
  no install. It is a fact about the product, and it is the closest this page comes to urgency —
  **there is no countdown, no scarcity count and no "N spots left"**, because none of those would be
  something code counted.
- **`pt-BR` argues a different case than `en`**, per
  [i18n.md](i18n.md#pt-br-is-a-rewrite-not-a-translation). The keys are identical either way; only
  the argument differs.

### The AI section

`#ai`, between the pains and `#how`, from `landing.aiSearch`. It is the one place on the page that
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

`components/credit-packs.tsx`, under `#credits`. Three cards from `CREDIT_PACKS`, each with its price,
its price **per analysis**, a one-line tagline and what it includes — all from `dictionary.credits`.

`FEATURED_CREDIT_PACK` names the one marked `credits.mostChosen`; it is `trio`, and the card carries
the ring, the lift and the filled button. **It is a claim about the offer, not about the reader** —
nothing here reads a session, so the mark is the same for everyone and cannot become a fabricated
personal recommendation.

**The displayed price, `CREDIT_PACKS.amountBrl` and the Stripe price id must move together.** The
amount is a dictionary string because the page renders for a reader with no session and no round trip;
a price edited at a provider and not here is a page that lies about what it costs. See
[api.md](api.md).

**The buy button does one of two things, and the server decides which.** With Mercado Pago configured
it opens the Payment Brick in a modal over the page — card, Pix and boleto, no redirect — and
otherwise it leaves for Stripe checkout. **One dialog serves the three cards**, keyed on which pack is
open: three mounted Bricks would be three SDK initialisations racing for one container id. Pix clears after the reader has finished with the form, so what the Brick
says afterwards is that the credits land when the payment is confirmed: **the page may not report a
balance it has not read back.**

**No feature line may promise an outcome.** They say what the credit buys — the score and its rows,
the ranked fixes, the written copy, the preview — never what any of it will produce. Same rule as the
readout's, and a pricing table is where it is easiest to break.

### The live board

`components/analysis-pulse.tsx`, which owns the sphere, the ranked list and the toast.

- The board is `publicLeaderboard()` — the current score of every measured page, deduplicated by
  domain with the best score winning — and the feed is `analysisPulse()`. **What may appear on it, and
  what may never leave the server with it**, is in
  [invariants.md](invariants.md#the-public-board-carries-a-domain-and-a-score-and-nothing-else).
- **A failed query costs the section, never the page.** This is where ad traffic lands and it used to
  need no database at all, so `pulseData()` catches and returns nothing.
- The feed deduplicates by domain too. The same page is measured repeatedly — by its owner after a
  change, by whoever pastes the URL next — and a ticker naming one site twelve times running reads as
  a fake rather than as what the tool is doing.
- **A row with no measurement is only `running` while it still could be.** Past
  `PULSE_RUNNING_MAX_AGE_MS` (the deadline the analysis form itself gives up on) it is a job that
  died, and the feed drops it rather than announcing a page nobody is looking at.
- `components/analysis-sphere.tsx` places the chips on a Fibonacci lattice and turns it in
  `requestAnimationFrame`, writing transforms onto the nodes so spinning costs no renders. Chips are
  billboarded — always square to the reader — which is why the rotation is scripted rather than CSS.
  Rank is deliberately **decorrelated from latitude**: handing the ranked entries to the lattice in
  order puts the best score at one pole and reads as a sorted list rather than a sphere.
- Under `prefers-reduced-motion` there is no idle spin and no idle frame; the sphere still answers a
  drag.
- The toast (`components/analysis-pulse-toast.tsx`) states one row at a time: a page being analyzed
  now, or one just measured. **It is portalled to the body**, because the landing wrapper's
  `animate-fade-up` leaves a transform behind and a transformed ancestor captures `position: fixed`.
  Closing it silences the toast for the tab.

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
  [invariants.md](invariants.md#a-generated-evidence-never-carries-a-number). A blog is where that
  rule is easiest to break and most expensive to break, because it is the first thing the reader ever
  sees us say.
- The AI post additionally states what nobody can know: whether an assistant mentions the reader
  today, per [invariants.md](invariants.md#the-audit-measured-the-page-not-the-index).
- `BLOG_SLUG` is the render order, the URL segment and the dictionary key at once. Adding a post is
  adding a slug, then writing it in both locales; nothing else knows the list.
- **Slugs stay English in both locales**, because the locale is a cookie and the two languages are
  genuinely the same URL -- see [i18n.md](i18n.md#why-the-locale-is-a-cookie-and-not-a-url-segment).
  A `pt-BR` slug would be a second URL for one post and a canonical claiming otherwise.

## Dashboard — the My pages screen

`components/analysis-history.tsx`. The dashboard lists the reader's **own** pages. It used to be
**Clients**, one card per client of an agency; the cards and the query did not change when the reader
did, only the words. It is deliberately **not** a
schema change — there is no `client_name` column and no `clients` table.

### Paging

**The steps pass `scroll={false}`.** The App Router scrolls to the top of the document on every
navigation, and these controls sit at the bottom of the grid they page, so the default threw the
reader back up to the URL form on each click: the button jumped out from under the cursor and the rows
being paged through went off screen. `e2e/pagination.spec.ts` holds the regression — it plants eleven
rows, clicks Older, and asserts `window.scrollY` is still past zero.

`listAnalysesForUser` returns ten a page, and the page comes from `?page=` rather than from client
state, so a reload keeps it and the back button works on a grid that stays server rendered.

- **The controls say Newer and Older, not Previous and Next.** The grid is newest first, which makes
  "previous" ambiguous the moment a reader thinks about it — the page they came from, or the analyses
  before these? Naming the direction by what is in it settles that.
- **A page past the end is clamped to the last one**, in the query helper rather than in the page, so
  the API answers the same way. Returning no rows would render the *empty state* — telling someone
  with thirty analyses that they have none, which reads as data loss rather than as a stale link.
- A number that is not a positive integer falls back to page one. `parsePaging` is shared with
  `GET /api/analyses` so the two cannot drift.
- The nav renders nothing at one page, which is every account until it has eleven analyses.

This is not cosmetic: without it the ten newest were the only ones reachable, and anything older was
stranded with no route to it.

- `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`, so three cards a row fit the `CONTAINER_CLASS` measure
  `app/(app)/layout.tsx` already sets — see [components.md](components.md). The `Card` is
  `flex flex-col` and the footer is `mt-auto`, so
  cards in a row end level whatever the host and url lengths are.
- **The card is named by the hostname**, derived by `displayHost()` (`lib/host.ts`) — the one helper the
  public report's title and its OG card both read, so a host is spelled the same way
  everywhere. Resolved server-side in the page's projection, like `formatDate` and the `labels.market`
  label beside it, so the client component receives finished strings.
- **The full url is rendered under it, wrapping (`break-all`), never truncated.** It is the only thing
  separating two analyses of one host, and what distinguishes them is the path and query at the
  *end* — exactly what an ellipsis eats. It also has to stay **one text node**: `e2e/core.spec.ts`
  locates a run by matching the whole url inside `analysis-history`.
- Footer: date, a CSS dot, and the analysis's market.
- **Delete is an icon** (`Trash2`), and confirm/cancel are icons too (`Check` / `X`). The two-step
  inline confirm stays even though `components/ui/dialog.tsx` now exists: a modal to confirm one
  reversible row is heavier than the action it guards. Also unchanged is the rule from
  `report-deliverables.tsx`: the accessible name is `aria-label` on the button, the icon is
  `aria-hidden`. No new dictionary keys; `common.delete` / `common.deleting` / `common.cancel` are the
  labels.
- The whole card is a link via an `absolute inset-0` overlay, so the action cluster escapes it with
  `relative z-10`.
- The footer also carries `ReportDeliverables variant="compact"` — the copy-link action in labelled
  form, so the report is discoverable before an analysis is opened. It escapes the overlay the same
  way. See [report.md](report.md#report-deliverables--componentsreport-deliverablestsx).
- **Empty state**: shown when the user has no pages yet. Single CTA — paste a landing page URL above.

### URL input form

- Single text input + submit, validating URL format client-side and disabling submit while an analysis
  is in progress.
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
- It was four text inputs, and before that one textarea. The direction is the point: a blank box asks
  the reader to work out what would be useful, and almost all of them answered it by writing nothing.
  The `<details>` still starts shut, because the fast path is paste and go.
- **Nothing in the wizard navigates.** Every step change is state, never a link or a `scrollIntoView`,
  so the viewport cannot jump out from under the finger that just tapped. See the pagination note
  below for the bug that rule exists to avoid.

### Analysis loader

Skeleton cards while `POST /api/analyses` is pending, with a four-phase progress label from
`dictionary.urlForm.phases` paced by `PHASE_SCHEDULE` to the real pipeline: scraping -> reading the
head and timing the load -> writing the new copy -> saving results.

### There is no usage gate

The monthly free allowance is gone with plans: no `usage-banner.tsx`, no `lib/usage.ts`, no `blocked`
prop on the URL form. What replaces it is credits, and until they land nothing on this screen counts
anything.

## The analysis screen (`app/(app)/analyses/[id]/page.tsx`)

**The analysis is the whole product, and it needs nothing but the URL** — see
[product.md](product.md). There is no manual "pick a winner" circuit: the AI recommends one
replacement line (`variants[0]`, the only variant written during the analysis) and the reader can ask
for two alternates beside it.

- **The deliverables block** (`components/report-deliverables.tsx`) sits above the readout: the one
  document this analysis produces, named and described rather than left as an unlabelled button. It is
  out of the header row on purpose — a control small enough to sit beside `Back` is a control a
  first-time reader never presses. See
  [report.md](report.md#report-deliverables--componentsreport-deliverablestsx).
- `MeasuredReadout` above the tabs, with the score, the trend, the findings and the
  keyword table — plus `MeasurePage variant="again"` beneath it. An analysis with nothing measured shows
  `MeasurePage` alone instead. Both are owner-only; the reports render `MeasuredReadout` by itself. See
  [readout.md](readout.md).

### Four tabs — `components/analysis-tabs.tsx`, over the `ANALYSIS_TAB` enum

**Structure** (the playbook), **Copy** (the hypotheses), **SEO** and **AI**. `flow` opens first — fix
the structure before the wording — and if it is empty the first non-empty tab opens instead.

**Every tab here is about what to change, and every one of them needs nothing but the URL.** There
used to be a fifth, `tests`, holding the live A/B testing stage; that stage is gone entirely — see
[product.md](product.md) — along with the `counts.tests` prop and the public report's `tests: 0` /
`tests: null` pair that existed only to hold it out of a report.

**The labels went back to technical terms, and that reverses a documented decision on purpose.** They
had been softened to *Page structure / Wording / Search visibility / AI visibility* because the reader
was the client of an agency and not a developer. That reader is gone: someone who owns a landing page
knows what SEO is, and the technical word is both shorter and more precise.

Each panel then opens with a **direct question** from `analysis.tabQuestions[tab]` — *A sua página está
espantando quem chega?*, *O Google acha a sua página?* — because a wrapping row of tabs has no room
for a sentence and a panel does. The question frames; it never asserts. What may not be invented is
any **number**, and that rule is untouched.

**Only the labels changed**; the enum values are persisted in Postgres.

- The analysis screen and the public report render the same shell.
- **Every panel stays mounted and inactive ones are `hidden`**, so switching tabs never remounts an
  already-rendered preview.
- **An empty tab is not rendered.** `FlowPlaybook` returns `null` for an empty list, so the shell
  computes emptiness itself. This is the normal case for analyses generated before the visibility audit
  existed: their rows are all `flow`, so SEO and AI are genuinely empty.
- `seo` and `ai` are the same rows cut by category — see [data-model.md](data-model.md).

### The ranked hypothesis list — `components/hypothesis-list.tsx`

Impact descending. **Every row is a `HypothesisCard`**, the shared header the public report renders
too — see [components.md](components.md) — over one `DisclosureCard` shape, no tiers. The first
`HYPOTHESIS_EXPANDED_COUNT` (3) merely start open; being open is always a default, never a state the
reader is stuck in. There used to be a separate always-open card component, and a reader who had
finished with row 1 had no way to fold it away.

- The body carries **`current_copy` struck through, then the recommended challenger copy**
  (`variants[0]`), and the **"Why this works"** block. The top row carries a coral ring and the "Test
  this first" flag.
- **The control line is not decoration.** The list showed only the challenger for a long time, which
  reads as a suggestion floating free of the page: a reader who cannot see the line being replaced
  cannot judge whether replacing it is an improvement, and the section badge alone does not locate it
  on a page with four headings. The report always showed both; this is the
  screen catching up, and it reuses their `report.current` keys rather than minting a second wording
  for the same idea.
- That block holds **two different things**, and they are marked apart on purpose: `rationale` argues
  why the challenger wins, while the variant's `evidence` names the CRO mechanism the rewrite uses —
  what the current line leaves the visitor to infer, and what the replacement states outright. The
  evidence paragraph carries a `panel-label` prefix (`hypothesisList.evidenceMechanism`), the same
  idiom the landing hero mock uses. Unprefixed, the two read as one undifferentiated paragraph and the
  argument for the change lands as generic reasoning. Marking it is the whole fix: **nothing new is
  generated there**, and what is generated obeys
  [invariants.md](invariants.md#a-generated-evidence-never-carries-a-number) like every other
  `evidence` field.
- **Two alternate options, written on demand.** Only the recommendation exists when the screen loads.
  `Other options` fires `POST /api/hypotheses/[id]/variants`, shows a "Writing other options..."
  label, and renders the two alternates under the recommendation when they land. **Fail-quiet by
  design**: the recommendation is already usable, so a failed generation leaves the card as it was
  rather than showing an error the reader cannot act on. Once a hypothesis has its alternates they
  render on load and the button is gone. For an agency handing over finished copy, three options for a
  headline are worth having on their own.

### Nothing shows an effort score, anywhere

`ScoreIndicator` renders **impact only**, on every surface and for both families. There is no `kind`
prop and no effort scale: the widget has one job.

The reason is that the number was never measuring what it claimed to. Effort is the cost of *applying*
a change, and this product does not apply anything — it hands over a document. A reader's real cost
depends on their stack, their CMS and who on their team does the work, none of which the model can see.
A single integer written by a model that has read one page is a guess wearing a gauge.

That was already true for copy hypotheses, where every idea is a single-element text swap
(`lib/ai/prompt.ts` forbids structural ideas and turns them into flow fixes), so the cost is a constant.
It is true for a flow fix too, from the other direction: "add a Q&A block" costs an afternoon or a
sprint depending on the site, and the model cannot tell which.

The one real cost difference the product **can** state is **auto vs manual** on a copy hypothesis, and
code decides it after generation: `resolveTarget` (`lib/scrape.ts`) matches `current_copy` against the
scraped elements and persists the verdict to `hypotheses.target`. The model could not have known it.
That fact is carried by the *Manual setup* badge, which is its single carrier.

`effort_score` is gone end to end — all three prompts, both Zod schemas and both `effort_score` columns.
See [ai-pipeline.md](ai-pipeline.md).

**There is no sort/filter bar.** With effort and quick wins gone, sorting collapsed to impact alone,
and the auto/manual filter was removed with it — the badge says the same thing without a control. The
list is impact descending, fixed.

**"Start here" is tied to the default order.** It renders only under impact sort with no filters
applied; under any other order the first row is the first match, not a recommendation.

## The two ranked fix lists — `components/flow-playbook.tsx`

**Two lists, one component.** The flow playbook (structural conversion fixes) and the visibility audit
have the identical shape and share one table, so one component renders both on **all three** analysis
surfaces. Nothing is duplicated per surface or per kind.

`section` (`PLAYBOOK_SECTION`: `flow` by default, or `visibility` / `seo` / `ai`) selects the dictionary
subtree and the `data-testid`, **and nothing else** — there is no branch on it below the heading, which
is the point. Consequences:

- `dictionary.flow`, `.visibility`, `.seo` and `.ai` mirror each other key for key and are keyed by the
  enum value, so the component reads `dictionary[section]` with no mapping table. A key added to one
  must be added to all four or the union access stops typechecking.
- Test ids are `${section}-playbook` and `${section}-fix`, so no two families can be counted as one. **A
  shared `flow-fix` id across sections would break the e2e counts silently** — those counts are what
  assert the families never merge.
- Rows are split by `splitFixes` and `splitVisibility`, never filtered inline at a call site.
- **`visibility` survives as a value even though no surface renders it combined any more.** It was what the print report renders, because on
  paper there is nothing to click and the SEO / AI split would only mean two headings.

They render as **separate sections rather than one impact-ranked list**: a founder deciding what to fix
first should not have "write a meta description" ranked in among the conversion fixes.

- Per fix: `FlowCategoryBadge`, two `ScoreIndicator`s, the title, the problem, the **"Why" block**
  (`components/why-block.tsx`) and then the `steps` as an `<ol>` numbered `01`-style (`font-mono
  tabular-nums`, the same idiom as `landing.tracks`). Cards carry `break-inside-avoid` because one of
  the three surfaces is a print view.
- **The "Why" comes before the steps, and is a panel rather than a footnote.** It used to be 12px muted
  text under the steps block, with a 9.6px label — readers reported never noticing the reasoning existed
  at all. Do not shrink it back below the copy it explains.
- **A flow fix changes structure, not one line of text**, so it is shipped by hand rather than as a
  wording swap. The `InfoHint` on the heading exists to say exactly that.
- **Renders `null` when there are no fixes**, so an analysis whose playbook generation failed simply has
  no section. `AnalysisTabs` relies on this.
- **Every fix is a `DisclosureCard`.** `expandFrom` is the index past which they *start* closed — the two
  tabbed surfaces pass `PLAYBOOK_EXPANDED_COUNT` (2), and a stacked surface would pass nothing**, so every fix
  starts open. Either way a row can be closed.
- The visibility section's `hint` states the limit of what was measured, per
  [invariants.md](invariants.md#the-audit-measured-the-page-not-the-index).
