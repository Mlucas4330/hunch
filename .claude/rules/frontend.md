## Pages

| Route            | Page                | Description                                          |
| ---------------- | ------------------- | ---------------------------------------------------- |
| `/`              | Landing page        | Marketing: two tracks (report / optional live test), pricing tiers, CTA |
| `/auth/signin`   | Auth page           | Google OAuth sign in via NextAuth                    |
| `/dashboard`     | Dashboard / history | List of past analyses, "New analysis" button         |
| `/analyses/[id]` | What to test        | Install snippet, flow playbook, ranked hypotheses with a recommended challenger |
| `/analyses/[id]/tests/[hypothesisId]` | Run a test | Approve/swap/edit the challenger, set the conversion goal, launch, monitor results |
| `/billing`       | Billing / upgrade   | Stripe checkout trigger, plan display, usage counter |
| `/r/[embedKey]`  | Public report       | Outreach surface: ranked teardown, variant previews, waitlist wall. No session |
| `/admin/leads`   | Waitlist leads      | Operator-only (`ADMIN_EMAIL`); the only place waitlist rows can be read |

## Shared layout components

### Navbar

- Logo, nav links, and an account menu (`components/account-menu.tsx`)
- Account menu: native `<details>` dropdown with the avatar/name as the summary; the panel shows
  name, email, the plan badge, and a `Sign out` button (server action calling `signOut`)
- Plan badge maps `SUBSCRIPTION_PLAN` enum to a colored pill: free = gray, solo = purple
- Language toggle (`components/language-toggle.tsx`) posting to the `setLocale` server action

### Language toggle

- `components/language-toggle.tsx`: an EN / PT pair of submit buttons in one `<form>` posting to the
  `setLocale` server action (`lib/actions/locale.ts`), which writes the `locale` cookie and
  `revalidatePath('/', 'layout')`. No client JS, no URL change.
- Rendered in `components/footer.tsx`, which both `(app)` and `(report)` layouts mount, so the toggle
  is reachable signed-out, signed-in, and on the public report.

### i18n

- Locales are the `LOCALE` enum (`en`, `pt-BR`); `DEFAULT_LOCALE` and `LOCALE_COOKIE` live in
  `lib/constants.ts`. `LOCALE_LABEL` holds the toggle's language names, which are never translated.
- `lib/i18n/dictionaries/en.ts` is the source of truth and exports the `Dictionary` type;
  `pt-BR.ts` is annotated `: Dictionary`, so a missing key fails `npm run typecheck`.
- Server components call `await getDictionary()` (or `dictionaryFor(locale)` when they also need the
  locale). Client components call `useI18n()`, fed by `I18nProvider` in each layout.
- Dictionaries cross the server -> client boundary, so entries are plain data, never functions.
  Interpolation uses `{token}` placeholders resolved by `t()` in `lib/i18n/format.ts`; plurals are
  `{ one, other }` objects picked by `t()` from a `count` var.
- Emphasis inside a sentence is marked with `*asterisks*` and rendered by `components/rich-text.tsx`,
  so translators move the bold with the words instead of reassembling JSX.
- Enum values (`SECTIONS`, `FLOW_CATEGORY`, `EXPERIMENT_STATUS`, ...) are Postgres enum values and
  are **never** translated - only their display labels under `dictionary.labels.*` are.
- Dates and decimals go through `formatDate` / `formatDecimal` / `formatNumber` in
  `lib/i18n/format.ts`. Prices stay in USD (Stripe is USD-only); only the `/mo` suffix is translated.
- AI-generated content (hypotheses, variant copy, rationales, flow fixes) is written in the UI locale
  the analysis was run in, pinned to `analyses.locale`. Switching language afterwards does not
  retranslate an existing analysis. `current_copy` is the exception: it quotes the analyzed page
  verbatim, in whatever language that page is written in.

### Usage gate banner (`components/usage-banner.tsx`)

- Rendered on the dashboard above the URL form, fed by `usageFor()`
- Free users only: renders nothing when `limit` is null, and nothing until 1 analysis remains
- Soft amber warning at 2/3; red hard block at 3/3, which also disables the URL form's input and
  submit via the `blocked` prop, so the gate is visible before submitting rather than as a 403 after

### Empty state

- Shown on dashboard when user has no analyses yet
- Single CTA: "Analyze your first landing page"

## Landing page

The page sells **two paths**, not one - the ranked report is the deliverable, the live test is the
optional proof step. All copy comes from `dictionary.landing`.

- Hero: the report arrives in minutes with no code; the script tag and timed test are what you reach
  for when you want proof.
- `#how` renders `landing.tracks`: "Get the plan" (minutes, no code) and "Prove it live" (marked
  optional), each a 3-step `<ol>` numbered from 01 within its own track.
- The value cards (`landing.proof`) cover one benefit each: ranked-and-grounded hunches, finished
  variant copy, and proof on demand. Never let all three be about live testing again.
- Pricing maps `SUBSCRIPTION_PLAN` directly. Never render a tier that cannot be checked out.

## Core feature components

### URL input form

- Single text input + submit button
- Validates URL format client-side before submitting
- Disables submit while analysis is in progress
- A collapsible `<details>` "Add business details (optional)" textarea (prefilled from the user's
  most recent analysis `brief`), sent as `brief` so copy comes back finished
- A collapsible "Competitor mode" `<details>`: paid plans get up to 3 competitor URL inputs (sent as
  `competitorUrls`); free plans see it locked with an upgrade link to `/billing`

### Analysis loader

- Skeleton cards shown while `POST /api/analyses` is pending
- Four-phase progress label from `dictionary.urlForm.phases`, paced by `PHASE_SCHEDULE` to the real
  pipeline: scraping -> researching competitors -> writing test ideas -> saving results

### Two-screen flow: what to test -> run a test

The analysis experience is split into two screens (single-challenger, one test at a time). There is
no manual "pick a winner" circuit: the AI recommends the challenger (`variants[0]`, the only variant
written during the analysis) and the live test decides the actual winner.

**Screen 1 - "What to test"** (`app/analyses/[id]/page.tsx` + `components/hypothesis-list.tsx`):

- Benchmarked-against line: the competitors (`analyses.competitors`) rendered as links near the top.
- A one-time **Install snippet** card (`components/embed-snippet.tsx`) - site-level setup. It is
  mounted by the **page**, not by `HypothesisList`, so the section order (snippet -> playbook ->
  hypotheses) is decided in one place rather than by where the snippet happens to be rendered.
- The **flow playbook** (`components/flow-playbook.tsx`) - fix the flow before testing the wording.
- A ranked list of hypotheses (impact desc), **tiered rather than flat** - an analysis is 5-8 copy
  tests on top of 3-6 flow fixes, and a stack of identical cards makes row 1 and row 14 read as
  equally important when the founder's job is picking one:
    - The first `HYPOTHESIS_EXPANDED_COUNT` (3) render as full cards: section badge, the problem,
      impact/effort `ScoreIndicator`s, the recommended challenger copy (`variants[0]`), and a
      **"Set up test"** button linking to Screen 2 (`/analyses/[id]/tests/[hypothesisId]`). The
      top card carries a coral ring and the "Test this first" flag.
    - Everything past that collapses into a `DisclosureCard` row (rank, badges, truncated problem,
      compact scores) that opens into the same body. `HypothesisBody` is shared by both tiers, so
      the challenger block and the CTA are written once.
    - A hypothesis whose experiment is `running` opens by default whatever its rank. A live test is
      never something the reader has to go hunting for.
- A sort/filter bar (`components/hypothesis-filters.tsx`), rendered only once there are
  `HYPOTHESIS_FILTER_THRESHOLD` (4) hypotheses - below that it is noise. Sort by impact / effort /
  quick wins (`isQuickWin` in `lib/constants.ts`, the same definition the print report's summary
  cell uses); filter by `HYPOTHESIS_TARGET` and hide finished tests. Pure client state over rows
  already loaded - no new request, no URL params.
- **"Test this first" is tied to the default order.** It renders only under impact sort with no
  filters applied; under any other order the first row is the first match, not a recommendation.
- The list fetches the analysis's experiments (`GET /api/experiments?analysisId=`); a hypothesis that
  already has a test shows its `EXPERIMENT_STATUS` badge and a **"View test"** button instead.

**Screen 2 - "Run the test"** (`app/analyses/[id]/tests/[hypothesisId]/page.tsx` +
`components/test-runner.tsx`):

- Shows the control (current copy) and a challenger picker with an editable copy textarea (prefilled
  from the selected variant), plus a 7 / 14 / 30-day duration selector.
- **Challenger pills.** Only the recommendation exists when the screen first opens; it fires
  `POST /api/hypotheses/[id]/variants` on mount, shows a "Writing alternates..." note, and adds
  Variant B and C when they land. Fail-quiet by design: the recommendation is already usable and
  launching never waits on the alternates.
- **Conversion goal card.** Pills for `analyses.goal_candidates` (highest-ranked CTA preselected)
  plus a free-text CSS selector input. Clearing it warns that the test would record visitors but no
  conversions. This is what makes the result mean anything - see the embed snippet note below.
- **"Launch test"** -> `POST /api/experiments { hypothesisId, variantId, variantCopy, goalSelector,
  durationDays }`. On `403 limit_reached` (a test already running) it shows an inline upgrade CTA;
  on `422 manual_target` it explains the idea has to be applied by hand.
- Once an experiment exists (loaded server-side or just launched), it renders the experiment results
  panel in place.

### Flow playbook (`components/flow-playbook.tsx`)

The structural fixes, shown on **all three** analysis surfaces from this one component: the analysis
screen, the owner print report, and the public report. Nothing about it is duplicated per surface.

- Per fix: `FlowCategoryBadge`, two `ScoreIndicator`s, the title, the problem, the `steps` as an
  `<ol>` numbered `01`-style (`font-mono tabular-nums`, the same idiom as `landing.tracks`), and the
  evidence line. Cards carry `break-inside-avoid` because one of the three surfaces is a print view.
- **There is deliberately no "Set up test" button.** A flow fix changes structure, not one line of
  text, so the embed snippet has nothing to swap and there is nothing to A/B. The `InfoHint` on the
  heading exists to say exactly that; do not add a test action here.
- Renders `null` when there are no fixes, so an analysis whose playbook generation failed simply has
  no playbook section rather than an empty heading.
- `expandFrom` is the index past which fixes collapse into `DisclosureCard` rows. The analysis screen
  and the public report pass `PLAYBOOK_EXPANDED_COUNT` (2); the **print report passes nothing**, so
  every fix stays open - nothing may be hidden on paper. Collapsed rows keep `data-testid="flow-fix"`
  so the e2e counts hold across both renderings.
- On the public report it sits in front of `WaitlistWall` and outside `REPORT_PREVIEW_LIMIT`: it is
  the strongest reason a prospect keeps reading, so it is never what gets blurred.
- `components/flow-category-badge.tsx` mirrors `section-badge.tsx` exactly, over
  `FLOW_CATEGORY_BADGE_CLASS` + `dictionary.labels.flowCategory`. Colors: `signup_friction` -> coral,
  `cta_placement` -> purple, `decision_load` -> blue, `objections` -> teal, `trust` -> green,
  `pricing_clarity` -> amber, `page_structure` -> gray.

### Section badge

- Colored pill mapped to each `SECTIONS` enum value
- Used inside the hypothesis cards and experiment panel
- Color mapping (consistent across the app):
    - `headline` -> purple
    - `subheadline` -> purple (lighter)
    - `cta` -> coral
    - `social_proof` -> teal
    - `pricing` -> amber
    - `features` -> blue
    - `hero_image` -> gray
    - `navigation` -> gray
    - `other` -> gray

### Score indicator

- Visual bar or numbered badge for `impact_score` and `effort_score` (1-10)
- Impact: higher = warmer color (coral at 8-10, amber at 5-7, gray at 1-4)
- Effort: lower = better (green at 1-3, amber at 4-6, red at 7-10)
- `variant="compact"` swaps the ten-segment gauge for one tinted chip (`I9`, `E3`), over
  `impactScoreBadgeClass` / `effortScoreBadgeClass`. It is what collapsed rows use: a screen holding
  ten or more rows cannot afford ten gauges. The `aria-label` is identical in both variants, so
  nothing is lost to a screen reader.

### Disclosure card (`components/disclosure-card.tsx`)

The collapsed row shared by `HypothesisList` and `FlowPlaybook`. A native `<details>` wrapping a
`Card`, not React state: it costs no client JS and renders identically inside the server-rendered
public report and the client-rendered analysis list, so one component covers both surfaces. The
`+` / `-` affordance is `aria-hidden` - the summary's title is the accessible name.

An open row **is** a full card and is dressed like one: the title stops truncating and `openScores`
(full `ScoreIndicator` gauges) replaces the compact chips. Both score sets are rendered and swapped
with `group-open:`, so the component stays CSS-only. They carry identical aria-labels and a
`display:none` element is not announced, so the swap is invisible to a screen reader.

## Live experiment components

### Install snippet card (`components/embed-snippet.tsx`)

- Copy-to-clipboard card showing `<script src="<APP_URL>/embed.js" data-key="<embedKey>"></script>`.
- `APP_URL` comes from `NEXT_PUBLIC_APP_URL`, falling back to `window.location.origin`.
- One tag per landing page (keyed on `analyses.embedKey`), installed once on Screen 1; the same tag
  serves whichever test is running.

### Experiment results panel (`components/experiment-panel.tsx`)

- Per experiment: section badge + `EXPERIMENT_STATUS` pill, the problem, and two arm tiles
  (Control vs Variant) each showing conversion rate and `conversions / impressions`; the leading
  arm is highlighted.
- A significance line: "Not enough data yet" / "<x>% lift so far, not yet significant" /
  "Significant: <x>% lift (p=...)".
- While `running`, shows an "Ends in N days" countdown (from `endsAt`; past-due -> "Finalizing..."),
  polls `GET /api/experiments/[id]`, and exposes Stop / Discard / Declare winner
  (`PATCH /api/experiments/[id]`).
- When `completed`/`stopped`, shows a recommendation pill (`EXPERIMENT_RECOMMENDATION_*`) plus
  Copy report / Download .md built by `buildReportMarkdown` in `lib/export.ts`. Export is paid-only
  (`canExport`): free plans get an "Upgrade to export" link to `/billing` in its place.
- Warns when the experiment has no `goalSelector`: it is recording visitors but can never record a
  conversion, so a 0% rate there is not a real result.
- Experiment status -> pill color: `running` -> amber, `completed` -> green, `stopped` -> gray
  (from `EXPERIMENT_STATUS_BADGE_CLASS`).

## Billing components

### Plan card

- Displays free / solo tiers
- Features list per tier
- CTA button triggers `POST /api/billing/checkout`

### Usage counter

- "2 of 3 analyses used this month"
- Pulls from `GET /api/usage`
- Only visible to free tier users
- The count is the *effective* one from `usageFor()`, which reads 0 once the monthly window has
  rolled over, so it never shows a stale number from a lapsed period

## Public report (`app/(report)/r/[embedKey]/page.tsx`)

The outreach surface: no session, no navbar, its own layout. Read by a prospect who never asked for
it, so nothing here may 404 loudly or leak whether an unknown key exists.

- The **flow playbook** in full, after the competitor pills and in front of the wall. It does not
  count toward `REPORT_PREVIEW_LIMIT`.
- Ranked teardown of the analysis, `REPORT_PREVIEW_LIMIT` hypotheses shown in full. Auto-targetable
  ideas are ordered first so the previews on top are real ones.
- **Variant preview** (`components/variant-preview.tsx`): lazily POSTs to `/api/report/screenshot`
  and renders the landing page with the recommended copy swapped in. Renders nothing when no preview
  is possible; `manual` hypotheses show a dashed "apply by hand" note instead.
- **Waitlist wall** (`components/waitlist-wall.tsx`): once past the preview limit, the remaining
  hypotheses are blurred behind an email + optional phone form posting to `/api/waitlist`.

## SEO and metadata

`pageMetadata()` in `lib/seo.ts` builds every route's metadata, so the shape cannot drift per page.
A new page declares its own `generateMetadata` calling it - there is no default that quietly makes a
page indexable.

- Titles and descriptions live under `dictionary.metadata.pages.*`, like every other string. The
  `%s | Hunch` title template stays in code: Next's `%s` is not a `{token}`, so a translator only
  gets the site name.
- `metadataBase` is set once, in `app/layout.tsx`, from `siteOrigin()` (`lib/app-url.ts`). It is what
  turns each page's `path` into an absolute canonical and `og:url`, so `NEXT_PUBLIC_APP_URL` is
  load-bearing in production.
- **Self-canonical, no hreflang.** The locale is a cookie with no route segment, so `en` and `pt-BR`
  are genuinely the same URL. Claiming `alternates.languages` would be a lie to crawlers; the
  cookie-less render (`DEFAULT_LOCALE`) is what gets indexed. Do not add hreflang without first
  giving the locales real URLs.
- **`/` is the only indexable route**, and the only entry in `app/sitemap.ts`. Everything else passes
  `index: false`. `app/robots.ts` disallows the same prefixes, importing `PROTECTED_PREFIXES` from
  `lib/constants.ts` so it can never drift from `middleware.ts`.
- The public report is `noindex` but carries a **full** Open Graph card: it is pasted into cold email
  and DMs, where the unfurl is the whole first impression. Its metadata reveals nothing about whether
  an unknown key exists.

### Open Graph images

- `app/opengraph-image.tsx` is the site-wide card; `app/(report)/r/[embedKey]/opengraph-image.tsx`
  renders a per-report one (analyzed host, test count, top impact). Both use `next/og`, so there is
  no binary asset in the repo and no new dependency.
- A page that sets its own `openGraph` **replaces the root layout's entirely**, taking the
  file-convention image with it. That is why `pageMetadata` names `DEFAULT_OG_IMAGE_PATH` by hand and
  why only a route with a co-located `opengraph-image.tsx` passes `ownImage: true`.
- Satori parses neither `oklch()` nor a CSS variable, so the OG components in `components/og.tsx` use
  inline styles over `OG_COLORS` - the one place hex values are legitimate. Keep them in step with
  the tokens in `app/globals.css`. Every element needs an explicit `display`.
- The images resolve their dictionary with `dictionaryFor(DEFAULT_LOCALE)`, not `getDictionary()`:
  unfurlers send no cookies, and avoiding the cookie read keeps the site-wide card static.

## Internationalization

Every user-facing string comes from a dictionary in `lib/i18n/dictionaries` - never inline text.

- Server components: `await getDictionary()`.
- Client components: `useI18n()` from `components/i18n-provider.tsx`, which receives the dictionary
  resolved server-side in `app/(app)/layout.tsx`.
- Interpolation and plurals go through `t()`; dates and numbers through `formatDate` /
  `formatNumber` / `formatDecimal` so locale formatting is never done ad hoc.
- The language toggle posts to the `setLocale` server action, which sets `LOCALE_COOKIE` and
  revalidates the layout. There is no locale route segment.
