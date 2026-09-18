# The analysis screens

## Routes

| Route | Page | Description |
| ----- | ---- | ----------- |
| `/` | Landing | The landing page when signed out, a redirect to the dashboard when signed in |
| `/blog` | Blog index | Three posts |
| `/blog/[slug]` | Blog post | One post, closing on a button to sign in or to the dashboard |
| `/auth/signin` | Auth | Google, and GitHub when configured; returns to `callbackUrl` |
| `/dashboard` | My pages | The monthly quota, the new-analysis form, and a grid of past analyses |
| `/analyses/[id]` | Redirect | Owner-checked, then `redirect('/r/<embedKey>')`. See [report.md](report.md) |
| `/r/[embedKey]` | The analysis | Cover, overall PageSpeed score, then four sections. Public, authorized by the key. See [report.md](report.md) |
| `/dashboard/bulk` | In bulk | Agency and Network only. A textarea of URLs, then the results table |
| `/admin/accounts` | Accounts | Operator only. Sets each account's monthly quota |
| `/settings` | Settings | The agency name and logo its reports carry, and the subscription: the price list when there is none, managing it when there is. Reached from the account menu rather than the nav. See [components.md](components.md#brand-componentsbrand-settings-formtsx-and-componentsreport-brand-marktsx) |
| `/privacy` | Policy | |

**There is one analysis screen, not two.** See [report.md](report.md).

## Landing: `app/(app)/page.tsx`

For an agency that is not a customer yet. The hero, how it works, what each report brings, the AI
visibility section, the testimonial, the price list (`components/landing-pricing.tsx`), the FAQ
(`components/landing-faq.tsx`) and a closing call to action.

- **What the report holds comes before what AI can read.** The PageSpeed score is free from Google
  and the four error lists are not, so leading with the score sells somebody else's product. Inside
  the tile grid the same order holds: the error lists, the client's link and the prospecting tile
  first, the measured tiles after them.
- **Four actions in one hierarchy, and the closing card carries two of them**: WhatsApp through
  `whatsappUrl`, which opens the chat with `actions.whatsappMessage` already written; the sample
  report, which is `sampleReportKey()`, the oldest analysis in this database that actually generated
  something, and absent when there is none; email through `CONTACT_EMAIL_URL`;
  and sign in. `LandingActions` takes `compact` for the closing card, which shows only the first two,
  because four buttons in it read as a menu rather than a call. The price list still adds none of its
  own.
- **The price list is mounted twice, and `/settings` is the half that matters once someone has an
  account.** The landing sends a signed-in reader to the dashboard, so the subscribe buttons there
  are only ever seen by someone without one; `PLANS_PATH` is where everybody else goes, and the
  exhausted-quota line on the dashboard links to it. The account screen shows the list when there is
  no live subscription and the cancel control when there is, never both, and **only `authorized`
  counts as live**: a checkout nobody finished must not read as something already bought.
- **The card form opens in place, under the tier it belongs to.** Which tier is open lives in
  `LandingPricing` so that opening one closes the others, and the form is full width rather than
  squeezed beside a price. It offers no instalments, because a monthly subscription is not a purchase
  to spread over a year, and the provider otherwise refuses to submit until one is chosen.
- **The account screen fills its column**, like every other signed-in screen. The measure is set on
  the form inside the card, not by shrinking the card, because a card capped on its own sits at about
  half the container on a wide display and reads as a bug.
- **The testimonial renders only while `LANDING_TESTIMONIAL` is set**, and its text lives in that
  constant rather than in the dictionaries: it is the one string on the page that is not ours to
  write, and a quote rewritten into another language is a quote nobody said. See
  [i18n.md](i18n.md).
- **A tier's features are copy.** Nothing branches on them, every account sees the same product, and
  the widget line says it is not shipped. See
  [product.md](product.md#what-it-deliberately-does-not-do).
- **The price list reads `PLAN_TIER` and `PLAN`**, so the price and the quota on screen are the ones
  the operator screen offers. It is one panel of rows rather than three cards: the three-column grid
  is already the how-it-works section and the tile grid is already the report section. The
  recommended row is tinted with the same `purple` tokens the `history` tile uses. See
  [product.md](product.md#how-an-account-works).
- **The hero's preview is the report's own `PanelCard` bars**, one per `ANALYSIS_TAB`, each carrying
  its `analysis.sectionQuestions` entry. It shows no score, so nothing on the page is a number a
  reader could take for data.
- **`animate-shine` marks the one surface per half of the page the eye should find first**: the open
  panel in the preview and the recommended row in the price list. The reasoning and the reduced
  motion fallback are in `app/globals.css`.
- `ANALYSIS_SECTION_ICON` lives in `components/analysis-section-icon.ts`, because this server page and
  the client `AnalysisSections` both read it.

## The blog

Two screens under the `(app)` group. The index is three cards over `BLOG_SLUG`; the post is
`components/blog-article.tsx` followed by the other two titles and `components/blog-cta.tsx`.

- `BLOG_SLUG` is the render order, the URL segment and the dictionary key at once.
- **Slugs stay English in both locales**, because the locale is a cookie and the two languages are the
  same URL.

## Dashboard: the My pages screen

`app/(app)/dashboard/page.tsx`.

- **The quota line** reads `quotaFor(user.id)` from the rows on every render and prints how many of
  the month's runs were used and how many are left, a new analysis and every "Run again" alike. An
  account with trial credit left gets a second line saying so, because those do not expire with the
  month. At zero left it adds `quota.none`, which points at the price list, and passes `blocked` to
  the form, which disables it. The route refuses the request anyway; the disabled form is courtesy.
- **`components/analysis-history.tsx`** groups the account's analyses under the client they are
  about, which is the hostname through `groupByClient`: no client table, and nothing to fill in
  before an analysis. Each group header carries that client's pages with the score each one stood at
  before its last run beside it, which is the question the dashboard is for: a single number cannot
  say whether the work is paying off. The full trend stays on the report. A card is one page of
  that site, titled by its path, with the full URL under it, never truncated. The card is a link via
  an `absolute inset-0` overlay; the delete cluster and `CopyReportLink` escape it with
  `relative z-10`.
- **Grouping happens after paging**, so a group holds what is on this page rather than everything
  ever run for that client.
- **Empty state** when there are no analyses yet.

## In bulk: `app/(app)/dashboard/bulk/page.tsx`

A textarea of URLs, one per line, then a table of what each one found.

- **`notFound()` for a tier without it**, the same answer `/admin/accounts` gives someone without the
  role: a page explaining what you cannot reach is an invitation to try it. See
  [invariants.md](invariants.md#entitlement-is-the-stored-tier-checked-at-the-boundary).
- **The count under the form is read with the same `parseBulkUrls` the route uses**, so what the
  reader is told they are about to spend is what they are charged.
- **The table is every number the report already carries**: the PageSpeed score, the count of errors
  `severityForImpact` calls critical, and the top error's own `business_impact` as the main problem.
  Nothing here summarises anything. A page PageSpeed could not measure shows a dash and never a zero,
  and a failed row says so instead of showing the run before it.
- **`useBatchPoll` refreshes the rows while they are still running** and stops when they settle, the
  same shape as `useAnalysisPoll` and for the same reason.
- The CSV button appears once the batch is finished.
- **The navbar carries the notice, not this page.** A batch finishes long after whoever queued it has
  moved on, so `unreadBatch` puts a word beside the nav link and opening the table clears it. The
  query runs only for an account whose tier has the feature.

### Paging

`listAnalysesForUser` returns ten a page, and the page comes from `?page=`. The steps say **Newer and
Older**, pass `scroll={false}` so the viewport stays under the button, and render nothing at one page.
A page past the end is clamped to the last one. `e2e/pagination.spec.ts` holds the scroll regression.

### URL input form: `components/url-input-form.tsx`

- The page URL and an optional **comparison URL**. Both are validated client-side; each field owns its
  own error, tied to it by `aria-describedby`.
- **Input and button share a row only when the form's own box can hold both**, which is a
  `@container` query rather than a viewport breakpoint.
- While pending: `AnalysisProgress`, the same piece the report waits with, in its `inline` shape. The
  form polls `GET /api/analyses?embedKey=` and navigates as soon as the page is **measured**, rather
  than waiting for the error lists.
- **The screen exists only once there is a run to read.** Between the submit and the route's answer
  there is no embed key and so nothing to poll, and that gap shows one line of text.
- Errors map from the route's statuses: `403` quota, `429` rate limit, `422` URL, `502` scrape, `503`
  queue. **Nothing here narrates a phase it cannot see**: every line the screen ticks was recorded by
  the run. See [report.md](report.md#the-wait).

## Admin: `/admin/accounts`

`app/(app)/admin/accounts/page.tsx`, `components/set-quota-form.tsx`, `lib/actions/accounts.ts`.

A form taking an address and a number of analyses per month, and the list of accounts with a quota and
how many they used this month. The address does not need to have signed in: `setQuota` creates the row.
The quota is bounded by `ADMIN_QUOTA_MAX` in the action's schema, so an extra digit is refused. See
[security.md](security.md) for the three checks behind the screen.

**One button per tier writes that tier's quota into the field**, read from the same `PLAN` the landing
page prints, so the number an agency was sold and the number typed here cannot drift. The field still
takes any number up to `ADMIN_QUOTA_MAX`: what an account is owed is an agreement rather than an enum.

## The analysis screen

See [report.md](report.md) for the page, the states and `isOwner`, and [readout.md](readout.md) for the
PageSpeed section.

### Four sections: `components/analysis-sections.tsx`, over the `ANALYSIS_TAB` enum

**AI**, **SEO**, **Structure** and **Copy**, in that order, stacked, each one a `PanelCard`. AI comes
first because it is what the product is for. The first section opens and the rest start closed, so
more than one can be open at a time.

Each panel opens with a direct question from `analysis.sectionQuestions[tab]`, then what was measured
on its theme, then the errors. See
[invariants.md](invariants.md#a-section-shows-the-audits-its-errors-were-written-from).

**One heading per section, and the card's bar is not one of them.** The bar names the theme and the
question is the only title inside it. There used to be a third: a header over the list repeating the
theme as an eyebrow and adding a second `<h2>`, which is what a reader met three times before getting
to the first error. What that header carried that the question does not is now on the question's own
row: `analysis.sectionHints[tab]` as an `InfoHint` beside it, and `ImpactLegend` at the end of the
row, **only once something has been written**, because the legend explains a score that does not
exist yet while the lists are being generated.

**A section renders when it has errors or something measured.** All four render while the lists are
being written, each with a placeholder where its list goes. The count on the bar is absent until
something has been generated, because a zero would read as a clean section.

`seo` and `ai` are the same rows cut by category; see [data-model.md](data-model.md).

**The measurement and the list are each wrapped in a `<div>` of their own**, which makes each an only
child rather than a keyless array member when it crosses from the server page into the client
component.

The hints are keyed by tab beside the questions, rather than beside `flow`/`seo`/`ai`, because the
copy section has no entry among those three: they are `PLAYBOOK_SECTION` values reached through
`dictionary[section]` and the copy list is not one. The landing's `ReportOutline` prints the same four
bodies, which is why all four exist rather than three plus a special case.

### The copy errors: `components/hypothesis-list.tsx`

Ranked by impact and nothing else. **Every row is a `HypothesisCard`**, and the first
`HYPOTHESIS_EXPANDED_COUNT` start open.

**An open card is the error.** The title is `problem`; the body quotes `current_copy` exactly as the
page carries it, then a **Why this is an error** drawer holding `assessment` (labelled) and
`rationale`. Nothing proposes a replacement.

### Nothing shows an effort score, anywhere

`ScoreIndicator` renders **impact only**. A model that has read one page cannot know what fixing an
error costs on somebody else's stack.

### The structure, SEO and AI errors: `components/flow-playbook.tsx`

**Three lists, one component.** `section` (`PLAYBOOK_SECTION`) selects the dictionary subtree and the
`data-testid` and nothing else.

- `dictionary.flow`, `.seo` and `.ai` mirror each other key for key.
- Test ids are `${section}-playbook` and `${section}-fix`, so no two families are counted as one.
- Per error: `FlowCategoryBadge`, the impact rail, the title, the problem sentence, a **Why** drawer
  holding `evidence`. **There are no steps.**
- Renders `null` when there are no errors. Every card is a `DisclosureCard`; the first
  `PLAYBOOK_EXPANDED_COUNT` start open.
