'use client'

import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
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
 *
 * **It is a client component for one reason.** A lazy third party frame is blank for however long
 * someone else's app takes to boot, and the pinned ratio makes that blankness a hole the exact size
 * of the demo. The skeleton fills the same box until the frame's own load fires, so the section
 * reads as loading rather than as broken.
 */
export function ProductDemo({ copy }: { copy: Dictionary['landing']['demo'] }) {
  const [loaded, setLoaded] = useState(false)

  if (!SUPADEMO_DEMO_ID) return null

  return (
    <figure className="space-y-3">
      {/* **No border, no fill, no shadow.** Supademo's player draws its own frame and letterboxes
          whatever it cannot fill, so a card behind it read as a second, larger frame around the
          first -- the padding became visible chrome instead of nothing. The ratio is still pinned
          because the box has to be given a height, and nothing here paints once the frame is up:
          the skeleton is the one thing that ever does, and only while the frame is still blank.

          **Full bleed below `sm`, and the ratio is deliberately untouched.** The frame's height is
          its width divided by the ratio, so the only lever that makes the player bigger on a phone
          is width: the negative margin cancels the container's own padding and buys back those
          pixels. A taller box would not help, because Supademo letterboxes a wide desktop capture
          rather than reflowing it -- the extra height would arrive as bars, not as demo. */}
      <div
        className="relative -mx-4 w-auto overflow-hidden sm:mx-0 sm:w-full"
        style={{ aspectRatio: SUPADEMO_ASPECT }}
      >
        {!loaded && <Skeleton className="absolute inset-0 h-full w-full" />}
        <iframe
          src={`${SUPADEMO_EMBED_ORIGIN}/embed/${SUPADEMO_DEMO_ID}?embed_v=2`}
          title={copy.frameTitle}
          loading="lazy"
          allow="clipboard-write"
          allowFullScreen
          onLoad={() => setLoaded(true)}
          className={`h-full w-full border-0 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>

      {/* **375px of width is the ceiling in portrait, and no frame around the player changes that.**
          A 2:1 desktop capture in a 375px column is 187px tall however it is presented -- an expanded
          view measured 373x187 against the inline 375x188, which is the whole reason this is a
          sentence rather than a button. Turning the phone is the one thing that actually helps: the
          same inline frame then measures 780x390.

          Two nested conditions rather than one class list, because "below sm" and "in portrait" are
          different media queries and their order in the generated stylesheet is not something to
          rely on. */}
      <div className="sm:hidden">
        <p className="hidden text-xs text-muted-foreground portrait:block">{copy.rotateHint}</p>
      </div>

      <figcaption className="text-sm text-muted-foreground">{copy.body}</figcaption>
    </figure>
  )
}
