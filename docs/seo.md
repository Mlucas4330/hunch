# SEO and metadata

`pageMetadata()` in `lib/seo.ts` builds every route's metadata, so the shape cannot drift per page. A
new page declares its own `generateMetadata` calling it — **there is no default that quietly makes a
page indexable**.

- Titles and descriptions live under `dictionary.metadata.pages.*`, like every other string. The
  `%s | Hunch` title template stays in code: Next's `%s` is not a `{token}`, so a translator only gets
  the site name.
- `metadataBase` is set once, in `app/layout.tsx`, from `siteOrigin()` (`lib/app-url.ts`). It is what
  turns each page's `path` into an absolute canonical and `og:url`, so **`NEXT_PUBLIC_APP_URL` is
  load-bearing in production** — canonical URLs, OG URLs and the sitemap are all built from it, never
  from the caller-controlled `Host` header.

## Indexability

**The indexable routes are `/`, `/blog`, the posts and `/privacy`**, and they are exactly the entries in
`app/sitemap.ts`. Everything else passes `index: false`. `app/robots.ts` disallows the same prefixes,
importing `PROTECTED_PREFIXES` from `lib/constants.ts` so it can never drift from `middleware.ts`.

`/` used to be the only one. The blog was added as a destination for paid traffic that explains a
concept before asking for a URL, and a page written to be read by strangers is a page there is no
reason to hide from a crawler.

**The sitemap is derived from `BLOG_SLUG`, never listed by hand**, so a post added to the enum cannot
be published without an entry -- and cannot be published at all until it is written in both
dictionaries, because the slug is the dictionary key. `lastModified` for a post comes from
`BLOG_POST_DATE`, which is a real publication date rather than `new Date()`: a sitemap claiming every
post changed today is a sitemap saying nothing.

`/privacy` is indexable for the same reason the blog is: it is written to be read by a stranger
deciding whether to paste a URL, and a policy nobody can find answers nobody. Its `lastModified` is
`PRIVACY_UPDATED` rather than `new Date()`, on the same reasoning as `BLOG_POST_DATE`.

**A post's title and description are the post's own `title` and `excerpt`**, not a separate
`metadata.pages.*` entry. They are still dictionary strings, and keeping them as one string means the
card in the index, the browser tab and the unfurl cannot describe the post three different ways.
`metadata.pages.blog` exists for the index page, which has no post to borrow from.

Posts carry no `opengraph-image.tsx`, so they unfurl with the site-wide card. A per-post card would
be the same `next/og` work the report already does -- worth doing when a post is actually being
shared, not before.

The public report is `noindex` but carries a **full, per-report Open Graph card**: it is pasted into
cold email and DMs, where the unfurl is the whole first impression. **An unknown embed key must produce
the same card shape as a real one** rather than reveal that it does not exist.

## Self-canonical, no hreflang

The locale is a cookie with no route segment, so `en` and `pt-BR` are genuinely the same URL. Claiming
`alternates.languages` would be a lie to crawlers; the cookie-less render (`DEFAULT_LOCALE`) is what
gets indexed. **Do not add hreflang without first giving the locales real URLs.**

## The one piece of structured data — `FAQPage`

`components/landing-faq.tsx` emits `FAQPage` JSON-LD on `/`, and it is **generated from
`dictionary.landing.faq.items`**, the same array the visible rows render from. Written out by hand
beside them it would drift the first time an answer was edited, and structured data that disagrees
with the page it describes is worse than none.

It follows the cookie locale like everything else here, so the indexed copy is the `DEFAULT_LOCALE`
one, per the section above.

**The component has no `'use client'`, and that is what puts the schema and every answer in the
initial HTML.** The section became a two-column layout and the rows stayed native `<details>`
precisely so this stayed true — an accordion driven by `useState` would ship the questions and leave
the answers to hydration, and a crawler that does not run the bundle would index a page of headings.
The `<script>` is a sibling of the grid rather than a child of it; that is a readability call, not a
behavioural one, since `script` lays out nothing either way.

The same rule the rest of the product runs on applies to the answers: a question may say what the
product counts and what a credit buys, and may not answer with a lift, a benchmark or a conversion
figure. The last item exists to say that out loud. See [invariants.md](invariants.md).

## Open Graph images

- `app/opengraph-image.tsx` is the site-wide card; `app/(report)/r/[embedKey]/opengraph-image.tsx`
  renders a per-report one (analyzed host, test count, top impact). Both use `next/og`, so there is no
  binary asset in the repo and no new dependency.
- **A page that sets its own `openGraph` replaces the root layout's entirely**, taking the
  file-convention image with it. That is why `pageMetadata` names `DEFAULT_OG_IMAGE_PATH` by hand and
  why only a route with a co-located `opengraph-image.tsx` passes `ownImage: true`.
- Satori parses neither `oklch()` nor a CSS variable, so the OG components in `components/og.tsx` use
  inline styles over `OG_COLORS` — **the one place hex values are legitimate**. Keep them in step with
  the tokens in `app/globals.css`. Every element needs an explicit `display`.
- The images resolve their dictionary with `dictionaryFor(DEFAULT_LOCALE)`, not `getDictionary()`:
  unfurlers send no cookies, and avoiding the cookie read keeps the site-wide card static.

## There is no white-label in metadata any more

`pageMetadata()` used to take `unbranded` and `brandName`, because a browser prints the `<title>`
into a printed page header and `openGraph.siteName` rides every unfurl — the two places our name
reached a reader without being on the page. Both went with the brand columns, so the helper now takes
only `ownImage` and always says `Hunch`.

`components/og.tsx` lost `OgBrandName` for the same reason; `OgWordmark` is the only mark left.
