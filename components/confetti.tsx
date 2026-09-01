'use client'

import {
  CONFETTI_BURST_DELAY_MS,
  CONFETTI_ORIGIN_X,
  CONFETTI_ORIGIN_Y,
  CONFETTI_PARTICLE_COUNT,
  CONFETTI_SPREAD,
  CONFETTI_TOKENS,
  CONFETTI_Z_INDEX
} from '@/lib/constants'

/**
 * The burst that answers a payment going through.
 *
 * **It fires on approval and on nothing else.** A Pix or a boleto comes back pending: the money has
 * not moved and no credit has landed, so celebrating there would tell the reader something that has
 * not happened yet. That is the same family of claim docs/invariants.md keeps off every other
 * surface, and a full screen animation is the loudest possible place to make it. See
 * components/mercadopago-brick.tsx for the two states it has to sit between.
 *
 * **A dependency, after `motion` was measured and removed** -- docs/components.md records that call,
 * and this is not a reversal of it. The objection there was 42kB on the first load of a product that
 * charges people to be told their page is heavy. Here the import is dynamic and reached only once a
 * payment has been approved, so the initial bundle of every screen is unchanged and the only person
 * who ever downloads it is somebody who has just bought something.
 */
export async function fireConfetti() {
  // The reader asked for no movement, and a screenful of falling pieces is the least ignorable kind.
  // Nothing else is skipped: the approval message is the part that carries the information.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const confetti = (await import('canvas-confetti')).default

  const colors = themeColors()
  const shared = {
    particleCount: CONFETTI_PARTICLE_COUNT,
    spread: CONFETTI_SPREAD,
    zIndex: CONFETTI_Z_INDEX,
    // An empty list would render nothing at all, so a theme this could not read falls back to the
    // library's own palette rather than to invisible pieces.
    ...(colors.length > 0 && { colors })
  }

  const [left, right] = CONFETTI_ORIGIN_X

  confetti({ ...shared, origin: { x: left, y: CONFETTI_ORIGIN_Y } })
  setTimeout(() => {
    confetti({ ...shared, origin: { x: right, y: CONFETTI_ORIGIN_Y } })
  }, CONFETTI_BURST_DELAY_MS)
}

/**
 * The product's colours, as the only notation the library can read.
 *
 * `canvas-confetti` parses hex and nothing else, and the tokens in app/globals.css are `oklch`, so
 * one of the two has to give. Hardcoding hex here is what CLAUDE.md forbids and would also be wrong
 * twice over: the tokens differ between light and dark, and a copy of them here drifts the first
 * time one is retuned.
 *
 * So the conversion is done by the thing that already knows how: assigning any colour a browser can
 * parse to `fillStyle` and reading it back gives `#rrggbb`. A token that is missing or that the
 * browser will not parse is dropped rather than guessed at.
 */
function themeColors(): string[] {
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return []

  const styles = getComputedStyle(document.documentElement)

  return CONFETTI_TOKENS.map((token) => normalize(context, styles.getPropertyValue(token).trim()))
    .filter(Boolean)
}

/**
 * One colour, or nothing.
 *
 * A `fillStyle` the browser cannot parse is not an error: the assignment is ignored and the previous
 * value stays, so reading it back would hand out whatever was set last -- black, and the confetti
 * would come out black on a broken token rather than falling back. Assigning over two different
 * starting colours is what tells the two apart: a value that parsed lands on the same answer from
 * both, a value that did not leaves each one where it was.
 */
function normalize(context: CanvasRenderingContext2D, value: string): string {
  if (!value) return ''

  context.fillStyle = '#000000'
  context.fillStyle = value
  const fromBlack = context.fillStyle

  context.fillStyle = '#ffffff'
  context.fillStyle = value

  return fromBlack === context.fillStyle ? fromBlack : ''
}
