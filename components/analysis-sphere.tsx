'use client'

import { useEffect, useRef } from 'react'
import { PULSE_SPHERE, READOUT_SEVERITY_CLASS } from '@/lib/constants'
import { scoreSeverity } from '@/lib/score'
import { cn } from '@/lib/utils'
import type { PublicScore } from '@/lib/analyses'

/**
 * The measured pages, as chips on a sphere the reader can spin.
 *
 * Written by hand rather than pulled from a library, for the one thing CSS cannot do here: a chip has
 * to stay square to the reader while the sphere it sits on turns. Counter rotating a child against a
 * parent's live animation is not expressible in CSS, so the rotation is applied in script and each
 * chip is positioned rather than rotated. It is billboarded, always facing front.
 *
 * The loop writes styles straight onto the nodes instead of setting state, so spinning costs no
 * renders. React re-renders only when the board itself changes, which is once per poll at most.
 *
 * A chip that arrives on a refresh gets no entrance animation, deliberately. `animate-pop-in` drives
 * `transform`, and a running animation outranks the inline `transform` this loop writes every frame,
 * so a new chip would leave its place on the sphere for the length of the animation and snap back.
 * The sphere is already turning; a chip simply being there is enough.
 *
 * Under `prefers-reduced-motion` there is no idle spin and no idle frame: the loop runs only while
 * the reader is dragging, and the sphere sits still otherwise.
 */
export function AnalysisSphere({ entries, label }: { entries: PublicScore[]; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const points = fibonacciSphere(entries.length)
    const chips = chipRefs.current

    // Rotation, its decaying velocity, and the radius the container currently affords. All of it in
    // closures rather than state: every one changes up to sixty times a second.
    const rotation = { x: 0, y: 0 }
    const velocity = { x: 0, y: 0 }
    let pointer = { x: 0, y: 0 }
    let radius = 0
    let centre = 0
    let frame = 0
    let last = 0
    let visible = true
    let dragging = false

    function measure() {
      const width = container!.clientWidth
      radius = (width * PULSE_SPHERE.radius) / PULSE_SPHERE.size
      centre = width / 2
    }

    function draw() {
      const sinY = Math.sin(rotation.y)
      const cosY = Math.cos(rotation.y)
      const sinX = Math.sin(rotation.x)
      const cosX = Math.cos(rotation.x)

      points.forEach((point, i) => {
        const chip = chips[i]
        if (!chip) return

        const x = point.x * cosY + point.z * sinY
        const zy = point.z * cosY - point.x * sinY
        const y = point.y * cosX - zy * sinX
        const z = point.y * sinX + zy * cosX

        // Depth runs 0 at the far side to 1 at the near one, and drives the shrink and the fade that
        // together read as distance.
        const depth = (z + 1) / 2
        const scale = PULSE_SPHERE.minScale + (1 - PULSE_SPHERE.minScale) * depth
        const left = centre + x * radius
        const top = centre + y * radius

        chip.style.transform = `translate3d(${left}px, ${top}px, 0) translate(-50%, -50%) scale(${scale})`
        chip.style.opacity = String(PULSE_SPHERE.minOpacity + (1 - PULSE_SPHERE.minOpacity) * depth)
        chip.style.zIndex = String(Math.round(depth * 100))
      })
    }

    function moving() {
      return dragging || Math.abs(velocity.x) > 1e-5 || Math.abs(velocity.y) > 1e-5
    }

    function tick(now: number) {
      const elapsed = last === 0 ? 0 : Math.min(now - last, 100)
      last = now

      if (!dragging) {
        if (!reduced.matches) rotation.y += PULSE_SPHERE.spin * elapsed
        velocity.x *= PULSE_SPHERE.friction
        velocity.y *= PULSE_SPHERE.friction
      }

      rotation.y += velocity.y
      // Clamped so a hard vertical flick never turns the sphere over and leaves every chip upside
      // down.
      rotation.x = Math.max(-1.2, Math.min(1.2, rotation.x + velocity.x))

      draw()

      if (reduced.matches && !moving()) {
        frame = 0
        return
      }

      frame = requestAnimationFrame(tick)
    }

    function start() {
      if (frame || !visible) return
      last = 0
      frame = requestAnimationFrame(tick)
    }

    function stop() {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
    }

    function onPointerDown(event: PointerEvent) {
      dragging = true
      pointer = { x: event.clientX, y: event.clientY }
      container!.setPointerCapture(event.pointerId)
      start()
    }

    function onPointerMove(event: PointerEvent) {
      if (!dragging) return
      velocity.y = (event.clientX - pointer.x) * PULSE_SPHERE.dragSensitivity
      velocity.x = -(event.clientY - pointer.y) * PULSE_SPHERE.dragSensitivity
      pointer = { x: event.clientX, y: event.clientY }
    }

    function onPointerUp(event: PointerEvent) {
      if (!dragging) return
      dragging = false
      if (container!.hasPointerCapture(event.pointerId)) {
        container!.releasePointerCapture(event.pointerId)
      }
    }

    // Off screen or on a hidden tab, the loop is work nobody can see.
    function onVisibility() {
      visible = !document.hidden
      if (visible) start()
      else stop()
    }

    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !document.hidden
      if (visible) start()
      else stop()
    })

    const resized = new ResizeObserver(() => {
      measure()
      draw()
    })

    measure()
    draw()
    seen.observe(container)
    resized.observe(container)
    document.addEventListener('visibilitychange', onVisibility)
    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerup', onPointerUp)
    container.addEventListener('pointercancel', onPointerUp)
    start()

    return () => {
      stop()
      seen.disconnect()
      resized.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerup', onPointerUp)
      container.removeEventListener('pointercancel', onPointerUp)
    }
  }, [entries])

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={label}
      className="relative mx-auto aspect-square w-full max-w-130 cursor-grab touch-none select-none active:cursor-grabbing"
    >
      {entries.map((entry, i) => (
        <span
          key={entry.domain}
          ref={(node) => {
            chipRefs.current[i] = node
          }}
          className={cn(
            'absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-sm border border-border px-1.5 py-0.5 font-mono text-xs shadow-elev-1',
            READOUT_SEVERITY_CLASS[scoreSeverity(entry.score)]
          )}
        >
          {entry.domain}
          <span className="font-semibold tabular-nums">{entry.score}</span>
        </span>
      ))}
    </div>
  )
}

const GOLDEN_RATIO = 0.618033988749895

// A second irrational, for the latitude jitter. It has to be independent of GOLDEN_RATIO: reusing
// that one would tie the jitter to the shuffle below and reintroduce the pattern both exist to break.
const PLASTIC_RATIO = 0.7548776662466927

/**
 * Evenly spaced points on a unit sphere, handed out in a scattered order.
 *
 * The spacing is the usual Fibonacci lattice, where the golden angle keeps the points from banding
 * into rings the way a naive latitude and longitude grid does. Two corrections sit on top of it,
 * because at two dozen labels a textbook lattice does not read as a ball:
 *
 * The **jitter** breaks the one-chip-per-latitude regularity. A lattice steps down in even rungs, and
 * with this few points the eye joins them into a spiral staircase rather than a surface. Nudging each
 * latitude by an irrational fraction of one rung lets bands share a height and the shape closes up.
 * The jitter is applied to the index, not to `y`, so every point stays exactly on the unit sphere.
 *
 * The **shuffle** decorrelates rank from height. The entries arrive ranked and the lattice walks pole
 * to pole in order, so handing point `i` to entry `i` puts the best score at one pole and the worst at
 * the other: a colour gradient down the screen that reads as a sorted list, not a sphere.
 *
 * Both are fixed functions of the count, so a chip does not jump when the board refreshes.
 */
function fibonacciSphere(count: number): { x: number; y: number; z: number }[] {
  const golden = Math.PI * (3 - Math.sqrt(5))

  const points = Array.from({ length: count }, (_, i) => {
    const jitter = ((i * PLASTIC_RATIO) % 1) - 0.5
    const step = count === 1 ? 0 : (i + jitter) / (count - 1)
    const y = count === 1 ? 0 : Math.max(-1, Math.min(1, 1 - step * 2))
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i

    return { x: Math.cos(theta) * ring, y, z: Math.sin(theta) * ring }
  })

  return points
    .map((point, i) => ({ point, key: (i * GOLDEN_RATIO) % 1 }))
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.point)
}
