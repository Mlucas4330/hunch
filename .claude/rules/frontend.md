## Pages

| Route            | Page                | Description                                          |
| ---------------- | ------------------- | ---------------------------------------------------- |
| `/`              | Landing page        | Credibility surface for a human-led sale: two tracks, contact form, **no prices** |
| `/auth/signin`   | Auth page           | Google OAuth sign in via NextAuth; returns to `callbackUrl` |
| `/dashboard`     | Dashboard / history | List of past analyses, "New analysis" button         |
| `/analyses/[id]` | What to test        | Five tabs: flow, copy, SEO, found-by-AI, and tests (snippet + launch) |
| `/analyses/[id]/tests/[hypothesisId]` | Run a test | Approve/swap/edit the challenger, set the conversion goal, launch, monitor results |
| `/r/[embedKey]`  | Public report       | Two shapes by owner plan: our lead magnet (free) or their unbranded deliverable (paid). No session |
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
- Mounted in `components/navbar.tsx` and, separately, in the public report's own header - the report
  has no navbar, and it is read signed-out by someone who may not read English.

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
  `lib/i18n/format.ts`.
- **`pt-BR` is a rewrite, not a translation.** Two rules, both learned from real breakage:
    - **A technical term the Brazilian market uses in English stays in English.** LCP, meta
      description, alt, CTA, snippet, deploy, landing page, placeholder. Translating those does not
      make the text clearer, it makes it harder to recognize - and the reader works in the field.
      "Baixado para abrir a página" for page weight is the shape of the mistake.
    - **Accents are not optional.** The whole `metadata` subtree once shipped stripped of them
      ("analises", "voce", "conversao") - which is the browser tab and the unfurl. This is also why
      the prompts' typographic rule restricts *punctuation* and must never be phrased as "plain
      ASCII": that silently forbids the characters Portuguese requires.
- AI-generated content (hypotheses, variant copy, rationales, flow fixes) is written in the UI locale
  the analysis was run in, pinned to `analyses.locale`. Switching language afterwards does not
  retranslate an existing analysis. `current_copy` is the exception: it quotes the analyzed page
  verbatim, in whatever language that page is written in.

### Usage gate banner (`components/usage-banner.tsx`)

- Rendered on the dashboard above the URL form, fed by `usageFor()`
- Free users only: renders nothing when `limit` is null, and nothing until 1 analysis remains
- Soft amber warning at 2/3; red hard block at 3/3, which also disables the URL form's input and
  submit via the `blocked` prop, so the gate is visible before submitting rather than as a 403 after
- The count is the *effective* one from `usageFor()`, which reads 0 once the monthly window has
  rolled over, so it never shows a stale number from a lapsed period
- This is the **only** place the allowance is shown. There used to be a separate usage counter on
  `/billing`; it went with that page, and its strings went with the `billing` dictionary subtree -
  `usageOf` moved here, which is where the rest of this component's sentence already lived

### Empty state

- Shown on dashboard when user has no analyses yet
- Single CTA: "Analyze your first landing page"

## Landing page

Written for the reader who **sells CRO to other people**, not for the founder auditing their own
page. It is a credibility surface, not a self-serve funnel: the sale is run by a person, and what
this page has to do is survive being googled after a cold report lands. All copy comes from
`dictionary.landing`.

- Hero: the prospect's page, measured, sent under the reader's own name.
- `#how` renders `landing.tracks`: "Send the report" (minutes, no access needed) and "Prove the lift"
  (marked *after the contract*), each a 3-step `<ol>` numbered from 01 within its own track. The
  second track is deliberately placed after the close - nobody installs a script tag for a prospect.
- The value cards (`landing.proof`) cover one benefit each: measured-not-asserted, finished copy, and
  yours-to-send. Never let all three be about live testing again.
- **The page publishes no price, and that is not an oversight.** The pricing table was removed
  because the deal is negotiated by a person and a visible self-serve number anchors that
  conversation to itself before it starts. `/billing` still renders the real tiers for signed-in
  users, and the old rule holds there: never render a tier that cannot be checked out. The e2e case
  `publishes no price publicly` is what keeps a price from drifting back onto `/`.
- `#contact` replaces it: `WaitlistForm` with `source="contact"`, posting to the existing
  `/api/waitlist`. No new endpoint and no new table - the leads land beside the report ones and are
  read in `/admin/leads`, separated by their `source`.

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

- Benchmarked-against line: the competitors (`analyses.competitors`) rendered as links near the top,
  followed by the market the analysis was run in (`analysis.marketNote` + `labels.market.*`). The
  market is named there because it is the only thing that explains the list beside it: detection reads
  the page, and when it reads it wrong the failure surfaces as inexplicably foreign competitors unless
  the reader can see which market was used.
- Five tabs (`components/analysis-tabs.tsx`, over the `ANALYSIS_TAB` enum): **Flow** (the playbook),
  **Copy** (the hypotheses), **SEO**, **Found by AI** and **Tests**. `flow` opens first - fix the
  structure before testing the wording - and if it is empty the first non-empty tab opens instead.
    - The two report surfaces render the same shell; only the print report stays stacked.
    - Every panel stays mounted and inactive ones are `hidden`, so switching tabs never remounts
      `TestList` (which would refetch `/api/experiments`) or an already-rendered preview.
    - **`tests` never appears on the public report.** That surface passes `tests: 0` and the
      empty-tab rule below holds it out - a prospect reading someone else's teardown installs no
      snippet. It is also the last tab on purpose: deciding what to change comes before proving it.
    - **An empty tab is not rendered.** `FlowPlaybook` returns `null` for an empty list, so the shell
      computes emptiness itself. This is the normal case for analyses generated before the
      visibility audit existed: their rows are all `flow`, so SEO and AI are genuinely empty.
    - `seo` and `ai` are the same `kind = 'visibility'` rows split by category (`splitVisibility` in
      `lib/analyses.ts`), not a column. No migration divides them.
- A ranked list of hypotheses (impact desc). **Every row is a `DisclosureCard`** - one shape, no
  tiers. The first `HYPOTHESIS_EXPANDED_COUNT` (3) merely start open. Being open is always a
  default, never a state the reader is stuck in:
  there used to be a separate always-open card component, and a reader who had finished with row 1
  had no way to fold it away.
    - The body carries the recommended challenger copy (`variants[0]`) and the **"Why this works"**
      block. The top row carries a coral ring and the "Test this first" flag.
    - **No "Set up test" button, and no experiment status.** Launching moved to the Tests tab along
      with the snippet, so this list knows nothing about experiments - which is also why it makes no
      request at all any more.
- A sort/filter bar (`components/hypothesis-filters.tsx`), rendered only once there are
  `HYPOTHESIS_FILTER_THRESHOLD` (4) hypotheses - below that it is noise. Sort by impact / effort /
  quick wins (`isQuickWin` in `lib/constants.ts`, the same definition the print report's summary
  cell uses) and filter by `HYPOTHESIS_TARGET`. Pure client state over rows already loaded - no new
  request, no URL params. There is deliberately **no "hide finished"** chip: that is test state, and
  test state lives one tab over.
- **"Test this first" is tied to the default order.** It renders only under impact sort with no
  filters applied; under any other order the first row is the first match, not a recommendation.

**The Tests tab** (`components/test-list.tsx`):

- Everything about running a live test, in one place, because testing is the step you reach for
  *after* the work is won and you have access to the site. It used to be split between a snippet
  card above the tabs and a button inside every copy idea, which put setup in front of readers who
  were not testing and hid it from the ones who were.
- Holds the `EmbedSnippet` card plus one row per **`auto`** hypothesis: section badge,
  `EXPERIMENT_STATUS` pill, impact chip, and the Set up / View test link to Screen 2.
- Rows are not `DisclosureCard`s. The ranked lists are things to read and weigh; this is a list of
  things to launch, so each row is one line.
- The tab's count is the number of `auto` hypotheses, so an analysis where every idea is `manual`
  has **no Tests tab and no snippet card** - there would be nothing for the snippet to swap.
- It owns the `GET /api/experiments?analysisId=` fetch that `HypothesisList` used to make. The
  request moved rather than multiplied. A `running` experiment sorts to the top, which is where the
  old "a running test always starts open" rule went.

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
- **A finished test never blocks the next one.** The panel keeps its numbers, but once the experiment
  is no longer `running` a "Run another test" button sits under it and clears the local state back to
  the launch form. Without it the form was unreachable forever after the first stop -- which
  contradicted the panel's own `noGoal` note telling the reader to stop and relaunch with a goal. The
  page still loads the most recent experiment regardless of status, so the result stays readable;
  it is the *rendering* that stops being terminal, not the query.
- Launching a second test on a hypothesis that still has one running answers `409 already_running`
  and surfaces `testRunner.alreadyRunning` inline, beside the existing `403` and `422` branches.

### Measured readout (`components/measured-readout.tsx`)

The only section of the product that states numbers, and everything in it was counted on the scraped
page by `lib/readout.ts`. Nothing here was written by a model and nothing here is passed to one - the
quantitative ban on generated `evidence` is untouched and governs a different producer.

- Mounted on **all three** analysis surfaces, like `FlowPlaybook`, fed by `readoutFor(analysis)`:
  above the tabs on `/analyses/[id]`, between the `<h1>` and the tabs on the public report, and ahead
  of both fix lists on the print report.
- **Outside every wall on the public report.** It is the part a stranger can check against their own
  page in one click, so it is what earns the rest of the document a reading; gating a measurement of
  someone's own site behind an email reads as a trick.
- Returns `null` when nothing was measured, so an analysis created before the columns existed has no
  section rather than an empty heading - the same contract `FlowPlaybook` has with an empty list.
- Rendered as a **grid of label + value**, not sentences, over `READOUT_GROUP`. A single string per
  finding then covers every severity; a sentence would have to be rewritten per state, and a presence
  finding's sentence is false in its own `ok` case.
- Severity colours come from `READOUT_SEVERITY_CLASS`: `ok` green, `warn` amber, `alert` coral. Green
  is load-bearing - a readout that is all coral reads as a sales pitch.
- Units convert **here and only here** (`BYTES_PER_MEGABYTE`, `MS_PER_SECOND`); the readout keeps
  bytes and milliseconds so nothing is rounded twice. `page_weight` renders behind
  `readout.atLeast`, because the scrape blocks media.
- The comparison table is the one wide element, so it lives in its own `overflow-x-auto` - the report
  is read on a phone as often as not. It renders only in Competitor mode, where the competitor pages
  were genuinely opened and measured.
- Copy discipline: every string says **what was measured and how**, never what the number will
  produce. Do not let a "this is costing you X%" line in here - it is the promise that burns the
  report the first time it does not come true.

### Flow playbook and visibility audit (`components/flow-playbook.tsx`)

**Two ranked lists, one component.** The flow playbook (structural conversion fixes) and the
visibility audit (whether a search engine and a model can reach, read, and cite the page) have the
identical shape and share one table, so one component renders both on **all three** analysis
surfaces: the analysis screen, the owner print report, and the public report. Nothing is duplicated
per surface or per kind.

`section` (`PLAYBOOK_SECTION`: `flow` by default, or `visibility` / `seo` / `ai`) selects the
dictionary subtree and the `data-testid`, and nothing else -- there is no branch on it below the
heading, which is the point. Consequences:

- `dictionary.flow`, `.visibility`, `.seo` and `.ai` mirror each other key for key, and are keyed by
  the enum value so the component reads `dictionary[section]` with no mapping table. A key added to
  one must be added to all four or the union access stops typechecking.
- Test ids are `${section}-playbook` and `${section}-fix`, so no two families can be counted as one.
  **A shared `flow-fix` id across sections would break the e2e counts silently** -- those counts are
  what assert the families never merge.
- Rows are split by `splitFixes` and `splitVisibility` (`lib/analyses.ts`), never filtered inline at
  a call site.
- **`visibility` is not dead.** It is the single combined section the print report renders, because
  on paper there is nothing to click and the SEO / AI split would only mean two headings.

They render as separate sections rather than one impact-ranked list: a founder deciding what to test
first should not have "write a meta description" ranked in among the conversion fixes.

- Per fix: `FlowCategoryBadge`, two `ScoreIndicator`s, the title, the problem, the **"Why" block**
  (`components/why-block.tsx`) and then the `steps` as an `<ol>` numbered `01`-style (`font-mono
  tabular-nums`, the same idiom as `landing.tracks`). Cards carry `break-inside-avoid` because one of
  the three surfaces is a print view.
- **The "Why" comes before the steps, and is a panel rather than a footnote.** It used to be 12px
  muted text under the steps block, with a 9.6px label - readers reported never noticing the
  reasoning existed at all. Do not shrink it back below the copy it explains.
- **There is deliberately no "Set up test" button.** A flow fix changes structure, not one line of
  text, so the embed snippet has nothing to swap and there is nothing to A/B. The `InfoHint` on the
  heading exists to say exactly that; do not add a test action here.
- Renders `null` when there are no fixes, so an analysis whose playbook generation failed simply has
  no playbook section rather than an empty heading. `AnalysisTabs` relies on this and hides a tab
  whose count is 0.
- **Every fix is a `DisclosureCard`.** `expandFrom` is the index past which they *start* closed - the
  two tabbed surfaces pass `PLAYBOOK_EXPANDED_COUNT` (2), the **print report passes nothing**, so
  every fix starts open (nothing may be hidden on paper). Either way a row can be closed.
- On the public report every tab is gated on its own: `REPORT_FIX_PREVIEW_LIMIT` (2) fixes, or
  `REPORT_PREVIEW_LIMIT` (3) hypotheses, then that tab's own `WaitlistWall` and the rest blurred. One
  wall per tab, not one per page -- a tab the reader never opens cannot be what asks for an email.
  Blurred placeholder rows carry **no** `data-testid`, so the e2e counts keep meaning "shown".
- The visibility section's `hint` states the limit of what was measured: the audit read the page, not
  the index. It promises nothing about ranking and nothing about whether an AI mentions the product
  today. Do not soften that into a claim the audit cannot support.
- `components/flow-category-badge.tsx` mirrors `section-badge.tsx` exactly, over
  `FLOW_CATEGORY_BADGE_CLASS` + `dictionary.labels.flowCategory`. Flow colors: `signup_friction` ->
  coral, `cta_placement` -> purple, `decision_load` -> blue, `objections` -> teal, `trust` -> green,
  `pricing_clarity` -> amber, `page_structure` -> gray. Visibility colors: `indexability` -> coral,
  `metadata` -> purple, `structured_data` -> blue, `ai_answerability` -> teal. Hues repeat across the
  two families on purpose -- they never render in the same list, so a colour only has to separate the
  categories it sits beside.

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

### Info hint (`components/info-hint.tsx`)

The `i` beside a section heading. Opens on hover, on click and on keyboard focus; closes on `Escape`,
on a click outside, or when the pointer leaves. Hover and click are held as two pieces of state, so
clicking an icon the pointer is already over pins the panel instead of toggling it shut.

Dismissal is a document-level `pointerdown` listener, **never a `fixed inset-0` catcher element**.
That is what it used to be, and it did not work: `.animate-fade-up` runs with
`animation-fill-mode: both`, so the analysis page's root keeps a `transform` forever after the
animation ends, and a transform other than `none` makes that element the containing block for its
`position: fixed` descendants (and opens a stacking context around them). The catcher covered the
analysis container rather than the viewport. A listener has no geometry to get wrong.

The panel is width-capped against the viewport (`max-w-[min(18rem,calc(100vw-2rem))]`): it is
anchored to a 16px icon, so a fixed width runs off-screen wherever that icon sits near an edge.

### Report links (`components/copy-report-link.tsx`)

**One control, not three.** The header used to carry "open shareable report", "copy report link" and
"print report" side by side - the first two went to the same place, and a row of equal-weight buttons
was the reason none of them read as the primary action.

What is left: a **copy report link** button, and a `lucide-react` printer **icon** linking to
`/analyses/[id]/report`. Opening the link is gone (copying it is what you came to do, and the reader
can open what they pasted); printing is the rarer action, so it is an icon.

- The icon is `aria-hidden` and the accessible name is on the link - an icon-only control with no
  name is invisible to a screen reader, and the label doubles as the tooltip for everyone else.
- The copy button keeps its explicit failure state and `document.execCommand` fallback, because
  `navigator.clipboard` is undefined outside a secure context: on plain http the promise rejected
  unhandled and the button was simply dead.
- The origin has its trailing slash stripped, the same normalization
  [`siteOrigin()`](lib/app-url.ts) does.

### Score indicator

- Visual bar or numbered badge for `impact_score` and `effort_score` (1-10)
- Impact: higher = warmer color (coral at 8-10, amber at 5-7, gray at 1-4)
- Effort: lower = better (green at 1-3, amber at 4-6, red at 7-10)
- `variant="compact"` swaps the ten-segment gauge for one tinted chip (`I9`, `E3`), over
  `impactScoreBadgeClass` / `effortScoreBadgeClass`. It is what collapsed rows use: a screen holding
  ten or more rows cannot afford ten gauges. The `aria-label` is identical in both variants, so
  nothing is lost to a screen reader.

### Disclosure card (`components/disclosure-card.tsx`)

**Every** ranked row, on every surface: hypotheses and fixes alike. A native `<details>` wrapping a
`Card`, not React state: it costs no client JS and renders identically inside the server-rendered
public report and the client-rendered analysis list, so one component covers both surfaces. The
`+` / `-` affordance is `aria-hidden` - the summary's title is the accessible name.

Top rows arrive with `defaultOpen` rather than through a separate always-open card component. That
is the point of the shape: what a row starts as is a default, never a state the reader is stuck in.

An open row **is** a full card and is dressed like one: the title stops truncating and `openScores`
(full `ScoreIndicator` gauges) replaces the compact chips. Both score sets are rendered and swapped
with `group-open:`, so the component stays CSS-only. They carry identical aria-labels and a
`display:none` element is not announced, so the swap is invisible to a screen reader.

The title renders as an `<h3>` inside the `<summary>`. Since every row is one of these, a `<span>`
there would leave the section's items with no headings at all - for a screen reader walking the page
or for anything selecting them by role.

### Why block (`components/why-block.tsx`)

The reasoning behind a ranked item, on all three surfaces. It is a component because it was
previously neither consistent nor readable: a fix's `evidence` was 12px muted text under the steps
panel, the public report folded the same text into a 9.6px `<details>`, and a hypothesis's
`rationale` - which the model is required to write - was **never rendered on the analysis screen at
all**. Body-sized foreground text in a tinted panel; do not quiet it back down.

## Live experiment components

### Install snippet card (`components/embed-snippet.tsx`)

- Copy-to-clipboard card showing `<script src="<APP_URL>/embed.js" data-key="<embedKey>"></script>`.
- `APP_URL` comes from `NEXT_PUBLIC_APP_URL`, falling back to `window.location.origin`.
- One tag per landing page (keyed on `analyses.embedKey`), installed once from the **Tests tab**; the
  same tag serves whichever test is running.

### Experiment results panel (`components/experiment-panel.tsx`)

- Per experiment: section badge + `EXPERIMENT_STATUS` pill, the problem, and two arm tiles
  (Control vs Variant) each showing conversion rate and `conversions / impressions`; the leading
  arm is highlighted.
- A significance line: "Not enough data yet" / "<x>% lift so far, not yet significant" /
  "Significant: <x>% lift (p=...)". It is live and recomputed on every poll, deliberately -- what
  waits for the end is the **recommendation pill**, which renders only when the experiment is
  `completed` or `stopped`. The decision is never made from a peeked-at interim result; the numbers
  behind it are always visible.
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

## Plan prompts

**There is no billing UI.** `/billing`, the checkout dialog and the manage-billing button are gone
with the rest of the self-serve shop window: the deal is closed by a person, and the landing page
publishes no price. Every "you need a paid plan for this" prompt therefore points at `CONTACT_PATH`
(`/#contact`, in `lib/constants.ts`) rather than at four different dead ends.

What stays is everything that *grants* the plan: the `plan` column, `canWhiteLabel` / `canExport`,
and the three routes under `app/api/billing/`. The webhook is the load-bearing one - a sale you close
and invoice through Stripe still promotes the account with nobody editing the database. `checkout`
and `portal` are dormant but live, so reopening the shop window later is a UI-only change; both
return to `POST_SIGNIN_REDIRECT`, because a dormant route that lands a paying customer on the deleted
`/billing` is a trap for whoever re-enables it.

### Upgrade prompt (`components/upgrade-prompt.tsx`)

The post-value ask, and the counterpart to the public report: the report captures a *prospect's*
email, this starts a conversation with your own free users. Rendered at the end of `/analyses/[id]`
when `user.plan === 'free'`, so it is never what stands between someone and the analysis they asked
for.

- It sells **white-label**, not volume: the report going out without our mark and without a signup
  wall is the thing a paid plan is bought for.
- Deliberately says nothing about the remaining allowance. `UsageBanner` already counts that on the
  dashboard and the experiment panel already offers the export prompt - three components repeating
  one number is how a paywall starts to feel like nagging.
- Dismissal is written to `localStorage` under `UPGRADE_PROMPT_DISMISSED_KEY`, so it is per browser,
  not per user. Making it per user needs a `users` column and a write endpoint, which is more than a
  dismissible prompt is worth.
- `dismissed` is held as `boolean | null` and nothing renders while it is `null`: reading
  `localStorage` happens in an effect, so rendering before it resolves flashes a card the reader
  already dismissed.
- Only the paid half is covered by e2e. The suite signs in through the credentials hatch, which forces
  that user to `solo` (`auth.ts`), so what the fixture can prove is that a paying customer is **never**
  shown an upsell. The free-plan half needs a genuinely free account and is checked by hand.
- The **public report's two shapes have exactly the same limitation**, for exactly the same reason:
  the suite can assert the unbranded, unwalled paid report and cannot reach the free, walled one.
  Anything that must hold for the free shape is verified by hand.

## Public report (`app/(report)/r/[embedKey]/page.tsx`)

The outreach surface: no session, no navbar, its own layout. Read by a prospect who never asked for
it, so nothing here may 404 loudly or leak whether an unknown key exists.

**It has two shapes, decided by the owner's plan** via `reportIsWhiteLabelled()` (`lib/report.ts`)
over `canWhiteLabel()` (`lib/usage.ts`):

- **Free** - unchanged, and it is our lead magnet: our `Wordmark`, the "Generated by Hunch" footer,
  and a `WaitlistWall` per tab.
- **Paid** - the owner's deliverable, handed to *their* client. No mark of ours anywhere, no wall,
  and nothing blurred. This is what the paid plan is actually bought for.

Our name reaches the report from three independent places and **all three** are gated on that one
boolean. Strip two and the third still hands an agency a "white-labelled" document that advertises
us:

1. The page: `Wordmark`, `report.generatedBy`, `report.footerQuestion`, and `WaitlistWall`.
2. `openGraph.siteName` and the root layout's `%s | Hunch` title template, both handled by
   `pageMetadata({ unbranded })` (the title via `{ absolute }`).
3. `opengraph-image.tsx` - `OgWordmark` on the unfurl card. **The one most easily forgotten**, and
   the first thing the reader sees when the link is pasted into an email.

`app/(report)/layout.tsx` deliberately mounts no site chrome: it sits above the `[embedKey]` segment,
so it cannot know whose report it is and therefore cannot make this decision.

The cut itself goes through **one** `gate()` helper in the page, not per tab. It used to be written
twice (once in `fixPanel`, once for the copy tab), which is exactly how one tab stays walled after
someone "removes the wall".

- The same four tabs as the analysis screen (`AnalysisTabs`), after the competitor pills. The header,
  the title, the two summary cells and the `MeasuredReadout` stay above them - the readout ungated,
  for the reason given in its own section.
- **Every tab is gated on its own**: its top items in full, then that tab's own `WaitlistWall`, then
  the rest blurred. `REPORT_FIX_PREVIEW_LIMIT` (2) for the three fix tabs, `REPORT_PREVIEW_LIMIT` (3)
  for the copy tab. A tab whose whole list fits inside its limit renders no wall at all.
  The playbook used to sit in front of a single wall and never be blurred; the wall now cuts all four
  tabs, which trades some of that hook for lead capture. That is a deliberate call, not drift.
- Ranked teardown of the analysis in the copy tab, as `DisclosureCard` rows that all **start open** -
  unlike the owner's screen, because a prospect who has to click to see anything sees nothing.
  Auto-targetable ideas are ordered first so the previews on top are real ones.
- The **"Why this works"** block is open on each shown idea, not folded into a `<details>` summary:
  it is the argument for the change the prospect is being asked to believe.
- **Variant preview** (`components/variant-preview.tsx`): renders the landing page with the
  recommended copy swapped in, **on request only**. Each preview boots a browser against the
  customer's real page, so it POSTs to `/api/report/screenshot` from a click and never from mount -
  three of these on a cold report used to launch three browsers before anyone scrolled to them.
  Four states: `idle` (button + a hint naming `PREVIEW_ESTIMATE_SECONDS`), `loading` (button
  disabled, label swapped, skeleton - the label is what carries a 10s+ wait, a pulse alone is not
  enough), `ready` (the image), `error` (a note plus a retry that returns to `idle`; after an
  explicit click, rendering nothing reads as a broken button). A cached `screenshot_url` arrives as
  `initialUrl` and renders straight to `ready` with no button and no request. `manual` hypotheses
  never mount it at all and show a dashed "apply by hand" note instead.
  The fetch is bounded by `PREVIEW_REQUEST_TIMEOUT_MS` - derived from the server's real budget, never
  written down - because the worst case is minutes and an endless skeleton is worse than an error with
  a retry. `onError` on the `<Image>` returns to `idle`: since `initialUrl` renders without ever
  calling the API, this is the **only** place a pruned, lost or truncated file can be caught, and a
  broken image on the one surface a prospect sees is the thing to avoid. Both are why this component
  owns the recovery rather than the route.
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
