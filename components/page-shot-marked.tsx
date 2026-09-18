'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ELEMENT_MARK_PADDING_PX,
  hypothesisAnchor,
  hypothesisQuoteAnchor,
  impactScoreMarkClass,
  impactScorePinClass,
  PAGE_SHOT_ASPECT,
  SCREENSHOT_PIXEL_RATIO
} from '@/lib/constants'
import { revealAnchor } from '@/lib/anchor'
import { useI18n } from '@/components/i18n-provider'
import { t } from '@/lib/i18n/format'
import type { ElementRect } from '@/lib/scrape'
import { cn } from '@/lib/utils'

export type ShotMarker = {
  /** The row the marker points at, which is also what the anchor is built from. */
  id: string
  /** Its place in the list, so the number on the page and the order of the cards are one thing. */
  rank: number
  rect: ElementRect
  title: string
  score: number
}

/**
 * The page as the visitor's phone rendered it, with the quoted lines drawn on it.
 *
 * **One picture with the errors pointed at, instead of one small crop per card.** The crops showed a
 * line without showing where on the page it sat, which is half of what a reader wants to know, and
 * six of them down one column read as six pictures rather than one page.
 *
 * **Only copy errors are marked, and that is a fact about the data.** A quoted line has a `selector`
 * and a box measured in the phone layout; a structure, SEO or AI error has neither, and several of
 * them are the absence of something, which has no place on the page to point at. The line under the
 * frame says how many are marked so the picture is never read as the whole verdict. See
 * docs/report.md.
 */
export function PageShotMarked({
  url,
  label,
  markers,
  total
}: {
  url: string | null
  label: string
  markers: ShotMarker[]
  /** Every copy error, marked or not, which is what the count under the frame compares against. */
  total: number
}) {
  const { dictionary } = useI18n()
  const copy = dictionary.report.pageShot
  const [broken, setBroken] = useState(false)
  // **The page's size in CSS pixels, read off the picture itself.** The boxes are in CSS pixels and
  // the shot is not: it was taken at `SCREENSHOT_PIXEL_RATIO` device pixels per CSS pixel. Taking
  // both from the image means the frame can be any width and nothing here measures anything.
  const [page, setPage] = useState<{ width: number; height: number } | null>(null)
  const image = useRef<HTMLImageElement>(null)

  const measure = useCallback((node: HTMLImageElement) => {
    if (!node.naturalWidth) return

    setPage({
      width: node.naturalWidth / SCREENSHOT_PIXEL_RATIO,
      height: node.naturalHeight / SCREENSHOT_PIXEL_RATIO
    })
  }, [])

  // **`onLoad` does not fire for a picture that is already in the browser's cache**, and this one is
  // served immutable, so on every visit after the first it is decoded before React ever attaches the
  // handler. That was the whole markers-disappear bug: they showed once and never again. Asking the
  // element whether it is already complete covers the cached path; the handler covers the cold one.
  useEffect(() => {
    const node = image.current
    if (node?.complete) measure(node)
  }, [measure, url])

  if (!url || broken) return null

  return (
    <figure className="space-y-2">
      {/* The phone. Four layers, because that is what stops it reading as a rounded rectangle: the
          body, the polished rim inside it, the screen, and the two things every phone has on its
          front. None of it is interactive and none of it says anything, so it is all hidden from a
          screen reader except the picture. */}
      <div
        className="relative mx-auto w-full max-w-[19rem] rounded-[2.5rem] bg-device p-[3px] shadow-elev-3"
        style={{ aspectRatio: PAGE_SHOT_ASPECT }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[2.5rem] border border-device-edge"
        />
        {/* The buttons on the sides, which is most of what the eye reads as a phone rather than a
            card: volume on the left, the long one on the right. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -left-[3px] top-[7rem] h-10 w-[3px] rounded-l-sm bg-device-edge"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -left-[3px] top-[10rem] h-10 w-[3px] rounded-l-sm bg-device-edge"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -right-[3px] top-[9rem] h-16 w-[3px] rounded-r-sm bg-device-edge"
        />

        <div className="relative size-full overflow-hidden rounded-[2.35rem] bg-muted">
          {/* Scrolls with no bar, so the frame keeps reading as a device. Focusable and labelled
              because the scrolling is still there and a keyboard has to reach it. */}
          <div
            className="scrollbar-none size-full overflow-y-auto"
            tabIndex={0}
            role="group"
            aria-label={label}
          >
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- the shot has no known height,
                  and it is the natural size that gives the page's own dimensions below. */}
              <img
                ref={image}
                src={url}
                alt={label}
                className="w-full"
                onError={() => setBroken(true)}
                onLoad={(event) => measure(event.currentTarget)}
              />

              {page &&
                markers.map((marker) => (
                  <Marker key={marker.id} marker={marker} page={page} aria={copy.markerAria} />
                ))}
            </div>
          </div>

          {/* The island and the home bar, over the picture rather than beside it, because on the
              phone they sit over the page too. */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-2 h-6 w-20 -translate-x-1/2 rounded-full bg-device"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-1.5 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-device/70"
          />
        </div>
      </div>

      <figcaption className="space-y-0.5 text-center">
        <span className="panel-label block text-nano text-muted-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">
          {markers.length === 0 ? copy.noMarkers : t(copy.marked, { count: markers.length, total })}
        </span>
      </figcaption>
    </figure>
  )
}

/**
 * One quoted line, boxed on the picture.
 *
 * **The box is the element plus a margin**, in the page's own pixels, so it frames the line rather
 * than clamping onto its glyphs, and it is converted to percentages of the page so the frame can be
 * any width. The pin carries the position in the list, which is the same number the card has.
 */
function Marker({
  marker,
  page,
  aria
}: {
  marker: ShotMarker
  page: { width: number; height: number }
  aria: string
}) {
  const { rect } = marker
  const pad = ELEMENT_MARK_PADDING_PX
  const across = (value: number) => `${(value / page.width) * 100}%`
  const down = (value: number) => `${(value / page.height) * 100}%`

  return (
    <button
      type="button"
      // The reader is sent to the card, which is where the title and the severity are, and the quoted
      // line inside it is what lights up. See lib/anchor.ts.
      onClick={() => revealAnchor(hypothesisAnchor(marker.id), hypothesisQuoteAnchor(marker.id))}
      aria-label={t(aria, { rank: marker.rank, title: marker.title })}
      className={cn(
        'absolute rounded-sm border-2 transition-colors hover:brightness-110',
        impactScoreMarkClass(marker.score)
      )}
      style={{
        left: across(Math.max(0, rect.x - pad)),
        top: down(Math.max(0, rect.y - pad)),
        width: across(rect.width + pad * 2),
        height: down(rect.height + pad * 2)
      }}
    >
      <span
        className={cn(
          'absolute -left-2 -top-2.5 flex size-5 items-center justify-center rounded-full font-mono text-nano font-bold shadow-elev-1',
          impactScorePinClass(marker.score)
        )}
      >
        {marker.rank}
      </span>
    </button>
  )
}
