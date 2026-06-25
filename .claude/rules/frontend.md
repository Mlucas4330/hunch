## Pages

| Route            | Page                | Description                                          |
| ---------------- | ------------------- | ---------------------------------------------------- |
| `/`              | Landing page        | Marketing, pricing tiers, CTA, social proof          |
| `/auth/signin`   | Auth page           | Google OAuth sign in via NextAuth                    |
| `/dashboard`     | Dashboard / history | List of past analyses, "New analysis" button         |
| `/analyses/[id]` | Analysis detail     | Full hypothesis breakdown for one analysis           |
| `/billing`       | Billing / upgrade   | Stripe checkout trigger, plan display, usage counter |

## Shared layout components

### Navbar

- Logo, nav links, user avatar dropdown, current plan badge
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

### Analysis loader

- Skeleton cards shown while `POST /api/analyses` is pending
- Three-phase progress label: "Scraping page..." -> "Analyzing copy..." -> "Saving results..."

### Hypothesis card

The most important component in the product. Displays:

- Section badge (colored pill from `SECTIONS` enum)
- Problem statement
- Current copy vs variant copy - side by side layout
- Impact score + effort score indicators (1-10)
- Rationale text
- Status selector: `pending | testing | completed | skipped` (calls `PATCH /api/hypotheses/[id]`)

### Section badge

- Colored pill mapped to each `SECTIONS` enum value
- Used inside hypothesis cards and as a filter chip
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

### Sort / filter bar

- Sort: by impact score (default, descending) or effort score
- Filter: by `SECTIONS` enum value or `HYPOTHESIS_STATUS` enum value
- Client-side only - no additional API calls

## Billing components

### Plan card

- Displays free / solo / team tiers
- Features list per tier
- CTA button triggers `POST /api/billing/checkout`

### Usage counter

- "2 of 3 analyses used this month"
- Pulls from `GET /api/usage`
- Only visible to free tier users
