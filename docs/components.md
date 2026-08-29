# Shared components

The pieces used across more than one surface. Screen-specific composition lives in
[analysis-ui.md](analysis-ui.md) and [report.md](report.md).

Never use hardcoded hex values or raw Tailwind color classes; every colour below is a token map in
`lib/constants.ts`.

## Interaction feedback

**There is no teal.** It was a channel (`--teal`), it was what `social_proof`, `objections` and
`ai_answerability` painted, and it is gone from `app/globals.css` as well as from every map — the
owner ruled it out of the palette. The channels are purple, purple-soft, coral, amber, blue, green,
red and neutral, and **a colour that is not one of those does not get added at a call site**; it gets
added to `globals.css` first or not at all.

Three rules hold across every clickable thing here, and they are set once rather than per component.

**The pointer cursor is a reset, not a class.** Tailwind v4's preflight dropped v3's
`button, [role="button"] { cursor: pointer }`, so every button in the app rendered with the arrow.
`app/globals.css` restores it for `button`, `[role="button"]` and `summary`, and gives a disabled
button `not-allowed`. That is why `components/ui/button.tsx` carries `disabled:cursor-not-allowed`
instead of the shadcn default `disabled:pointer-events-none`: `pointer-events-none` means the cursor
can never be shown at all, and the hover falls through to whatever is behind the button.

**One tempo.** `a`, `button`, `summary`, `input`, `textarea` and `[role="button"]` transition colour,
border, shadow, transform and opacity over 150ms ease-out from `app/globals.css`, so a component that
adds no transition of its own is still in step with the rest. `prefers-reduced-motion` collapses both
the transitions and the two keyframe animations.

**A click that starts a round trip says so.** Anything driving a `fetch` already owns its own pending
state; server action forms had none, which is the click that reads as ignored. `SubmitButton` and
`PendingFieldset` in `components/submit-button.tsx` wrap `useFormStatus` and are used by the sign in
page, the sign out form and the language toggle. The spinner is added beside the label rather than
replacing it, so no button needs a second dictionary string.

### Hero glint — `.animate-hero-shine`

The landing's readout card catches the light every six seconds. It is the only motion on the page
that repeats, and the card is the one element on the landing whose job is to be looked at.

**The rhythm lives inside the keyframes, not in a timer.** `hero-shine` holds the band off screen
from 0% to 85% and crosses in the remaining 15%, so one infinite animation gives a 0.9s sweep and a
5.1s pause, and nothing in JavaScript has to keep time. A `setInterval` toggling a class would be a
second source of truth for a rhythm CSS can hold on its own.

**Diagonal and narrow is what separates a glint from a wash.** `.animate-shimmer` sweeps a soft band
across the full width because a skeleton is saying "still working"; a 90deg gradient at that width on
a near white card just reads as the card briefly going grey. At `105deg` with the stops inside
`42%`--`58%` it reads as a hard edge of light crossing a surface instead. The colour is
`--color-foreground` at 14%: a lighter sweep is invisible on a white card, and an accent tint at a
strength you could actually see turned the whole card purple.

`overflow: hidden` on the host clips the band to the card's rounded corners, and `pointer-events:
none` keeps the pseudo element out of the way of anything below it. `prefers-reduced-motion: reduce`
stops the animation, which leaves the band parked off screen at `translateX(-100%)` rather than
frozen across the content.

**A scroll reveal used to live here and was removed.** Every section below the fold rose and faded as
it came into view, driven by an `IntersectionObserver` over a `.reveal` class, with the hidden state
gated on a `data-reveal` attribute an inline script set on `<html>` before first paint. The gate was
the whole design: content was only ever hidden once something had confirmed it could be un-hidden.

It kept breaking anyway, and always in the same shape -- **the half that hides and the half that
reveals had different lifetimes.** The attribute never came off `<html>` while the observer was bound
to a snapshot of nodes, so a client side navigation, a locale switch that replaced list items keyed on
translated strings, and a bundle that failed to arrive each left content at `opacity: 0` for good. Each
fix was correct and each one uncovered the next: re-arm per route, then watch the tree for mutations,
then stamp an attribute so the inline script could disarm itself when the bundle never landed. What
finally settled it was that the effect was not worth the machinery.

`motion` was weighed as the alternative and lost on one property. It renders `initial` into the
server's HTML, so `opacity: 0` ships in the markup and a reader whose bundle never lands sees nothing
-- the exact failure the gate existed to prevent, and no library can sell the other side of it:
**visible without JavaScript and faded in with it needs a gate only JavaScript opens.** A library
would have supplied the observer, which was never the hard part. The pure CSS `animation-timeline:
view()` version that came before all of this was checked again in August 2026 and is still not
Baseline, so it is still silently inert in Firefox.

The wrapper level `.animate-fade-up` on each page is untouched by any of that. It fires once on mount
and never hid anything, which is why it never had a failure mode to begin with.

## Loading shells — `components/route-skeleton.tsx`

Every page is a dynamic Server Component, so without a `loading.tsx` the browser holds the previous
screen untouched until the whole render lands. Worse, a `<Link>` prefetch of a dynamic segment only
stores payload down to the nearest `loading.tsx`, so with none present **the prefetch keeps nothing**
and every click is a full round trip with no feedback.

`RouteSkeleton` takes a `ROUTE_SKELETON` variant and paints the layout of the page that is coming --
a grid of rows or one analysis -- built from `components/ui/skeleton.tsx`. It reads its
`common.loading` label from `useI18n` rather than `getDictionary()`, so the shell stays out of
`cookies()`. Mounted by `app/(app)/dashboard/loading.tsx` and `app/(report)/r/[embedKey]/loading.tsx`.
There used to be a third, under `/analyses/[id]`, byte for byte identical to the report's; that route
renders nothing now, so it went with the page.

There is deliberately no `loading.tsx` at the `app/(app)` group root: it would cover
`/auth/signin` too, and neither shell is that page's shape.

## Layout

**A flex or grid item defaults to `min-width: auto` and will not shrink below its content.** That is
what broke the readout on a phone twice over, and both breaks looked like a styling accident rather
than a rule: `ReadoutScore`'s bar rows pushed 85px past a 360px viewport because a `flex-1` label sat
beside a fixed-width bar with no `min-w-0` in the chain, and the analysis header let a long URL run off
the screen because its parent is `items-start` in column direction, which sizes a child to its own
content so `truncate` had nothing to truncate against. **`truncate` only works if an ancestor actually
constrains the width** — pair it with `min-w-0` on every flex or grid ancestor, and `w-full` under
`items-start`.

The way to check is to measure, not to look: set a 360px viewport and compare
`document.documentElement.scrollWidth` against `clientWidth`. Anything above zero is a page that
scrolls sideways on a phone. `e2e/free-analysis.spec.ts` asserts it for the report.

### One container — `CONTAINER_CLASS`

`mx-auto w-full max-w-[90rem] px-4` in `lib/constants.ts`, read by the navbar, `app/(app)/layout.tsx`,
`app/(report)/layout.tsx` and the site footer. **Every surface is the same measure**, so the wordmark
lines up with the content under it and `/r` is not a different width from `/analyses`. The report
sets no width of its own; it inherits the app container.

**One constant is the whole knob, and that has a consequence worth stating**: there is no way to
widen one surface. Changing this moves the navbar, the app pages, both reports and the footer
together, by construction. A change meant for the report alone that is made here has already been
made everywhere.

90rem is 1440px, up from 64rem. **Nothing below 1440px of viewport is affected** — `max-width` binds
only above its own value, so phones and 1366px laptops render exactly as before and no breakpoint is
involved.

**The reading measures are a separate number and stay one.** The blog article and the body paragraphs
cap near `max-w-2xl` *inside* this container, because a line of prose 1440px wide is unreadable
whatever the layout allows. Folding the two into one value is the mistake this note exists to
prevent.

### Navbar

- Logo, nav links, and an account menu (`components/account-menu.tsx`).
- **`NavLinks` takes `signedIn` and filters on it**, because the link set is no longer one audience:
  `/blog` is for the visitor who arrived from an ad and `/dashboard` only exists once there is a
  session. The navbar renders it in both branches rather than only for a signed-in user, which is what
  it used to do -- a blog nobody logged out can reach is a blog the ad traffic never sees.
- **Account menu**: a native `<details>` dropdown with the avatar/name as the summary; the panel shows
  name, email, the **credit balance**, and a `Sign out` button (a server action calling `signOut`).
- **`NavLinks` also carries two anchors**, `/#how` and `/#credits`, which are sections of the landing
  page rather than routes. They are flagged `anchor: true` so the active-state check skips them: that
  check compares against `pathname`, which never carries a hash, so it would answer false for a
  reason that has nothing to do with where the reader is.
- **Both menus are `components/ui/dropdown.tsx`, and the reason is dismissal.** A bare `<details>`
  closes on its own summary and on nothing else, so a click on the page behind it left the panel
  covering whatever the reader had just tried to tap. The element still gives the toggle, the
  keyboard and the closed-by-default markup; what it does not give is a way out, so `Dropdown` adds
  three — a click outside, Escape, and a route change. One component rather than one per menu because
  the nav has two of these, and a dismissal that worked in the hamburger and not in the account panel
  is exactly the bug it replaces. It listens on `pointerdown` rather than `click`, which fires before
  focus moves, so pressing the summary of an already-open menu does not close and reopen it.
- **It used to carry a plan badge and the operator's links.** Both went with what they pointed at. The
  rule the admin links followed is worth keeping for whenever one comes back: gate the menu entry on
  `isAdmin(user)` over the **stored** role, the same gate the pages use, so the menu can never offer a
  page that would `notFound()` — and treat it as a menu entry, never as the boundary.
- Consumes `getCurrentUser()` rather than calling `auth()` itself — see [security.md](security.md).
- `print:hidden`, so it never reaches paper.

**Below `md` the whole right-hand cluster collapses into `components/mobile-menu.tsx`** — links, the
language toggle and the account block, in one `<details>` behind a hamburger. The two clusters are the
same components rendered twice and swapped with `hidden md:flex` / `md:hidden`, not a second
implementation: the account block is `AccountPanel`, exported from `account-menu.tsx` and rendered both
inside the desktop dropdown and inside the mobile panel.

Both copies are in the DOM at every width, which is what an e2e has to account for: a locator for
anything in the menu must be scoped to `account-menu` or `mobile-menu`, or it matches twice. Role
queries are the exception — a closed `<details>` is out of the accessibility tree.

`MobileMenu` is the one client component in the header, for one reason: a native `<details>` keeps its
`open` state across a client-side navigation, so the panel would stay hanging over the page the link
just went to. It watches `usePathname()` and closes itself.

### Site footer — `components/site-footer.tsx`

Wordmark, copyright line and three links on the right: LinkedIn (`LINKEDIN_URL`), WhatsApp
(`WHATSAPP_URL`) and `CONTACT_PATH`. The first two are the founder's own channels, rendered as a
lucide icon alone with the label carried by `aria-label` and `title`, and both open in a new tab with
`rel="noreferrer noopener"`. Same container as everything else. Mounted in `app/(app)/layout.tsx`, so it reaches every
app page.

**In `app/(report)/layout.tsx` it is mounted only for a reader with a session**, alongside the
navbar. It began as a white-label constraint that mounted it nowhere there — a global footer would
have carried our name onto a document an agency handed to their client — and it stayed off on its own
merit while that route was the *second* analysis surface, read by someone with no account. It is the
only one now, so a signed-in reader gets the app chrome they would have had on the route that went
away, and a signed-out reader still gets none: the report has its own footer for them.

### Language toggle — `components/language-toggle.tsx`

An EN / PT pair of submit buttons in one `<form>` posting to the `setLocale` server action, wrapped in
`PendingFieldset` -- the action calls `revalidatePath('/', 'layout')`, so it is the most expensive
click in the chrome and the one that most needs to show it. `useFormStatus` reports the form rather
than which button was pressed, which is why the whole pair dims rather than one label swapping. No
client JS beyond that, no URL change. Mounted in `components/navbar.tsx` and, **separately, in the public report's own
header** — that surface has no navbar and is read signed-out by someone who may not read English.

## Disclosure card — `components/disclosure-card.tsx`

**Two kinds of caller, and the `score` rail is why.** The ranked fix and hypothesis cards pass
`ScoreIndicator` (1-10 impact); the readout's group cards pass their own 0-100 health rail. The shell
is deliberately shared: a number down the left edge is how this report says *here is a thing with a
score on it*, and having two answers to that on one page was the actual inconsistency. **The widget
is deliberately not shared** — see the note in [readout.md](readout.md#a-group-is-a-card-with-its-score-down-the-left-edge).

**The score is a rail down the left edge, and that replaced five things.** The header used to be a
mono rank, a coloured pill, a coral flag and the word IMPACT next to ten meter bars next to `9/10`,
all fighting over one wrapping line, with the title pushed underneath them. The meter alone was
`shrink-0` at roughly 290px, which is *why* the title needed its own row and why an open card needed
a whole second set of score elements (`openScores`) swapped in by CSS.

The rail is one fixed-width block, tinted by impact, identical open or closed. Scanning a list reads
9, 8, 7, 7, 5, 4 in a column — the ranking made visual. **It absorbed the rank**, which was a second
number saying nearly the same thing: the list is sorted by impact, so `01` beside `9/10` was one fact
twice. Gone with it: the `rank`, `scores` and `openScores` props, the `crowded` branch, the
title-reflow classes, and `impactScoreFillClass`.

The title now wraps in place in both states, which is also what the landing FAQ always wanted — the
`crowded` branch existed because a title alone reflowed badly, and there is no reflow left.

**The marker is a lucide `ChevronDown` that rotates**, not a literal `+` / `-` in a mono span. The
glyphs read fine but were the only control in the product not drawn from the icon set. It stays
`aria-hidden`: the accessible name is the `<h3>` inside the summary, and `<details>` exposes its own
open state.

**`<details>` does not animate on its own** — the browser flips the content's display and the card
jumps straight to its new height. `app/globals.css` gives it movement in two **independent** rules,
and the split is the point: `details[open] > *:not(summary)` runs a fade-and-rise on the content and
works in every browser, while the `::details-content` `block-size` transition (which needs
`interpolate-size: allow-keywords` to animate to `auto`) is progressive enhancement for the height
itself. Where the second is unsupported the panel snaps to full height and the content still fades, so
nothing is gated on support. Both are switched off under `prefers-reduced-motion`, like every other
animation here.

**Every** ranked row, in every tab: hypotheses and fixes alike. A native `<details>` wrapping a
`Card`, **not React state** — it costs no client JS for the open/close itself. The second layer
*inside* an open card is `CardDrawers` below, which does use state, and for a reason named there.

The summary is the click target for every ranked row in the product, so it carries the hover and the
inset focus ring itself; the `Card` around it lights its border on `focus-within` so keyboard and
mouse land on the same row.

Top rows arrive with `defaultOpen` rather than through a separate always-open card component. That is
the point of the shape: **what a row starts as is a default, never a state the reader is stuck in.**

The title renders as an `<h3>` inside the `<summary>`. Since every row is one of these, a `<span>`
there would leave the section's items with no headings at all — for a screen reader walking the page or
for anything selecting them by role.

## Hypothesis card — `components/hypothesis-card.tsx`

The `DisclosureCard` header of a hypothesis — rank, section badge, "Manual setup" pill, "Start here"
flag, compact chips and open gauges — wired once, with the body passed as `children`.

It exists because that wiring was **copied** into the report page and the two drifted the moment one
of them was touched. There is one body now too (`components/hypothesis-list.tsx`), which is the same
lesson applied one level down — see [report.md](report.md).

## Card drawers — `components/card-drawers.tsx`

**The second layer inside an open card.** A row of toggles over `CARD_DRAWER`, with one panel open at
a time and none open unless the caller names a `defaultDrawer`.

An open card had grown into a wall: the copy card stacked a `Recommendation` label, a `Current` label
over the struck line, a `Change to` label over the new one, a placeholder warning, the before/after
preview and a "Why this works" panel, and then hung an `Other options` button in the middle of it.
Four 0.6rem eyebrows stood between the reader and the one sentence they came for.

**And the four bodies had drifted into four treatments** — a purple-tinted bordered box for the why,
a borderless grey box for the steps, another grey box for the alternates, and no container at all for
the preview — so clicking across the row made the card restyle itself under the reader. One shell
lives in this component now (`rounded-md border bg-muted/40`), and callers pass content, never
chrome. The toggle row sits under a `border-t`: the drawers are a layer beneath the decision, not
more of it. Every button is `variant="outline"` in both states, so the row reads as a set of controls
rather than as three pieces of text one of which happens to be boxed; the open one changes weight and
ground, never whether it is a button.

**What an open card shows is the decision.** The rewritten line, or the sentence naming the problem.
Everything that argues for it — the rationale, the screenshot, the alternates, the steps — is a
labelled control the reader can press. One panel at a time, because they answer different questions
and reading two at once was never what anyone wanted; the height is the whole reason this exists.

- **A drawer with nullish `content` renders no button.** That is how the preview disappears for a
  manual hypothesis and the alternates disappear for a reader who does not own the analysis — the
  caller passes `null` rather than filtering the list, so the ids stay stable and the row order does
  not shift under the reader.
- **`onOpen` fires once, on first open.** It is what lets the alternates drawer buy its two variants
  when it is opened rather than on mount, so a card nobody expands costs no model call.
- It is `useState`, unlike `DisclosureCard`, which is deliberately CSS-only. A drawer has to be able
  to *close another one*, which a `<details>` cannot express without a `name` group and the caller
  managing it. The cards are already client components.
- **A drawer is not the footnote it replaced.** The rule in [analysis-ui.md](analysis-ui.md) — that a
  "Why" must never be small muted text tucked under the thing it explains — holds: the toggle sits
  *above* its panel, at the same size as every other control on the card, and the panel it opens is
  the full-size `WhyBlock`.

## Panel card — `components/panel-card.tsx`

A card whose heading is a labelled bar, and whose bar is the only thing that opens it. Two callers:
the four analysis sections that replaced the tabs, and the terms section that closes the document.

**One component because they had already started to differ.** They are the same object — a heading
somebody clicks, a summary of what is inside it on the same line, and a body. Written twice it drifts
the first time either is touched, which is the failure `RankedListHeader` exists to stop one level up.

**The bar is the whole `<summary>`, and that is a fix rather than a style.** The readout's group
cards, which used this before they moved to `DisclosureCard`, first put the label in the bar and the
score on a second row below it with both inside the summary: two visually distinct strips, one
behaviour, and a reader who clicked the score row and watched the card collapse had found a control
nobody told them about. Everything that toggles is on one line, and everything below it is content
that does not.

**The bar is the card's own surface, not an inverted one.** It was `bg-foreground` for a while and
the contrast did make a section read as a heading — but a page of black bars is a page where the
headings outweigh what they head, and it put the report's only inverted surface on its most ordinary
furniture. The `border-b`, the mono label and the hover carry the same job at the weight a heading
should have.

`trailing` is what the bar says about the body without opening it — a count of cards. It sits before
the chevron and must stay short enough not to wrap.

## Page terms — `components/page-terms.tsx`

The last section of the analysis: the terms counted on the page, and the ad groups written off them.
A composer, not a widget — a `PanelCard` holding a heading, `KeywordTable` and `AdIdeas` — and it
exists because those three were one thing conceptually and were previously two things in two places,
with the table buried at the bottom of `MeasuredReadout` leading nowhere. **It starts open**, unlike
the four sections above it: it is the last thing on the page, so nothing is buried by it. Returns
`null` with no terms. See [analysis-ui.md](analysis-ui.md) and [readout.md](readout.md).

## Ad ideas — `components/ad-ideas.tsx`

Four states like `MeasurePage`: idle with a button, loading, error, and the result. Owner only, and
it renders nothing at all for anyone else unless the ideas already exist, so a reader handed the link
never sees an affordance leading somewhere they cannot go.

Each group is a `Card` with the theme, its terms as `Badge` chips, and two `Lines` blocks. **`Lines`
prints a character count against Google's ceiling on every entry** — the one number this section may
carry, and it is arithmetic over text the component is already holding.

## Impact legend — `components/impact-legend.tsx`

What the number on the rail means, said once per list rather than once per card. It is mounted by
`RankedListHeader`, which both ranked lists render — see
[analysis-ui.md](analysis-ui.md#the-header-over-a-ranked-list--componentsranked-list-headertsx).

**It cannot go in the card.** `InfoHint` is a `<button>`, and a button inside a `<summary>` is an
interactive element nested in an interactive one — clicking it would toggle the card. And the answer
is the same for all six rows, so asking it six times is six controls carrying one sentence.

The sentence is bounded by [invariants.md](invariants.md): the score ranks the fixes against each
other, **it was written by a model rather than counted**, and it never says what the change will
produce. There used to be no explanation at all, which left a `9/10` beside a fix looking like
something measured.

**There is no `WhyBlock` any more.** The reasoning was a component because it had been neither
consistent nor readable — a fix's `evidence` was 12px muted text under the steps, the report folded
the same text into a 9.6px `<details>`, and a hypothesis's `rationale` was never rendered at all. Its
rule survives intact, one level up: `CardDrawers` gives every panel body-sized foreground text, and
the toggle above it is a full-size control. **Do not quiet it back down.**

## Badges

### Section badge — `components/section-badge.tsx`

A coloured pill per `SECTIONS` value, used inside hypothesis cards:

`headline` -> purple · `subheadline` -> purple (lighter) · `cta` -> coral · `social_proof` -> green ·
`pricing` -> amber · `features` -> blue · `hero_image` -> gray · `navigation` -> gray · `other` -> gray

### Flow category badge — `components/flow-category-badge.tsx`

Mirrors `section-badge.tsx` exactly, over `FLOW_CATEGORY_BADGE_CLASS` + `dictionary.labels.flowCategory`.

Flow: `signup_friction` -> coral · `cta_placement` -> purple · `decision_load` -> blue · `objections`
-> purple (lighter) · `trust` -> green · `pricing_clarity` -> amber · `page_structure` -> gray

Visibility: `indexability` -> coral · `metadata` -> purple · `structured_data` -> blue ·
`ai_answerability` -> green

**Hues repeat across the two families on purpose** — they never render in the same list, so a colour
only has to separate the categories it sits beside.

## Score indicator

`impact_score` (1-10). Higher = warmer: coral at 8-10, amber at 5-7, gray at 1-4, over
`impactScoreRailClass` and `impactScoreBadgeClass`.

- **Impact is the only scale it renders.** There used to be a `kind` prop carrying an effort scale
  beside it; effort is gone from the whole product — see
  [analysis-ui.md](analysis-ui.md#nothing-shows-an-effort-score-anywhere).
- **`variant="rail"` is the default and the ranked-row treatment**: a `w-14` tinted block down the
  left edge of a `DisclosureCard`, the number over `/10`. Identical open or closed.
- **The ten-segment meter is gone.** It printed the same fact three times — bars, `9/10`, and the
  colour — carried the word IMPACT beside it, and was `shrink-0` at roughly 290px, which crowded
  every header it sat in. `impactScoreFillClass` went with it.
- `variant="compact"` is the inline chip (`I9`), for anywhere a rail cannot go. **The `aria-label` is
  identical in both variants**, so nothing is lost to a screen reader.
- **What the number means is explained once per list, not per card** — see the impact legend above.
  The rail carries no label of its own; six labelled gauges was part of what made the header a
  soup.

## Info hint — `components/info-hint.tsx`

The `i` beside a section heading. Opens on hover, on click and on keyboard focus; closes on `Escape`, on
a click outside, or when the pointer leaves. Hover and click are held as **two pieces of state**, so
clicking an icon the pointer is already over pins the panel instead of toggling it shut.

**Dismissal is a document-level `pointerdown` listener, never a `fixed inset-0` catcher element.** That
is what it used to be, and it did not work: `.animate-fade-up` runs with `animation-fill-mode: both`, so
the analysis page's root keeps a `transform` forever after the animation ends, and a transform other
than `none` makes that element the containing block for its `position: fixed` descendants (and opens a
stacking context around them). The catcher covered the analysis container rather than the viewport. **A
listener has no geometry to get wrong.**

**The panel places itself, and a width cap alone was not enough.** It is anchored to a 16px icon, so
`max-w-[min(18rem,calc(100vw-2rem))]` stops it being *wide* but does nothing about *where* it starts:
rendered at `left-0` from a trigger near the right edge — the impact legend is right-aligned over both
ranked lists — it ran off the page and put a horizontal scrollbar on the whole document.

There was an `align="right"` escape hatch. **No call site ever passed it**, and it was the wrong shape
twice over: every caller would have to know where it renders, and a trigger in the *middle* of a
narrow screen overflows whichever side it opens to. It is gone.

A layout effect measures the panel and translates it back inside before paint, re-running on resize.
**It reads `document.documentElement.clientWidth`, never `window.innerWidth`** — `innerWidth` counts
the vertical scrollbar, so on a desktop with one the panel was allowed ~15px past where the document
ends, which is exactly enough to add the scrollbar this exists to prevent.

`e2e/info-hint.spec.ts` opens every hint on the analysis at three widths and asserts both that the
panel's box is inside the viewport and that the document never scrolls sideways. It is a sweep rather
than a test of the one hint that broke, because the failure is positional: the next one to break is
whichever hint moves closest to an edge.

## Rich text — `components/rich-text.tsx`

Renders `*asterisks*` emphasis from a dictionary string, so translators move the bold with the words
instead of reassembling JSX. See [i18n.md](i18n.md).

## The blog pieces

Two components, both server, both read by `/blog` and `/blog/[slug]` -- see
[seo.md](seo.md#indexability).

- **`components/blog-article.tsx`** renders one post: the date, the title, the lead, then the
  sections as a heading, its paragraphs and an optional bullet list. Every paragraph and bullet goes
  through `RichText`, so emphasis is `*asterisks*` in the dictionary like everywhere else. There is
  no `.prose` layer and no typography plugin: the article is built from the same tokens the rest of
  the app uses, and it sets `max-w-2xl` **inside** `CONTAINER_CLASS` rather than a width of its own,
  because a measure that is comfortable for a card grid is too wide for body text.
- **`components/blog-cta.tsx`** is the block every blog page ends on: the same dashed card as the
  landing's `finalCta`, with the button reading `blog.cta.button` and pointing at the dashboard or at
  sign-in depending on the session. It reads `getCurrentUser()` itself, so a page dropping it in
  needs to pass nothing.

## Dialog — `components/ui/dialog.tsx`

The one modal primitive. Backdrop plus a single panel, portalled to the body for the same reason the
pulse toast is: `position: fixed` only anchors to the viewport while no ancestor carries a transform,
and the landing wrapper's `animate-fade-up` leaves one behind forever.

It owns the four things a modal owes a keyboard, and none of them are optional: Escape closes, the
backdrop closes, focus moves in on open and returns to the opener on close, and Tab cycles inside the
panel instead of walking the page behind it (`FOCUSABLE_SELECTOR`). Body scroll is locked while it is
open. The accessible name is `aria-label` from `title`, and the close control is labelled
`common.close` — no new dictionary keys.

## Mercado Pago brick — `components/mercadopago-brick.tsx`

The Payment Brick for one pack, rendered inside `Dialog`: card, Pix and boleto over the page, no
redirect. The amount it renders
is display only — the route charges what `CREDIT_PACKS` says, because the browser is what submits the
form. Pix settles after the reader has left the form, so the copy says the credits land when the
payment is confirmed and never that the purchase is done. See [api.md](api.md#post-apibillingmercadopago).

**Whether the SDK is on the page is the question, never whether it just loaded.** `next/script` fires
`onLoad` once per src for the whole page — its `LoadCache` returns early for every later mount — and
the dialog unmounts the Brick when it closes, so a component gated on that callback renders nothing
from the second open onwards and leaves the reader on `credits.mercadopago.loading` until a full
reload. It checks `window.MercadoPago` on mount instead, and `<Script>` carries an `onError` so an SDK
that never arrives at all reads as `credits.mercadopago.failed` rather than as loading forever. Both
are covered by `e2e/checkout-brick.spec.ts`, which stubs the SDK at its own URL.

## Credit packs — `components/credit-packs.tsx`

The two cards under `#credits`, from `CREDIT_PACKS`, with `FEATURED_CREDIT_PACK` deciding which one
is marked. Prices and feature lines come from `dictionary.credits`; the amount shown, `amountBrl` and
the Stripe price id all hold one number and have to be changed together. `provider` comes from the
server and decides whether a button leaves for Stripe checkout or opens the Brick in place. See
[analysis-ui.md](analysis-ui.md#the-credit-packs).

## The live board — `components/analysis-pulse.tsx`

The landing page's only polling surface, and the parent of the two below. It holds the data and the
timer for all three so `/api/pulse` is asked once per interval rather than once per component, and it
renders from the server's own first answer so the board is in the HTML.

### Analysis sphere — `components/analysis-sphere.tsx`

Chips on a Fibonacci lattice, turned in `requestAnimationFrame`. Two things about it are load-bearing
and easy to undo by accident:

- **The chips are billboarded** — positioned, never rotated — so a label stays square to the reader
  while the sphere turns. Counter-rotating a child against a parent's live animation is not
  expressible in CSS, which is why the rotation is scripted at all.
- **Rank is decorrelated from latitude.** A lattice walks pole to pole in order, so handing the ranked
  entries to it in order sorts the colours down the screen and the thing reads as a list.

Styles are written straight onto the nodes, so a spinning sphere costs no React renders. It also
declines to animate a chip's arrival: `animate-pop-in` drives `transform`, a running animation outranks
an inline one, and the chip would leave the sphere for the length of it.

### Pulse toast — `components/analysis-pulse-toast.tsx`

One line at a time about a page being analyzed or one just measured. **Portalled to the body**, because
the landing wrapper's `animate-fade-up` leaves a transform behind and a transformed ancestor becomes
the containing block for `position: fixed`. Closing it silences the toast for the tab via
`sessionStorage`, not a cookie: the reader wanted it gone now, not recorded against them.
