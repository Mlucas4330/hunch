import { SUPADEMO_ASPECT, SUPADEMO_DEMO_ID, SUPADEMO_EMBED_ORIGIN } from '@/lib/constants'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'

/**
 * The interactive tour, framed from Supademo.
 *
 * Renders nothing while SUPADEMO_DEMO_ID is empty: an unset id is a missing figure rather than a
 * broken frame, so the landing page is deployable before the demo is recorded and gains it without a
 * code change.
 *
 * **It carries no heading of its own.** It sits inside the "how it works" section as the picture of
 * the three steps written above it, and a second heading there was one of the seams that made the
 * page read as a stack of unrelated blocks.
 *
 * `loading="lazy"` matters more here than anywhere else on the page -- this is the one third party
 * the landing page frames, and it sits above the fold's fold on mobile. The host is allowed in the
 * CSP's frame-src; see next.config.ts.
 */
export function ProductDemo({ copy }: { copy: Dictionary['landing']['demo'] }) {
  if (!SUPADEMO_DEMO_ID) return null

  return (
    <figure className="space-y-3">
      {/* **No border, no fill, no shadow.** Supademo's player draws its own frame and letterboxes
          whatever it cannot fill, so a card behind it read as a second, larger frame around the
          first -- the padding became visible chrome instead of nothing. The ratio is still pinned
          because the box has to be given a height, but nothing here paints. */}
      <div className="w-full overflow-hidden" style={{ aspectRatio: SUPADEMO_ASPECT }}>
        <iframe
          src={`${SUPADEMO_EMBED_ORIGIN}/embed/${SUPADEMO_DEMO_ID}?embed_v=2`}
          title={copy.frameTitle}
          loading="lazy"
          allow="clipboard-write"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
      <figcaption className="text-sm text-muted-foreground">{copy.body}</figcaption>
    </figure>
  )
}
