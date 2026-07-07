## Pages

| Route            | Page                | Description                                          |
| ---------------- | ------------------- | ---------------------------------------------------- |
| `/`              | Landing page        | Marketing, pricing tiers, CTA, social proof          |
| `/auth/signin`   | Auth page           | Google OAuth sign in via NextAuth                    |
| `/dashboard`     | Dashboard / history | List of past analyses, "New analysis" button         |
| `/analyses/[id]` | What to test        | Ranked hypotheses, recommended challenger, install snippet |
| `/analyses/[id]/tests/[hypothesisId]` | Run a test | Approve/swap/edit the challenger, launch, monitor results |
| `/billing`       | Billing / upgrade   | Stripe checkout trigger, plan display, usage counter |

## Shared layout components

### Navbar

- Logo, nav links, and an account menu (`components/account-menu.tsx`)
- Account menu: native `<details>` dropdown with the avatar/name as the summary; the panel shows
  name, email, the plan badge, and a `Sign out` button (server action calling `signOut`)
- Plan badge maps `SUBSCRIPTION_PLAN` enum to a colored pill: free = gray, solo = purple, team = amber

### Usage gate banner

- Shown to free users at 2/3 or 3/3 analyses used
- Soft warning at 2/3, hard block with upgrade CTA at 3/3

### Empty state

- Shown on dashboard when user has no analyses yet
- Single CTA: "Analyze your first landing page"

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
- Three-phase progress label: "Scraping page..." -> "Analyzing copy..." -> "Saving results..."

### Two-screen flow: what to test -> run a test

The analysis experience is split into two screens (single-challenger, one test at a time). There is
no manual "pick a winner" circuit: the AI recommends the challenger (variants ordered strongest-first,
so `variants[0]` is the recommendation) and the live test decides the actual winner.

**Screen 1 - "What to test"** (`app/analyses/[id]/page.tsx` + `components/hypothesis-list.tsx`):

- Benchmarked-against line: the competitors (`analyses.competitors`) rendered as links near the top.
- A one-time **Install snippet** card (`components/embed-snippet.tsx`) at the top - site-level setup.
- A ranked list of hypothesis cards (impact desc). Each: section badge, the problem, impact/effort
  `ScoreIndicator`s, the recommended challenger copy (`variants[0]`), and a **"Set up test"** button
  linking to Screen 2 (`/analyses/[id]/tests/[hypothesisId]`). The top card is flagged
  "Test this first."
- The list fetches the analysis's experiments (`GET /api/experiments?analysisId=`); a hypothesis that
  already has a test shows its `EXPERIMENT_STATUS` badge and a **"View test"** button instead.

**Screen 2 - "Run the test"** (`app/analyses/[id]/tests/[hypothesisId]/page.tsx` +
`components/test-runner.tsx`):

- Shows the control (current copy) and a challenger picker: the 3 variants as pills (recommended
  preselected) with an editable copy textarea (prefilled from the selected variant), plus a
  7 / 14 / 30-day duration selector.
- **"Launch test"** -> `POST /api/experiments { hypothesisId, variantId, variantCopy, durationDays }`.
  On `403 limit_reached` (a test already running) it shows an inline upgrade CTA.
- Once an experiment exists (loaded server-side or just launched), it renders the experiment results
  panel in place.

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
  Copy report / Download .md built by `buildReportMarkdown` in `lib/export.ts`.
- Experiment status -> pill color: `running` -> amber, `completed` -> green, `stopped` -> gray
  (from `EXPERIMENT_STATUS_BADGE_CLASS`).

## Billing components

### Plan card

- Displays free / solo / team tiers
- Features list per tier
- CTA button triggers `POST /api/billing/checkout`

### Usage counter

- "2 of 3 analyses used this month"
- Pulls from `GET /api/usage`
- Only visible to free tier users
