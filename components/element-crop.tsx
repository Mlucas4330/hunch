'use client'

import { useState, type CSSProperties } from 'react'
import { ELEMENT_CROP_PADDING_PX, ELEMENT_CROP_WIDTH_PX } from '@/lib/constants'
import type { ElementRect } from '@/lib/scrape'
import { cn } from '@/lib/utils'

/**
 * The quoted element, shown where it actually sits on the page.
 *
 * **Cropped at render rather than on the server.** One full page screenshot per run already exists,
 * and framing a piece of it is a `position` and a `scale` away. Cutting files instead would mean an
 * image library in the dependency list, one file per error on the volume, and a re-render of every
 * crop the day the framing changes.
 *
 * Renders nothing without both halves. A run whose screenshot failed has no URL, an element the
 * phone layout dropped has no box, and either way the card falls back to the quote above it, which
 * is the evidence this only illustrates.
 */
export function ElementCrop({
  screenshotUrl,
  rect,
  label,
  className
}: {
  screenshotUrl: string | null
  rect: ElementRect | null
  label: string
  className?: string
}) {
  const [broken, setBroken] = useState(false)

  if (!screenshotUrl || !rect || broken) return null

  // The box plus a margin, so the element is read in its surroundings rather than floating alone.
  const cropWidth = rect.width + ELEMENT_CROP_PADDING_PX * 2
  const cropHeight = rect.height + ELEMENT_CROP_PADDING_PX * 2
  const scale = Math.min(1, ELEMENT_CROP_WIDTH_PX / cropWidth)

  return (
    <figure className={cn('space-y-1.5', className)}>
      <div
        className="relative overflow-hidden rounded-md border bg-muted"
        style={{ width: cropWidth * scale, height: cropHeight * scale }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- the natural size of the shot is
            what positions the crop, so it must not be resized or reframed by the image pipeline. */}
        <img
          src={screenshotUrl}
          alt={label}
          onError={() => setBroken(true)}
          className="max-w-none origin-top-left"
          style={
            {
              position: 'absolute',
              left: -(rect.x - ELEMENT_CROP_PADDING_PX) * scale,
              top: -(rect.y - ELEMENT_CROP_PADDING_PX) * scale,
              transform: `scale(${scale})`,
              transformOrigin: 'top left'
            } as CSSProperties
          }
        />
      </div>
      <figcaption className="panel-label text-nano text-muted-foreground">{label}</figcaption>
    </figure>
  )
}
