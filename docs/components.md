# Shared components

The pieces used across more than one surface. Screen-specific composition lives in
[analysis-ui.md](analysis-ui.md) and [report.md](report.md).

Never use hardcoded hex values or raw Tailwind color classes; every colour below is a token map in
`lib/constants.ts`.

## Layout

### One container — `CONTAINER_CLASS`

`mx-auto w-full max-w-5xl px-4` in `lib/constants.ts`, read by the navbar, `app/(app)/layout.tsx`,
`app/(report)/layout.tsx` and the site footer. **Every surface is the same measure**, so the wordmark
lines up with the content under it and `/r` is not a different width from `/analyses`. The print report
sets no width of its own; it inherits the app container.

### Navbar

- Logo, nav links, and an account menu (`components/account-menu.tsx`).
- **Account menu**: a native `<details>` dropdown with the avatar/name as the summary; the panel shows
  name, email, the plan badge, and a `Sign out` button (a server action calling `signOut`).
- **The operator's links live in that panel**, between the plan badge and sign out, behind
  `isAdmin(user)` on the **stored** role — the same gate the pages use, so the menu can never offer a
  page that would `notFound()`. They come from `ADMIN_NAV_LINKS`, whose `key` names the dictionary
  section that titles the page, so a renamed screen renames its link. It is a menu entry, not a
  boundary: `/admin` is still gated in its own layout and in every page under it.
- Plan badge maps `SUBSCRIPTION_PLAN` to a coloured pill: free = gray, pro = purple.
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
app page including the print report, where `print:hidden` keeps it off paper.

**It is deliberately not mounted in `app/(report)/layout.tsx`.** Our name in a global footer would be a
fifth white-label surface on a document an agency hands to their client — see
[invariants.md](invariants.md#white-label-hangs-off-one-boolean-on-four-independent-surfaces). The
public report has its own footer, already gated on the plan.

### Language toggle — `components/language-toggle.tsx`

An EN / PT pair of submit buttons in one `<form>` posting to the `setLocale` server action. No client
JS, no URL change. Mounted in `components/navbar.tsx` and, **separately, in the public report's own
header** — that surface has no navbar and is read signed-out by someone who may not read English.

## Disclosure card — `components/disclosure-card.tsx`

**Every** ranked row, on every surface: hypotheses and fixes alike. A native `<details>` wrapping a
`Card`, **not React state** — it costs no client JS and renders identically inside the server-rendered
public report and the client-rendered analysis list, so one component covers both. The `+` / `-`
affordance is `aria-hidden`; the summary's title is the accessible name.

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
truncates, so the collapsed list stays one row per item. The print report reaches the same shape
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

A bar or numbered badge for `impact_score` and `effort_score` (1-10).

- Impact: higher = warmer (coral at 8-10, amber at 5-7, gray at 1-4).
- Effort: lower = better (green at 1-3, amber at 4-6, red at 7-10).
- `variant="compact"` swaps the ten-segment gauge for one tinted chip (`I9`, `E3`), over
  `impactScoreBadgeClass` / `effortScoreBadgeClass`. It is what collapsed rows use: a screen holding ten
  or more rows cannot afford ten gauges. **The `aria-label` is identical in both variants**, so nothing
  is lost to a screen reader.

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

## Upgrade prompt — `components/upgrade-prompt.tsx`

The post-value ask, and the counterpart to the public report: the report captures a *prospect's* email,
this starts a conversation with your own free users. Rendered at the end of `/analyses/[id]` when
`user.plan === 'free'`, so it is never what stands between someone and the analysis they asked for.

- **It sells white-label, not volume.** The report going out without our mark and without a signup wall
  is the thing a paid plan is bought for.
- **Deliberately says nothing about the remaining allowance.** `UsageBanner` already counts that on the
  dashboard — two components repeating one number is how a paywall starts to feel like nagging.
- Dismissal is written to `localStorage` under `UPGRADE_PROMPT_DISMISSED_KEY`, so it is **per browser,
  not per user**. Making it per user needs a `users` column and a write endpoint, which is more than a
  dismissible prompt is worth.
- `dismissed` is held as `boolean | null` and nothing renders while it is `null`: reading `localStorage`
  happens in an effect, so rendering before it resolves flashes a card the reader already dismissed.

Like every paid-plan prompt it points at `CONTACT_PATH` — see
[invariants.md](invariants.md#there-is-no-self-serve-checkout-and-no-published-price).

## Rich text — `components/rich-text.tsx`

Renders `*asterisks*` emphasis from a dictionary string, so translators move the bold with the words
instead of reassembling JSX. See [i18n.md](i18n.md).
