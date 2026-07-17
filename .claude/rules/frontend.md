## Pages

| Route            | Page                | Description                                          |
| ---------------- | ------------------- | ---------------------------------------------------- |
| `/`              | Home                | Minimal hero + a single CTA into the app             |
| `/auth/signin`   | Auth page           | Google OAuth (and admin credentials) via NextAuth    |
| `/dashboard`     | Dashboard / history | URL input form + list of past analyses               |
| `/analyses/[id]` | What to test        | Ranked hypotheses with the recommended challenger    |
| `/analyses/[id]/report` | Report       | Clean, printable summary of the ranked hypotheses    |

## Shared layout components

### Navbar

- Logo, a `Dashboard` nav link, and an account menu (`components/account-menu.tsx`)
- Account menu: native `<details>` dropdown with the avatar/name as the summary; the panel shows
  name, email, and a `Sign out` button (server action calling `signOut`)

### Empty state

- Shown on dashboard when the user has no analyses yet
- Single CTA to paste a landing page URL above

## Core feature components

### URL input form (`components/url-input-form.tsx`)

- Single text input + submit button; validates URL format client-side before submitting
- Disables submit while analysis is in progress, with a phased progress label
  ("Scraping your page..." -> "Researching competitors..." -> "Writing your test ideas..." ->
  "Saving results...")
- A collapsible `<details>` "Add business details (optional)" textarea (prefilled from the user's
  most recent analysis `brief`), sent as `brief` so copy comes back finished
- A collapsible "Competitor mode" `<details>` with up to 3 competitor URL inputs (sent as
  `competitorUrls`); leave blank to auto-search competitors

### What to test (`app/(app)/analyses/[id]/page.tsx` + `components/hypothesis-list.tsx`)

- A "Benchmarked against" line: the competitors (`analyses.competitors`) rendered as links near the
  top.
- A ranked list of read-only hypothesis cards (impact desc). Each: section badge, the problem,
  impact/effort `ScoreIndicator`s, the recommended challenger copy (`variants[0]`), and the
  rationale. The top card is flagged "Test this first."
- A "Report" button links to the printable report at `/analyses/[id]/report`.

### Section badge

- Colored pill mapped to each `SECTIONS` enum value, used inside the hypothesis cards and report
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
