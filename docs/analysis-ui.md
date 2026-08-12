# The analysis screens

## Routes

| Route | Page | Description |
| ----- | ---- | ----------- |
| `/` | Landing page | Credibility surface for a human-led sale: two tracks, contact form, **no prices** |
| `/auth/signin` | Auth | Google OAuth via NextAuth; returns to `callbackUrl` |
| `/dashboard` | Clients | Grid of past analyses, one card per client, above the new-analysis form |
| `/analyses/[id]` | What to test | Five tabs: flow, copy, SEO, found-by-AI, tests |
| `/analyses/[id]/tests/[hypothesisId]` | Run a test | Approve/swap/edit the challenger, set the goal, launch, monitor |
| `/analyses/[id]/report` | Print report | One stacked page, owner-authenticated — see [report.md](report.md) |
| `/r/[embedKey]` | Public report | Two shapes by owner plan. No session — see [report.md](report.md) |
| `/admin/leads` | Waitlist leads | Operator-only (`users.role`); the only place waitlist rows can be read |
| `/admin/reports` | Report opens | Operator-only; open count and last open per analysis — see [report.md](report.md) |

The app routes live under the `(app)` route group (`app/(app)/analyses/...`); the public report has its
own group, `app/(report)/r/[embedKey]/`.

## Landing page

Written for the reader who **sells CRO to other people**. It is a credibility surface, not a
self-serve funnel: the sale is run by a person, and what this page has to do is survive being googled
after a cold report lands. All copy comes from `dictionary.landing`.

- Hero: the prospect's page, measured, sent under the reader's own name.
- `#how` renders `landing.tracks`: "Send the report" (minutes, no access needed) and "Prove the lift"
  (marked *after the contract*), each a 3-step `<ol>` numbered from 01 within its own track. The second
  track is deliberately placed after the close — nobody installs a script tag for a prospect.
- The value cards (`landing.proof`) cover one benefit each: measured-not-asserted, finished copy, and
  yours-to-send. **Never let all three be about live testing again.**
- **No price**, per
  [invariants.md](invariants.md#there-is-no-self-serve-checkout-and-no-published-price).
- `#contact` is a `WaitlistForm` with `source="contact"`, posting to the existing `/api/waitlist`. No
  new endpoint and no new table — the leads land beside the report ones and are read in `/admin/leads`,
  separated by their `source`.

## Dashboard — the Clients screen

`components/analysis-history.tsx`. The dashboard is **Clients**, not an analysis log: every analysis
the reader runs is one of *their* clients. That is a rename plus a layout, and deliberately **not** a
schema change — there is no `client_name` column and no `clients` table.

- `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`, so three cards a row fit the `CONTAINER_CLASS` measure
  `app/(app)/layout.tsx` already sets — see [components.md](components.md). The `Card` is
  `flex flex-col` and the footer is `mt-auto`, so
  cards in a row end level whatever the host and url lengths are.
- **The client is the hostname**, derived by `displayHost()` (`lib/host.ts`) — the one helper the public
  report's title, its OG card and the competitor brief all read, so a host is spelled the same way
  everywhere. Resolved server-side in the page's projection, like `formatDate` and the `labels.market`
  label beside it, so the client component receives finished strings.
- **The full url is rendered under it, wrapping (`break-all`), never truncated.** It is the only thing
  separating two analyses of one client, and what distinguishes them is the path and query at the
  *end* — exactly what an ellipsis eats. It also has to stay **one text node**: `e2e/core.spec.ts`
  locates a run by matching the whole url inside `analysis-history`.
- Footer: date, a CSS dot, and the analysis's market.
- **Delete is an icon** (`Trash2`), and confirm/cancel are icons too (`Check` / `X`). The two-step
  inline confirm stays — `components/ui/` has no dialog primitive — and so does the rule from
  `copy-report-link.tsx`: the accessible name is `aria-label` on the button, the icon is `aria-hidden`.
  No new dictionary keys; `common.delete` / `common.deleting` / `common.cancel` are the labels.
- The whole card is a link via an `absolute inset-0` overlay, so the action cluster escapes it with
  `relative z-10`.
- **Empty state**: shown when the user has no clients yet. Single CTA — paste a client's landing page
  URL above.

### URL input form

- Single text input + submit, validating URL format client-side and disabling submit while an analysis
  is in progress.
- A collapsible `<details>` "Add business details (optional)" textarea, prefilled from the user's most
  recent analysis `brief`, sent as `brief` so copy comes back finished.
- A collapsible "Competitor mode" `<details>`: paid plans get up to 3 competitor URL inputs (sent as
  `competitorUrls`); free plans see it locked with a link to `CONTACT_PATH`.

### Analysis loader

Skeleton cards while `POST /api/analyses` is pending, with a four-phase progress label from
`dictionary.urlForm.phases` paced by `PHASE_SCHEDULE` to the real pipeline: scraping -> researching
competitors -> writing test ideas -> saving results.

### Usage gate banner — `components/usage-banner.tsx`

- Rendered on the dashboard above the URL form, fed by `usageFor()`.
- Free users only: renders nothing when `limit` is null, and nothing until 1 analysis remains.
- Soft amber warning at 2/3; red hard block at 3/3, which also disables the URL form's input and submit
  via the `blocked` prop, so the gate is visible **before** submitting rather than as a 403 after.
- The count is the *effective* one from `usageFor()`, which reads 0 once the monthly window has rolled
  over, so it never shows a stale number from a lapsed period.
- **This is the only place the allowance is shown.** There used to be a second counter on `/billing`;
  it went with that page.

## Screen 1 — "What to test" (`app/(app)/analyses/[id]/page.tsx`)

The analysis experience is split into two screens, single-challenger, one test at a time. There is no
manual "pick a winner" circuit: the AI recommends the challenger (`variants[0]`, the only variant
written during the analysis) and the live test decides the actual winner.

- **Benchmarked-against line**: the competitors (`analyses.competitors`) as links near the top, followed
  by the market the analysis was run in (`analysis.marketNote` + `labels.market.*`). The market is named
  there because it is the only thing that explains the list beside it: detection reads the page, and
  when it reads it wrong the failure surfaces as inexplicably foreign competitors unless the reader can
  see which market was used.
- `MeasuredReadout` (or `MeasurePage`) above the tabs — see [readout.md](readout.md).
- `UpgradePrompt` at the end when `user.plan === 'free'` — see [components.md](components.md).

### Five tabs — `components/analysis-tabs.tsx`, over the `ANALYSIS_TAB` enum

**Flow** (the playbook), **Copy** (the hypotheses), **SEO**, **Found by AI** and **Tests**. `flow` opens
first — fix the structure before testing the wording — and if it is empty the first non-empty tab opens
instead.

- The analysis screen and the public report render the same shell; only the print report stays stacked.
- **Every panel stays mounted and inactive ones are `hidden`**, so switching tabs never remounts
  `TestList` (which would refetch `/api/experiments`) or an already-rendered preview.
- **`tests` never appears on the public report.** That surface passes `tests: 0` and the empty-tab rule
  holds it out. It is also the last tab on purpose: deciding what to change comes before proving it.
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

- The body carries the recommended challenger copy (`variants[0]`) and the **"Why this works"** block.
  The top row carries a coral ring and the "Test this first" flag.
- **No "Set up test" button and no experiment status.** Launching moved to the Tests tab along with the
  snippet, so this list knows nothing about experiments — which is also why it makes no request at all
  any more.

**Sort/filter bar** (`components/hypothesis-filters.tsx`), rendered only once there are
`HYPOTHESIS_FILTER_THRESHOLD` (4) hypotheses — below that it is noise. Sort by impact / effort / quick
wins (`isQuickWin` in `lib/constants.ts`, the same definition the print report's summary cell uses) and
filter by `HYPOTHESIS_TARGET`. Pure client state over rows already loaded — no new request, no URL
params. There is deliberately **no "hide finished"** chip: that is test state, and test state lives one
tab over.

**"Test this first" is tied to the default order.** It renders only under impact sort with no filters
applied; under any other order the first row is the first match, not a recommendation.

### The Tests tab — `components/test-list.tsx`

Everything about running a live test in one place. It used to be split between a snippet card above the
tabs and a button inside every copy idea, which put setup in front of readers who were not testing and
hid it from the ones who were.

- Holds the `EmbedSnippet` card plus one row per **`auto`** hypothesis: section badge,
  `EXPERIMENT_STATUS` pill, impact chip, and the Set up / View test link to Screen 2.
- **Rows are not `DisclosureCard`s.** The ranked lists are things to read and weigh; this is a list of
  things to launch, so each row is one line.
- The tab's count is the number of `auto` hypotheses, so an analysis where every idea is `manual` has
  **no Tests tab and no snippet card** — there would be nothing for the snippet to swap.
- It owns the `GET /api/experiments?analysisId=` fetch that `HypothesisList` used to make. The request
  moved rather than multiplied. A `running` experiment sorts to the top.

## Screen 2 — "Run the test" (`app/(app)/analyses/[id]/tests/[hypothesisId]/page.tsx`)

`components/test-runner.tsx`.

- Shows the control (current copy) and a challenger picker with an editable copy textarea, prefilled
  from the selected variant, plus a 7 / 14 / 30-day duration selector.
- **Challenger pills.** Only the recommendation exists when the screen first opens; it fires
  `POST /api/hypotheses/[id]/variants` on mount, shows a "Writing alternates..." note, and adds Variant
  B and C when they land. **Fail-quiet by design**: the recommendation is already usable and launching
  never waits on the alternates.
- **Conversion goal card.** No longer a picker: it names the one fixed attribute and shows the markup
  to copy. There is nothing to choose and nothing that can drift — see
  [experiments.md](experiments.md#a-conversion-is-one-fixed-attribute-not-a-selector).
- **"Launch test"** -> `POST /api/experiments`. `403 limit_reached` shows an inline upgrade CTA,
  `422 manual_target` explains the idea has to be applied by hand, `409 already_running` surfaces
  `testRunner.alreadyRunning`, and `422 goal_missing` says the attribute is not on the page yet.
- Once an experiment exists (loaded server-side or just launched), the results panel renders in place.
- **A finished test never blocks the next one.** The panel keeps its numbers, but once the experiment is
  no longer `running` a "Run another test" button sits under it and clears the local state back to the
  launch form. Without it the form was unreachable forever after the first stop — contradicting the
  panel's own `noGoal` note telling the reader to stop and relaunch with a goal. The page still loads
  the most recent experiment regardless of status, so the result stays readable; it is the *rendering*
  that stops being terminal, not the query.

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
- **`visibility` is not dead.** It is the single combined section the print report renders, because on
  paper there is nothing to click and the SEO / AI split would only mean two headings.

They render as **separate sections rather than one impact-ranked list**: a founder deciding what to test
first should not have "write a meta description" ranked in among the conversion fixes.

- Per fix: `FlowCategoryBadge`, two `ScoreIndicator`s, the title, the problem, the **"Why" block**
  (`components/why-block.tsx`) and then the `steps` as an `<ol>` numbered `01`-style (`font-mono
  tabular-nums`, the same idiom as `landing.tracks`). Cards carry `break-inside-avoid` because one of
  the three surfaces is a print view.
- **The "Why" comes before the steps, and is a panel rather than a footnote.** It used to be 12px muted
  text under the steps block, with a 9.6px label — readers reported never noticing the reasoning existed
  at all. Do not shrink it back below the copy it explains.
- **There is deliberately no "Set up test" button.** A flow fix changes structure, not one line of text.
  The `InfoHint` on the heading exists to say exactly that; do not add a test action here.
- **Renders `null` when there are no fixes**, so an analysis whose playbook generation failed simply has
  no section. `AnalysisTabs` relies on this.
- **Every fix is a `DisclosureCard`.** `expandFrom` is the index past which they *start* closed — the two
  tabbed surfaces pass `PLAYBOOK_EXPANDED_COUNT` (2), the **print report passes nothing**, so every fix
  starts open. Either way a row can be closed.
- The visibility section's `hint` states the limit of what was measured, per
  [invariants.md](invariants.md#the-audit-measured-the-page-not-the-index).
