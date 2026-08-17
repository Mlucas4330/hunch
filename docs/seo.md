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

**`/` is the only indexable route**, and the only entry in `app/sitemap.ts`. Everything else passes
`index: false`. `app/robots.ts` disallows the same prefixes, importing `PROTECTED_PREFIXES` from
`lib/constants.ts` so it can never drift from `middleware.ts`.

The public report is `noindex` but carries a **full, per-report Open Graph card**: it is pasted into
cold email and DMs, where the unfurl is the whole first impression. **An unknown embed key must produce
the same card shape as a real one** rather than reveal that it does not exist.

## Self-canonical, no hreflang

The locale is a cookie with no route segment, so `en` and `pt-BR` are genuinely the same URL. Claiming
`alternates.languages` would be a lie to crawlers; the cookie-less render (`DEFAULT_LOCALE`) is what
gets indexed. **Do not add hreflang without first giving the locales real URLs.**

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

## White-label reaches metadata too

`openGraph.siteName`, the root `%s | Hunch` title template and `OgWordmark` are two of the four gated
surfaces — see
[invariants.md](invariants.md#white-label-hangs-off-one-resolver-on-four-independent-surfaces).
`pageMetadata({ unbranded, brandName })` handles both.

`unbranded` strips us; `brandName` puts the agency there instead, so a paid title reads
`<title> | <agency>` rather than merely losing its suffix, and `siteName` carries the agency. With no
name configured it falls back to `{ absolute: title }`, which is what the flag did on its own.

### The OG card carries the agency's name, never its logo

`OgBrandName` renders text. Satori cannot read a file off the volume, so putting the logo here would
mean reading the binary from disk inside an image route and inlining it as a data URI — for a card
whose requirement is already met by the name: nothing of ours appears, and the agency signs it.

**This is a decision, not an omission.** Do not "fix" it by embedding the file.
