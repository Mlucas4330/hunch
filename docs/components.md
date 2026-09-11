# Shared components

The pieces used across more than one surface. Screen-specific composition lives in
[analysis-ui.md](analysis-ui.md) and [report.md](report.md).

Never use hardcoded hex values or raw Tailwind color classes; every colour below is a token map in
`lib/constants.ts`.

## Interaction feedback

**There is no teal**, in `app/globals.css` or in any map: the owner ruled it out of the palette. The
channels are purple, purple-soft, coral, amber, blue, green, red and neutral, and **a colour that is
not one of those does not get added at a call site**; it gets added to `globals.css` first or not at
all.

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
the transitions and the keyframe animations.

**A click that starts a round trip says so.** Anything driving a `fetch` already owns its own pending
state; server action forms had none, which is the click that reads as ignored. `SubmitButton` and
`PendingFieldset` in `components/submit-button.tsx` wrap `useFormStatus` and are used by the sign in
page, the sign out form and the quota form. The spinner is added beside the
label rather than replacing it, so no button needs a second dictionary string.

**There is no scroll reveal, and adding one is the mistake to avoid.** The shape is an
`IntersectionObserver` over a `.reveal` class with the hidden state gated on a `data-reveal`
attribute an inline script sets on `<html>` before first paint, so content is only ever hidden once
something has confirmed it can be un-hidden.

That gate is the whole design and it still breaks, always in the same shape: **the half that hides
and the half that reveals have different lifetimes.** A client side navigation, a locale switch that
replaced list items keyed on translated strings, and a bundle that failed to arrive each left content
at `opacity: 0` for good. Each fix was correct and each one uncovered the next. What finally settled
it was that the effect was not worth the machinery.

`motion` was weighed as the alternative and lost on one property. It renders `initial` into the
server's HTML, so `opacity: 0` ships in the markup and a reader whose bundle never lands sees nothing.
**Visible without JavaScript and faded in with it needs a gate only JavaScript opens.** The pure CSS
`animation-timeline: view()` version was checked again in August 2026 and is still not Baseline, so it
is still silently inert in Firefox.

The wrapper level `.animate-fade-up` on each page is untouched by any of that. It fires once on mount
and never hid anything.

### The animation library was installed, measured, and removed

`motion` was added to build the report rail's active marker as a `layoutId` shared element and the
copy button's icon swap as an `AnimatePresence` exchange. Both were argued as cases CSS cannot
express. **Both turned out not to be, and the measurement is what settled it.**

- **The rail marker.** Rail rows are a fixed `--rail-row` height by construction, so the marker's
  position is `index * row` and a `transform` transition covers it exactly.
- **The icon swap.** Both icons stay mounted, stacked in one grid cell, cross-fading. Nothing ever
  unmounts.
- **Layout animations need `domMax`, not `domAnimation`.** That detail turned an argued ~18kB into a
  measured **42kB gzipped**, and took `/r/[embedKey]`'s first load from 139kB to 179kB.

Forty kilobytes for two effects that CSS does, on a product that tells people their page is heavy.
`.animate-stagger-in`, `.animate-score-settle` and `.animate-navbar-lift` in `app/globals.css` do the
same work with no dependency.

**The rule this leaves.** Entrance and reveal are CSS, permanently, for the SSR reason above. A
library may still be the answer for something genuinely beyond CSS, but the bar is a measurement
against a working CSS attempt, not an argument made before either was written.

### Scrollspy: `components/report-rail.tsx`

The report rail binds an `IntersectionObserver`, and **it is not the scroll reveal above coming back**.
This one hides nothing: every target is mounted and painted whether the observer runs or not, and all
it reads is which section is in view. The failure mode is "no row is highlighted", and the rail is a
list of working anchors either way. Do not remove it by analogy.

`lib/anchor.ts` is the other half. Almost everything worth linking to in the report sits inside a
`<details>`, and a closed `<details>` gives its content no box, so a plain `href="#id"` scrolls to a
zero-height element and the reader arrives nowhere. `revealAnchor` opens every ancestor first, then
scrolls. `components/section-link.tsx` is the `<a>` that calls it, and it stays a real anchor so it
works without JavaScript.

## The report rail is a fixed row height, so its labels have to fit one

`--rail-row` in `app/globals.css` is what makes the active marker's position `index * row` instead of
a measurement. Because the row is a fixed **height** rather than a minimum, a label too long for it
does not push the next entry down: it overflows and sits on top of it.

The row is tall enough for two lines and the label is clamped to two, on a `<span>` inside the anchor
rather than on the anchor itself: `line-clamp` sets `display: -webkit-box`, which would replace the
`flex` doing the vertical centring.

## Everything tappable clears 44px on a phone

`captureMobile` counts any control whose box is under `MOBILE_TAP_TARGET_MIN_PX` on either axis, and
any element rendering text under `MOBILE_MIN_FONT_PX`. Fixed at the source, `max-sm:` only, so nothing
about the desktop scale moves:

- **`Button` and `Input`.** `h-10` is 40px and `size="sm"` is 36px; both are under the line. Every
  size now clears 44 on a phone.
- **The type scale.** `--text-micro` is 11px and `--text-nano` is 10px, both under the 12px floor.
  `app/globals.css` collapses the two steps to `0.75rem` under `sm`. It is written against the
  **utilities**, not the custom properties: `@theme inline` inlines the value into the generated
  class, so redefining `--text-micro` in a media query changes nothing.
- **Icon-only controls grow their box, never their glyph.** The theme toggle's icons stay `size-3.5`;
  the buttons around them go to `size-11`. The same buttons are squared off at `size-6` above `sm`.
- **Standalone links get `min-h`, not padding.** Nav items and footer links centre their text in a
  44px box, so the row grows without the baseline drifting.

`captureMobile` excludes `display: inline`, because a link inside a sentence is prose and not a tap
target. None of the above touches those.

## Elevation and theme

**Three levels, two shadows each.** `--elev-1` (resting card), `--elev-2` (hover), `--elev-3`
(anything floating: dropdown, tooltip) are exposed through `@theme inline` as `shadow-elev-1..3`. Each
is a short tight contact shadow plus a long diffuse ambient one. The third layer is `--sheen`, a
hairline of light on the top edge.

**Shadows derive from `--shade`, never from `--ink`.** `--ink` is the foreground and inverts with the
theme, so a shadow mixed from it would light every panel with a white halo in dark mode.

**Dark mode is a block of variables and nothing else.** No component holds a colour: every map in
`lib/constants.ts` is token utilities like `bg-coral/15 text-coral`. Three relationships invert rather
than darken: `--panel` must be *lighter* than `--paper` or the elevation reads as a hole; `--grid`
flips direction and shrinks in amplitude; and the signal channels need *more* lightness, not less.

The theme is a cookie read on the server in `lib/theme.ts` and stamped on `<html>` in
`app/layout.tsx`, mirroring `getLocale()` exactly. That is why there is no flash and no inline script.
`prefers-color-scheme` is deliberately not consulted: the server cannot read it.

**A reader with no cookie gets dark** (`DEFAULT_THEME`). The one thing that does not follow it is
`OG_COLORS`, which mirrors the light tokens because an unfurl is rendered once for every reader.

**Printing works because the dark block sits inside `@media screen`.** The print block forces
`print-color-adjust: exact` so the signal channels survive onto paper. Scoped to the screen, paper
never sees the overrides and falls through to the light `:root`.

## Accident screens: `components/error-screen.tsx`

One shell, three mounts:

- **`app/not-found.tsx`** is a Server Component, so it awaits the dictionary directly. It builds its
  own navbar, footer and `I18nProvider`, because a root `not-found.tsx` renders inside
  `app/layout.tsx` alone.
- **`app/(app)/error.tsx` and `app/(report)/error.tsx`** are per-group rather than one at the root: a
  boundary inside a group renders as that group's layout's child, so the navbar, the footer and the
  provider are still there. Both log the error, which the boundary otherwise swallows.

`errors.notFound.body` deliberately does not guess *why*. A link goes stale, gets truncated, or was
never valid, and nothing here can tell which.

## Loading shells: `components/route-skeleton.tsx`

Every page is a dynamic Server Component, so without a `loading.tsx` the browser holds the previous
screen untouched until the whole render lands, and a `<Link>` prefetch of a dynamic segment keeps
nothing.

`RouteSkeleton` takes a `ROUTE_SKELETON` variant and paints the layout of the page that is coming,
built from `components/ui/skeleton.tsx`. It reads its `common.loading` label from `useI18n` rather
than `getDictionary()`, so the shell stays out of `cookies()`. Mounted by
`app/(app)/dashboard/loading.tsx` and `app/(report)/r/[embedKey]/loading.tsx`. There is no third under
`/analyses/[id]`: that route renders nothing.

There is deliberately no `loading.tsx` at the `app/(app)` group root: it would cover `/auth/signin`
too, and neither shell is that page's shape.

## Layout

**A flex or grid item defaults to `min-width: auto` and will not shrink below its content.**
**`truncate` only works if an ancestor actually constrains the width.** Pair it with `min-w-0` on
every flex or grid ancestor, and `w-full` under `items-start`.

The way to check is to measure, not to look: set a 360px viewport and compare
`document.documentElement.scrollWidth` against `clientWidth`. Anything above zero is a page that
scrolls sideways on a phone.

### One container: `CONTAINER_CLASS`

`mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8 xl:px-12` in `lib/constants.ts`, read by the
navbar, `app/(app)/layout.tsx`, `app/(report)/layout.tsx` and the site footer. **Every surface is the
same measure**, so the wordmark lines up with the content under it. There is no way to widen one
surface: changing this moves all of them together.

**The gutter steps**, 16px, then 24px at `sm`, 32px at `lg`, 48px at `xl`, because a gutter is a
proportion of the space available rather than a constant.

**The reading measures are a separate number and stay one.** The blog article and the body paragraphs
cap near `max-w-2xl` *inside* this container, because a line of prose 1440px wide is unreadable.

### Navbar

- Logo, nav links, and an account menu (`components/account-menu.tsx`).
- **`NavLinks` takes `signedIn` and filters on it.** `/blog` is public and `/dashboard` only exists
  once there is a session.
- **Account menu**: a native `<details>` dropdown with the avatar/name as the summary; the panel shows
  name, email, **this month's quota usage** read from the rows, and a `Sign out` button (a server
  action calling `signOut`).
- **Both menus are `components/ui/dropdown.tsx`, and the reason is dismissal.** A bare `<details>`
  closes on its own summary and on nothing else. `Dropdown` adds three ways out: a click outside,
  Escape, and a route change. It listens on `pointerdown` rather than `click`, which fires before focus
  moves, so pressing the summary of an already-open menu does not close and reopen it.
- **The operator link is gated on `isAdmin(user)` over the stored role**, the same gate the page uses.
  Treat it as a menu entry and never as the boundary.
- Consumes `getCurrentUser()` rather than calling `auth()` itself. See [security.md](security.md).
- `print:hidden`, so it never reaches paper.

**Below `md` the whole right-hand cluster collapses into `components/mobile-menu.tsx`.** The two
clusters are the same components rendered twice and swapped with `hidden md:flex` / `md:hidden`: the
account block is `AccountPanel`, exported from `account-menu.tsx` and rendered in both.

Both copies are in the DOM at every width, so a locator for anything in the menu must be scoped to
`account-menu` or `mobile-menu`, or it matches twice. Role queries are the exception: a closed
`<details>` is out of the accessibility tree.

`MobileMenu` is a client component because a native `<details>` keeps its `open` state across a
client-side navigation. It watches `usePathname()` and closes itself.

### Site footer: `components/site-footer.tsx`

Wordmark, copyright line and three links: the privacy policy (`PRIVACY_PATH`), email
(`CONTACT_EMAIL_URL`) and WhatsApp (`WHATSAPP_URL`). The two channels are lucide icons alone, with the
label carried by `aria-label` and `title`. WhatsApp opens in a new tab with `rel="noreferrer noopener"`;
the `mailto:` does not.

**The address is `CONTACT_EMAIL`, the same constant the privacy policy interpolates.**

**In `app/(report)/layout.tsx` it is mounted only for a reader with a session**, alongside the navbar.
A signed-out reader gets the report's own header and footer.

### Language toggle: `components/language-toggle.tsx`

**Not mounted anywhere for now.** Its place is the navbar cluster, the mobile menu and the public
report's own header, which a signed-out reader sees without a navbar.

A pair of submit buttons in one `<form>` posting to the `setLocale` server action, wrapped in
`PendingFieldset`: the action calls `revalidatePath('/', 'layout')`, so it is the most expensive click
in the chrome.

**Each segment is a flag from `country-flag-icons`, not the flag emoji.** Windows ships no flag faces
in Segoe UI Emoji, so Chrome and Edge render the regional indicator pair as boxed letters. `LOCALE_FLAG`
lives in the component because it holds components, and pure modules import `lib/constants.ts`.

A flag is a country and the switch chooses a language, so **the accessible name is the language**.
`LOCALE_LABEL` carries the endonyms, `English` and `Português`, as `sr-only` plus the `title`. The
inactive segment is desaturated.

**Both switches state their segment's box rather than padding it**, `size-6` above `sm` and `size-11`
below, in `language-toggle.tsx` and `theme-toggle.tsx` alike. Resize the pair in both files.

## Disclosure card: `components/disclosure-card.tsx`

**Two kinds of caller, and the `score` rail is why.** The error cards pass `ScoreIndicator` (1-10
impact); the category and crawler cards in `components/section-evidence.tsx` pass their own 0-100 rail. The shell is shared: a number down the
left edge is how this report says *here is a thing with a score on it*. **The widget is not shared.**
See [readout.md](readout.md#layout).

### `summaryClassName` shapes the trigger, not the card

Opt in and unset by default. The account menu and the mobile menu pass the padding, border and hover
state through it, because on those two the trigger *is* the button.

**Nothing passes a height through it.** A constraint here applies to the closed card and the open one
alike, and titles run to as many lines as the locale needs.

**The score is a rail down the left edge, and it is the only score treatment in the header.** Scanning
a list reads 9, 8, 7, 7, 5, 4 in a column: the ranking made visual. **The rail also absorbs the rank**,
because the list is sorted by impact. There is no `rank`, `scores` or `openScores` prop.

**The marker is a lucide `ChevronDown` that rotates.** It stays `aria-hidden`: the accessible name is
the `<h3>` inside the summary, and `<details>` exposes its own open state.

**`<details>` does not animate on its own.** `app/globals.css` gives it movement in two
**independent** rules: `details[open] > *:not(summary)` runs a fade-and-rise on the content in every
browser, while the `::details-content` `block-size` transition (which needs
`interpolate-size: allow-keywords`) is progressive enhancement for the height. Both are switched off
under `prefers-reduced-motion`.

A native `<details>` wrapping a `Card`, **not React state**, so it costs no client JS for the
open/close itself. The summary carries the hover and the inset focus ring; the `Card` around it lights
its border on `focus-within`.

Top rows arrive with `defaultOpen`: **what a row starts as is a default, never a state the reader is
stuck in.** The title renders as an `<h3>` inside the `<summary>`, so a section's items have headings
for a screen reader or for anything selecting them by role.

## Hypothesis card: `components/hypothesis-card.tsx`

The `DisclosureCard` header of a copy error: the problem as its title, the impact rail, the section
badge and the "Start here" flag on the top row, with the body passed as `children`. The body is
`components/hypothesis-list.tsx`. See [analysis-ui.md](analysis-ui.md).

## Run again: `components/run-again.tsx`

The owner's "Run again", in two shapes: the bare button in the report header, and the dashed
`trend_start` panel for an owner who has never run the page twice. Both post to
`POST /api/analyses/[id]/runs` and `router.refresh()` on success.

**It stays visible when the quota is spent**, disabled, with `readout.run.quotaExhausted` beside it,
so the owner learns why rather than finding a control gone. The route refuses anyway.

`RunInProgress` takes its place in the header while the state is `rerunning`, polling through
`components/use-analysis-poll.ts`, the same hook `GeneratingNotice` uses. See
[report.md](report.md).

## Brand: `components/brand-settings-form.tsx` and `components/report-brand-mark.tsx`

**The form** lives at `/settings` ("Your brand" in the nav) and posts the agency name and logo to
`POST /api/brand` as multipart. It keeps the logo preview beside a "Remove the logo" checkbox, maps each
error code to its own sentence, and calls `router.refresh()` on success.

**The mark** is the report header's brand: the logo through `next/image` with `unoptimized` (the file is
already small and served immutable), else the name, else `Wordmark`. See
[invariants.md](invariants.md#the-agencys-brand-comes-from-one-resolver-on-three-surfaces).

## Card drawers: `components/card-drawers.tsx`

**The second layer inside an open card.** A row of toggles over `CARD_DRAWER`, one panel open at a
time, none open unless the caller names a `defaultDrawer`. Today there is one drawer, **why**: the
reasoning behind an error.

**An open card shows the error; the argument sits one click below it.** One shell lives here
(`rounded-md border bg-muted/40`) and callers pass content, never chrome. The toggle row sits under a
`border-t`, and every button is `variant="outline"` in both states.

**The copy card's "why" opens on `assessment`, labelled, above `rationale`**, because what the line
already does and what the error costs are two different claims. `assessment` is nullable, and a row
without it renders the drawer with `rationale` alone.

- **A drawer with nullish `content` renders no button**, so a fix with no `evidence` has no drawer.
- **`onOpen` fires once, on first open.**
- It is `useState`, unlike `DisclosureCard`, because a drawer has to be able to close another one.
- **The toggle sits above its panel, at the same size as every other control on the card**, and the
  panel carries body-sized foreground text. Do not quiet it back down into muted small print.

## Panel card: `components/panel-card.tsx`

A card whose heading is a labelled bar, and whose bar is the only thing that opens it. Its caller is
the four report sections in `components/analysis-sections.tsx`.

**The bar is the whole `<summary>`.** Everything that toggles is on one line, and everything below it
is content that does not.

**The bar is the card's own surface, not an inverted one.** The `border-b`, the mono label and the
hover carry the heading's job at the weight a heading should have.

`trailing` is what the bar says about the body without opening it, a count of cards. It sits before
the chevron and must stay short enough not to wrap.

## Impact legend: `components/impact-legend.tsx`

What the number on the rail means, said once per list rather than once per card. It is mounted by
`RankedListHeader`, see [analysis-ui.md](analysis-ui.md#the-header-over-a-list-componentsranked-list-headertsx).

**It cannot go in the card.** `InfoHint` is a `<button>`, and a button inside a `<summary>` would
toggle the card. The answer is the same for every row anyway.

The sentence says the score ranks the errors against each other and was written by a model rather
than counted, so a `9/10` beside an error does not read as something measured.

## Badges

### Section badge: `components/section-badge.tsx`

A coloured pill per `SECTIONS` value, used inside hypothesis cards:

`headline` -> purple · `subheadline` -> purple (lighter) · `cta` -> coral · `social_proof` -> green ·
`pricing` -> amber · `features` -> blue · `hero_image` -> gray · `navigation` -> gray · `other` -> gray

### Flow category badge: `components/flow-category-badge.tsx`

Mirrors `section-badge.tsx` exactly, over `FLOW_CATEGORY_BADGE_CLASS` + `dictionary.labels.flowCategory`.

Structure: `signup_friction` -> coral · `cta_placement` -> purple · `decision_load` -> blue ·
`objections` -> purple (lighter) · `trust` -> green · `pricing_clarity` -> amber · `page_structure` ->
gray · `mobile` -> blue · `performance` -> amber · `distinctiveness` -> purple (lighter)

Visibility: `indexability` -> coral · `metadata` -> purple · `structured_data` -> blue ·
`ai_answerability` -> green

**Hues repeat across the two families on purpose.** They never render in the same list.

## Score indicator

`impact_score` (1-10). Higher = warmer: coral at 8-10, amber at 5-7, gray at 1-4, over
`impactScoreRailClass` and `impactScoreBadgeClass`.

- **Impact is the only scale it renders.** There is no effort scale beside it, anywhere in the
  product. See [analysis-ui.md](analysis-ui.md#nothing-shows-an-effort-score-anywhere).
- **`variant="rail"` is the default and the ranked-row treatment**: a `w-14` tinted block down the
  left edge of a `DisclosureCard`, the number over `/10`.
- `variant="compact"` is the inline chip (`I9`), for anywhere a rail cannot go. **The `aria-label` is
  identical in both variants.**
- **What the number means is explained once per list**, by the impact legend above.

## Info hint: `components/info-hint.tsx`

The `i` beside a section heading. Opens on hover, on click and on keyboard focus; closes on `Escape`,
on a click outside, or when the pointer leaves. Hover and click are held as **two pieces of state**, so
clicking an icon the pointer is already over pins the panel instead of toggling it shut.

**Dismissal is a document-level `pointerdown` listener, never a `fixed inset-0` catcher element.**
`.animate-fade-up` runs with `animation-fill-mode: both`, so the page's root keeps a `transform`
forever, and a transformed element becomes the containing block for its `position: fixed`
descendants. **A listener has no geometry to get wrong.**

**The panel places itself.** A layout effect measures the panel and translates it back inside the
viewport before paint, re-running on resize. **It reads `document.documentElement.clientWidth`, never
`window.innerWidth`**, which counts the vertical scrollbar. There is no `align` prop: every caller
would have to know where it renders.

`e2e/info-hint.spec.ts` opens every hint on the analysis at three widths and asserts that the panel is
inside the viewport and the document never scrolls sideways.

## Rich text: `components/rich-text.tsx`

Renders `*asterisks*` emphasis from a dictionary string, so translators move the bold with the words
instead of reassembling JSX. See [i18n.md](i18n.md).

## The blog pieces

Two components, both server, both read by `/blog` and `/blog/[slug]`. See
[seo.md](seo.md#indexability).

- **`components/blog-article.tsx`** renders one post: the date, the title, the lead, then the
  sections as a heading, its paragraphs and an optional bullet list, all through `RichText`. There is
  no `.prose` layer: it sets `max-w-2xl` **inside** `CONTAINER_CLASS`.
- **`components/blog-cta.tsx`** is the block every blog page ends on: a dashed card with the button
  reading `blog.cta.button` and pointing at the dashboard or at sign-in depending on the session. It
  reads `getCurrentUser()` itself, so a page dropping it in needs to pass nothing.
