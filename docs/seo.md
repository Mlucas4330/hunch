# SEO and metadata

`pageMetadata()` in `lib/seo.ts` builds every route's metadata, so the shape cannot drift per page.
**There is no default that quietly makes a page indexable.**

- Titles and descriptions live under `dictionary.metadata.pages.*`. The `%s | Hunch` title template
  stays in code.
- `metadataBase` is set once, in `app/layout.tsx`, from `siteOrigin()` (`lib/app-url.ts`), so
  **`NEXT_PUBLIC_APP_URL` is load-bearing in production.** Canonical URLs, OG URLs and the sitemap are
  built from it, never from the `Host` header.

## Indexability

**The indexable routes are `/`, `/blog`, the posts and `/privacy`**, and they are exactly the entries
in `app/sitemap.ts`. Everything else passes `index: false`. `/` renders the landing page for a
signed-out visitor and redirects a signed-in one, so a crawler, which carries no session, always gets
the landing page.

**The landing FAQ's `FAQPage` JSON-LD is built from the same array the page renders**, in
`components/landing-faq.tsx`, so the answer a reader opens and the one a crawler quotes cannot drift.
`app/robots.ts` disallows the same prefixes, importing `PROTECTED_PREFIXES` from `lib/constants.ts`.

**The sitemap is derived from `BLOG_SLUG`, never listed by hand.** `lastModified` for a post comes from
`BLOG_POST_DATE` and for the policy from `PRIVACY_UPDATED`, real dates rather than `new Date()`.

**A post's title and description are the post's own `title` and `excerpt`**, so the index card, the
browser tab and the unfurl describe the post one way.

The report is `noindex` but carries a **full, per-report Open Graph card**, because it is pasted into
email and chat. **An unknown embed key produces the same card shape as a real one.**

## Self-canonical, no hreflang

The locale is a cookie with no route segment, so `en` and `pt-BR` are genuinely the same URL.
**Do not add hreflang without first giving the locales real URLs.**

## Open Graph images

- `app/opengraph-image.tsx` is the site-wide card; `app/(report)/r/[embedKey]/opengraph-image.tsx`
  renders the host, the error count and the PageSpeed score.
- **A page that sets its own `openGraph` replaces the root layout's entirely**, which is why
  `pageMetadata` names `DEFAULT_OG_IMAGE_PATH` by hand and why only a route with a co-located
  `opengraph-image.tsx` passes `ownImage: true`.
- Satori parses neither `oklch()` nor a CSS variable, so `components/og.tsx` uses inline styles over
  `OG_COLORS`, **the one place hex values are legitimate**.
- The images resolve their dictionary with `dictionaryFor(DEFAULT_LOCALE)`: unfurlers send no cookies.

## There is no agency branding in metadata

`pageMetadata()` always says `Hunch`, and `OgWordmark` is the only mark `components/og.tsx` draws.
