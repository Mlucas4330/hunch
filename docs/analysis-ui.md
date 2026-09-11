# The analysis screens

## Routes

| Route | Page | Description |
| ----- | ---- | ----------- |
| `/` | Redirect | Sign in when signed out, the dashboard when signed in. There is no landing page |
| `/blog` | Blog index | Three posts |
| `/blog/[slug]` | Blog post | One post, closing on a button to sign in or to the dashboard |
| `/auth/signin` | Auth | Google, and GitHub when configured; returns to `callbackUrl` |
| `/dashboard` | My pages | The monthly quota, the new-analysis form, and a grid of past analyses |
| `/analyses/[id]` | Redirect | Owner-checked, then `redirect('/r/<embedKey>')`. See [report.md](report.md) |
| `/r/[embedKey]` | The analysis | Cover, overall PageSpeed score, then four sections. Public, authorized by the key. See [report.md](report.md) |
| `/admin/accounts` | Accounts | Operator only. Sets each account's monthly quota |
| `/privacy` | Policy | |

**There is one analysis screen, not two.** See [report.md](report.md).

## The blog

Two screens under the `(app)` group. The index is three cards over `BLOG_SLUG`; the post is
`components/blog-article.tsx` followed by the other two titles and `components/blog-cta.tsx`.

- `BLOG_SLUG` is the render order, the URL segment and the dictionary key at once.
- **Slugs stay English in both locales**, because the locale is a cookie and the two languages are the
  same URL.

## Dashboard: the My pages screen

`app/(app)/dashboard/page.tsx`.

- **The quota line** reads `quotaFor(user.id)` from the rows on every render and prints how many of
  the month's runs were used, a new analysis and every "Run again" alike. At zero left it adds `quota.none` and passes `blocked` to the form,
  which disables it. The route refuses the request anyway; the disabled form is courtesy.
- **`components/analysis-history.tsx`** lists the account's analyses, one card each, named by
  `displayHost()` with the full URL under it, never truncated. The card is a link via an
  `absolute inset-0` overlay; the delete cluster and `CopyReportLink` escape it with `relative z-10`.
- **Empty state** when there are no analyses yet.

### Paging

`listAnalysesForUser` returns ten a page, and the page comes from `?page=`. The steps say **Newer and
Older**, pass `scroll={false}` so the viewport stays under the button, and render nothing at one page.
A page past the end is clamped to the last one. `e2e/pagination.spec.ts` holds the scroll regression.

### URL input form: `components/url-input-form.tsx`

- The page URL and an optional **comparison URL**. Both are validated client-side; each field owns its
  own error, tied to it by `aria-describedby`.
- **Input and button share a row only when the form's own box can hold both**, which is a
  `@container` query rather than a viewport breakpoint.
- While pending: one label and a running clock. The form polls `GET /api/analyses?embedKey=` and
  navigates as soon as the page is **measured**, rather than waiting for the error lists.
- Errors map from the route's statuses: `403` quota, `429` rate limit, `422` URL, `502` scrape, `503`
  queue. **Nothing here narrates a phase**: the elapsed counter measures a real clock.

## Admin: `/admin/accounts`

`app/(app)/admin/accounts/page.tsx`, `components/set-quota-form.tsx`, `lib/actions/accounts.ts`.

A form taking an address and a number of analyses per month, and the list of accounts with a quota and
how many they used this month. The address does not need to have signed in: `setQuota` creates the row.
The quota is bounded by `ADMIN_QUOTA_MAX` in the action's schema, so an extra digit is refused. See
[security.md](security.md) for the three checks behind the screen.

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

**A section renders when it has errors or something measured.** All four render while the lists are
being written, each with a placeholder where its list goes. The count on the bar is absent until
something has been generated, because a zero would read as a clean section.

`seo` and `ai` are the same rows cut by category; see [data-model.md](data-model.md).

**The measurement and the list are each wrapped in a `<div>` of their own**, which makes each an only
child rather than a keyless array member when it crosses from the server page into the client
component.

### The header over a list: `components/ranked-list-header.tsx`

Eyebrow, title, the section's `InfoHint`, and the impact legend. The copy list's strings live in
`hypothesisList`, not beside `flow`/`seo`/`ai`, because those three are `PLAYBOOK_SECTION` values
reached through `dictionary[section]`.

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
