# The analysis screens

## Routes

| Route | Page | Description |
| ----- | ---- | ----------- |
| `/` | Landing page | Credibility surface for a human-led sale: two tracks, contact form, **no prices** |
| `/auth/signin` | Auth | Google OAuth via NextAuth, plus Microsoft Entra ID where it is configured; returns to `callbackUrl` |
| `/dashboard` | Clients | Grid of past analyses, one card per client, above the new-analysis form |
| `/analyses/[id]` | What to test | The two deliverables, then four tabs: flow, copy, SEO, found-by-AI |
| `/analyses/[id]/tests` | Live A/B tests | The snippet plus one row per testable idea — **stage 2, reached from the client card** |
| `/analyses/[id]/tests/[hypothesisId]` | Live A/B test | Approve/swap/edit the challenger, set the goal, launch, monitor |
| `/analyses/[id]/report` | Print report | One stacked page, owner-authenticated — see [report.md](report.md) |
| `/r/[embedKey]` | Public report | Two shapes by owner plan. No session — see [report.md](report.md) |
| `/admin/leads` | Waitlist leads | Operator-only (`users.role`); the only place waitlist rows can be read |
| `/admin/reports` | Report opens | Operator-only; open count and last open per analysis — see [report.md](report.md) |
| `/admin/accounts` | Accounts | Operator-only; grant or revoke a plan by email, and see which granted rows have never signed in |

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
- The value cards (`landing.proof`) cover one benefit each: measured-not-asserted, the idea arriving
  testable, and yours-to-send. **Never let all three be about live testing again.**
- **`pt-BR` argues a different case than `en`**, per
  [i18n.md](i18n.md#pt-br-is-a-rewrite-not-a-translation). The English page sells the report; the
  Portuguese one sells the loop, because the Brazilian reader is already surrounded by tools that hand
  out test ideas and by none that close them. The loop lands in exactly three places — the hero, the
  second pain (*Sua entrega termina na ideia*), and the second value card — and it lands as a
  **verdict**, never as a promised lift. The keys are identical either way; only the argument differs.
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
  `report-deliverables.tsx`: the accessible name is `aria-label` on the button, the icon is
  `aria-hidden`. No new dictionary keys; `common.delete` / `common.deleting` / `common.cancel` are the
  labels.
- The whole card is a link via an `absolute inset-0` overlay, so the action cluster escapes it with
  `relative z-10`.
- The footer also carries `ReportDeliverables variant="compact"` — the copy-link and PDF actions in
  labelled form, so the two documents are discoverable before an analysis is opened. It escapes the
  overlay the same way. See [report.md](report.md#report-deliverables--componentsreport-deliverablestsx).
- **The third action in that cluster is `Tests`**, and it is the only way into `/analyses/[id]/tests` —
  see
  [invariants.md](invariants.md#stage-2-is-reached-from-the-client-never-from-the-analysis).
  The card is where the two halves of the job are peers: one document you can send today, one stage you
  reach once you have access to their site. It is deliberately **not** a document, which is why it
  exists only in the compact variant.
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

The analysis experience is three screens, and the split follows the two stages in
[product.md](product.md): **this one needs nothing but the URL**, screens 2 and 3 need access to the
client's site. Single-challenger, one test at a time. There is no manual "pick a winner" circuit: the AI
recommends the challenger (`variants[0]`, the only variant written during the analysis) and the live
test decides the actual winner.

- **Benchmarked-against line**: the competitors (`analyses.competitors`) as links near the top, followed
  by the market the analysis was run in (`analysis.marketNote` + `labels.market.*`). The market is named
  there because it is the only thing that explains the list beside it: detection reads the page, and
  when it reads it wrong the failure surfaces as inexplicably foreign competitors unless the reader can
  see which market was used.
- **The deliverables block** (`components/report-deliverables.tsx`) sits between that line and the
  readout: the two documents this analysis produces, each named and described rather than left as an
  unlabelled button. It is out of the header row on purpose — a control small enough to sit beside
  `Back to clients` is a control a first-time reader never presses. See
  [report.md](report.md#report-deliverables--componentsreport-deliverablestsx).
- `MeasuredReadout` above the tabs, with the score, the trend, the findings, the keyword table and the
  comparison — plus `MeasurePage variant="again"` beneath it. An analysis with nothing measured shows
  `MeasurePage` alone instead. Both are owner-only; the reports render `MeasuredReadout` by itself. See
  [readout.md](readout.md).
- `UpgradePrompt` at the end when `user.plan === 'free'` — see [components.md](components.md).

### Four tabs — `components/analysis-tabs.tsx`, over the `ANALYSIS_TAB` enum

**Page structure** (the playbook), **Wording** (the hypotheses), **Search visibility** and **AI
visibility**. `flow` opens first — fix the structure before testing the wording — and if it is empty the
first non-empty tab opens instead.

**Every tab here is about what to change, and every one of them needs nothing but the URL.** There used
to be a fifth, `tests`, and it was the mistake this shell exists without now: the one step that requires
access to the client's site sat as a peer of four that require nothing, which is the two stages in
[product.md](product.md) presented as one. Running a test is its own screen.

Two workarounds went with it, and their absence is the point:

- `counts.tests = testable.length`, feeding a shared shell a number that meant something on only one of
  the two surfaces rendering it.
- the public report's `tests: 0` / `tests: null` pair, which existed solely to hold out of a report a tab
  that is now nowhere shared. **A prospect reading a teardown was never going to install a snippet**, and
  that is now true by construction rather than by a zero passed in.

The labels are written for the client's business owner, not for a developer — see
[report.md](report.md#the-cover--componentsreport-covertsx). **Only the labels changed**; the enum values
are persisted in Postgres.

- The analysis screen and the public report render the same shell; only the print report stays stacked.
- **Every panel stays mounted and inactive ones are `hidden`**, so switching tabs never remounts an
  already-rendered preview.
- **An empty tab is not rendered.** `FlowPlaybook` returns `null` for an empty list, so the shell
  computes emptiness itself. This is the normal case for analyses generated before the visibility audit
  existed: their rows are all `flow`, so SEO and AI are genuinely empty.
- `seo` and `ai` are the same rows cut by category — see [data-model.md](data-model.md).

### No entry to stage 2

Nothing on this screen mentions running a test. There used to be a `NextStage` callout below the tabs
and it is gone: the entry moved to the client card, per
[invariants.md](invariants.md#stage-2-is-reached-from-the-client-never-from-the-analysis).
This screen is the thing a prospect is allowed to read, and asking that reader to install a script tag
was the last place the two stages still touched.

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
  on a page with four headings. The report and the print report always showed both; this is the
  screen catching up, and it reuses their `report.current` keys rather than minting a second wording
  for the same idea.
- That block holds **two different things**, and they are marked apart on purpose: `rationale` argues
  the CRO mechanism, while the variant's `evidence` is the line that names a competitor and the
  strategy it borrows. The evidence paragraph carries a teal `panel-label` prefix
  (`hypothesisList.competitorEvidence`), the same idiom the landing hero mock uses. Unprefixed, the two
  read as one undifferentiated paragraph and the competitor grounding — the most expensive part of the
  pipeline to produce — lands as generic reasoning. Marking it is the whole fix: **nothing new is
  generated about the competitor**, which would be forbidden on the auto-search path where no
  competitor page was ever opened.
- **No "Set up test" button and no experiment status.** Launching moved to the live-test screen along
  with the snippet, so this list knows nothing about experiments — which is also why it makes no request
  at all any more.

### Why a copy hypothesis shows impact but no effort

`ScoreIndicator` renders **impact only** here. It still renders both on a flow fix, and that asymmetry
is the point.

The copy prompt requires every hypothesis to be a single-element text swap
(`lib/ai/prompt.ts:106-110`) — structural ideas are forbidden and become flow fixes — and the snippet
applies the swap with no deploy. So implementation cost is a constant on this tab, and the prompt never
defined `effort_score` for it either (only the flow-fix prompt does, where the cost genuinely varies
because a person applies it by hand). The number the model wrote there was measuring nothing.

The one real cost difference on a copy hypothesis is **auto vs manual**, and code decides it after
generation: `resolveTarget` (`lib/scrape.ts`) matches `current_copy` against the scraped elements and
persists the verdict to `hypotheses.target`. The model could not have known it. That fact is already
carried by the *Manual setup* badge, which is now its single carrier.

`effort_score` is still generated and still stored for hypotheses — dropping it would mean making a
`notNull` column nullable — it is simply never shown. Not a bug; see [ai-pipeline.md](ai-pipeline.md).

**There is no sort/filter bar.** With effort and quick wins gone, sorting collapsed to impact alone,
and the auto/manual filter was removed with it — the badge says the same thing without a control. The
list is impact descending, fixed. There was deliberately never a "hide finished" chip either: that is
test state, and test state lives one tab over.

**"Test this first" is tied to the default order.** It renders only under impact sort with no filters
applied; under any other order the first row is the first match, not a recommendation.

## Screen 2 — "Live A/B tests" (`app/(app)/analyses/[id]/tests/page.tsx`)

`components/test-list.tsx`. **Stage 2 — everything that needs access to the client's site, and nothing
that does not.**

The route is the parent of `tests/[hypothesisId]`, which existed on its own for a long time while its
parent was rendered as a tab inside Screen 1. Filling that hole is the whole move; `TestList` itself
arrived unchanged, since it already carried its own heading and `InfoHint`.

- Holds the `EmbedSnippet` card plus one row per **`auto`** hypothesis: section badge,
  `EXPERIMENT_STATUS` pill, impact chip, and the Set up / View test link to Screen 3.
- **Rows are not `DisclosureCard`s.** The ranked lists are things to read and weigh; this is a list of
  things to launch, so each row is one line.
- An analysis where every idea is `manual` still **renders the screen**, with `testList.empty` in place
  of the rows — there is nothing for the snippet to swap and the reader is told so. `ExampleTest` sits
  beneath that line: the reader who lands here has no test to look at, and telling them what one looks
  like is the only thing this screen can still do for them. See
  [components.md](components.md#example-test--componentsexample-testtsx).
- It owns the `GET /api/experiments?analysisId=` fetch that `HypothesisList` used to make. The request
  moved rather than multiplied. A `running` experiment sorts to the top.
- The page query selects `hypotheses` only. It renders no readout, no playbook and no report action:
  this screen is not a second copy of the analysis.

## Screen 3 — "Live A/B test" (`app/(app)/analyses/[id]/tests/[hypothesisId]/page.tsx`)

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
- **`ExampleTest` closes the launch form**, so the reader can see what launching produces before
  deciding to. It needs no condition of its own: `TestRunner` renders `LaunchForm` only while no
  experiment exists, so the example is gone the moment a real panel is there — and the two never show
  together, which is what would make a mock ambiguous. See
  [components.md](components.md#example-test--componentsexample-testtsx).
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
