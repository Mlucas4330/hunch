# Shared components

The pieces used across more than one surface. Screen-specific composition lives in
[analysis-ui.md](analysis-ui.md) and [report.md](report.md).

Never use hardcoded hex values or raw Tailwind color classes; every colour below is a token map in
`lib/constants.ts`.

## Interaction feedback

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

### Scroll reveal — `.reveal` + `components/scroll-reveal.tsx`

`.animate-fade-up` fires once on mount, so from the second screen down the page was static: the
animation had finished long before the reader scrolled to it. `.reveal` gives an element a 24px rise
and a fade as it scrolls into view. Put the class on a server rendered element; nothing else is
needed, and no wrapper component is involved.

**Three pieces, and the order between them is the safety argument.** An inline script in
`app/layout.tsx` sets `data-reveal` on `<html>` before first paint; `app/globals.css` hides `.reveal`
*only* under that attribute; `ScrollReveal`, mounted once in `app/(app)/layout.tsx`, runs one
`IntersectionObserver` over every `.reveal` on the page and stamps `data-revealed` as each arrives.
Content is therefore only ever hidden after something has confirmed it can be un-hidden:

- **The script never runs, or the bundle fails** -- the attribute is absent, nothing is hidden, the
  page reads normally. This is why the flag is not set from an effect, which would also paint the
  content, blank it, and fade it back in.
- **`prefers-reduced-motion: reduce`** -- the script skips the attribute and the CSS repeats the
  rule, so neither half can strand the page invisible alone.

The reveal is one way: elements are unobserved once revealed, because scrolling back up must not
re-hide text somebody is reading. Nodes added after mount are not picked up -- everything carrying
the class is in the server rendered HTML, and a `MutationObserver` on every page would be paid for a
case that does not exist. The shared attribute names and `REVEAL_ROOT_MARGIN` live in
`lib/constants.ts` because the script is stringified into the document and cannot import them.

Applied on `app/(app)/page.tsx`, the two blog routes and `components/blog-article.tsx`, whose article
*sections* carry it and whose paragraphs deliberately do not: revealing every line makes prose read
as a slideshow. The landing hero has no class -- it is on screen at load and keeps the wrapper's
mount animation.

This replaced a pure CSS `animation-timeline: view()` version, which needed no JavaScript but is
silently inert in Firefox. There is no bundle budget on the landing that would justify the gap: it
already mounts five client components and ships ~122kB of first load JS, and the rules about ad
traffic on it concern server cost -- zero tokens for an ownerless analysis, a failed query costing
the section rather than the page -- never bundle size.

## Loading shells — `components/route-skeleton.tsx`

Every page is a dynamic Server Component, so without a `loading.tsx` the browser holds the previous
screen untouched until the whole render lands. Worse, a `<Link>` prefetch of a dynamic segment only
stores payload down to the nearest `loading.tsx`, so with none present **the prefetch keeps nothing**
and every click is a full round trip with no feedback.

`RouteSkeleton` takes a `ROUTE_SKELETON` variant and paints the layout of the page that is coming --
a grid of rows or one analysis -- built from `components/ui/skeleton.tsx`. It reads its
`common.loading` label from `useI18n` rather than `getDictionary()`, so the shell stays out of
`cookies()`. Mounted by `app/(app)/dashboard/loading.tsx`, `app/(app)/analyses/[id]/loading.tsx` and
`app/(report)/r/[embedKey]/loading.tsx`.

There is deliberately no `loading.tsx` at the `app/(app)` group root: it would cover
`/auth/signin` too, and neither shell is that page's shape.

## Layout

### One container — `CONTAINER_CLASS`

`mx-auto w-full max-w-5xl px-4` in `lib/constants.ts`, read by the navbar, `app/(app)/layout.tsx`,
`app/(report)/layout.tsx` and the site footer. **Every surface is the same measure**, so the wordmark
lines up with the content under it and `/r` is not a different width from `/analyses`. The report
sets no width of its own; it inherits the app container.

### Navbar

- Logo, nav links, and an account menu (`components/account-menu.tsx`).
- **`NavLinks` takes `signedIn` and filters on it**, because the link set is no longer one audience:
  `/blog` is for the visitor who arrived from an ad and `/dashboard` only exists once there is a
  session. The navbar renders it in both branches rather than only for a signed-in user, which is what
  it used to do -- a blog nobody logged out can reach is a blog the ad traffic never sees.
- **Account menu**: a native `<details>` dropdown with the avatar/name as the summary; the panel shows
  name, email, and a `Sign out` button (a server action calling `signOut`).
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

**It is deliberately not mounted in `app/(report)/layout.tsx`.** That began as a white-label
constraint — a global footer would have been a fifth surface carrying our name onto a document an
agency handed to their client — and it survives on its own merit: the public report is shared outward
to someone with no account, and app chrome on it is noise. It has its own footer.

### Language toggle — `components/language-toggle.tsx`

An EN / PT pair of submit buttons in one `<form>` posting to the `setLocale` server action, wrapped in
`PendingFieldset` -- the action calls `revalidatePath('/', 'layout')`, so it is the most expensive
click in the chrome and the one that most needs to show it. `useFormStatus` reports the form rather
than which button was pressed, which is why the whole pair dims rather than one label swapping. No
client JS beyond that, no URL change. Mounted in `components/navbar.tsx` and, **separately, in the public report's own
header** — that surface has no navbar and is read signed-out by someone who may not read English.

## Disclosure card — `components/disclosure-card.tsx`

**Every** ranked row, on every surface: hypotheses and fixes alike. A native `<details>` wrapping a
`Card`, **not React state** — it costs no client JS and renders identically inside the server-rendered
public report and the client-rendered analysis list, so one component covers both. The `+` / `-`
affordance is `aria-hidden`; the summary's title is the accessible name.

The summary is the click target for every ranked row in the product, so it carries the hover and the
inset focus ring itself; the `Card` around it lights its border on `focus-within` so keyboard and
mouse land on the same row.

Top rows arrive with `defaultOpen` rather than through a separate always-open card component. That is
the point of the shape: **what a row starts as is a default, never a state the reader is stuck in.**

An open row **is** a full card and is dressed like one: the title stops truncating and `openScores`
(full `ScoreIndicator` gauges) replaces the compact chips. Both score sets are rendered and swapped
with `group-open:`, so the component stays CSS-only. They carry identical aria-labels and a
`display:none` element is not announced, so the swap is invisible to a screen reader.

**Open, the title takes a row of its own** (`group-open:order-last group-open:basis-full`), below the
rank, badges and gauges. Sharing one wrapping line with them does not work: the gauges are `shrink-0`
and eat roughly 290px, so the title is squeezed to whatever is left and an untruncated sentence
renders as a tall narrow column. `order` is visual only — the `<h3>` stays in DOM order, which is what
a screen reader reads and what names the `summary`. Closed, the title is back on the line and
truncates, so the collapsed list stays one row per item. The report reaches the same shape
without `<details>`.

The title renders as an `<h3>` inside the `<summary>`. Since every row is one of these, a `<span>`
there would leave the section's items with no headings at all — for a screen reader walking the page or
for anything selecting them by role.

## Hypothesis card — `components/hypothesis-card.tsx`

The `DisclosureCard` header of a hypothesis — rank, section badge, "Start here" flag, compact
chips and open gauges — wired once. The owner's list and the public report both render it and pass
their own body as `children`, which is the only part that legitimately differs between them.

It exists because that wiring was **copied** into the report page, and the two drifted the moment one
of them was touched. The bodies stay separate; the header must not.

`showManualBadge` is the owner's list only: the report already explains manual setup in the body.

## Why block — `components/why-block.tsx`

The reasoning behind a ranked item, on all three surfaces. It is a component because it was previously
neither consistent nor readable: a fix's `evidence` was 12px muted text under the steps panel, the
public report folded the same text into a 9.6px `<details>`, and a hypothesis's `rationale` — which the
model is *required* to write — was **never rendered on the analysis screen at all**.

Body-sized foreground text in a tinted panel. **Do not quiet it back down.**

## Badges

### Section badge — `components/section-badge.tsx`

A coloured pill per `SECTIONS` value, used inside hypothesis cards:

`headline` -> purple · `subheadline` -> purple (lighter) · `cta` -> coral · `social_proof` -> teal ·
`pricing` -> amber · `features` -> blue · `hero_image` -> gray · `navigation` -> gray · `other` -> gray

### Flow category badge — `components/flow-category-badge.tsx`

Mirrors `section-badge.tsx` exactly, over `FLOW_CATEGORY_BADGE_CLASS` + `dictionary.labels.flowCategory`.

Flow: `signup_friction` -> coral · `cta_placement` -> purple · `decision_load` -> blue · `objections`
-> teal · `trust` -> green · `pricing_clarity` -> amber · `page_structure` -> gray

Visibility: `indexability` -> coral · `metadata` -> purple · `structured_data` -> blue ·
`ai_answerability` -> teal

**Hues repeat across the two families on purpose** — they never render in the same list, so a colour
only has to separate the categories it sits beside.

## Score indicator

A bar or numbered badge for `impact_score` (1-10). Higher = warmer: coral at 8-10, amber at 5-7, gray
at 1-4.

- **Impact is the only scale it renders.** There used to be a `kind` prop carrying an effort scale
  beside it; effort is gone from the whole product — see
  [analysis-ui.md](analysis-ui.md#nothing-shows-an-effort-score-anywhere).
- `variant="compact"` swaps the ten-segment gauge for one tinted chip (`I9`), over
  `impactScoreBadgeClass`. It is what collapsed rows use: a screen holding ten or more rows cannot
  afford ten gauges. **The `aria-label` is identical in both variants**, so nothing is lost to a
  screen reader.

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

The panel is width-capped against the viewport (`max-w-[min(18rem,calc(100vw-2rem))]`): it is anchored
to a 16px icon, so a fixed width runs off-screen wherever that icon sits near an edge.

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

## Credit packs — `components/credit-packs.tsx`

The three cards under `#credits`, from `CREDIT_PACKS`, with `FEATURED_CREDIT_PACK` deciding which one
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
