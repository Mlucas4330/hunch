import { SUPADEMO_DEMO_ID, SUPADEMO_EMBED_ORIGIN } from '@/lib/constants'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'

/**
 * The interactive tour, framed from Supademo.
 *
 * Renders nothing while SUPADEMO_DEMO_ID is empty, like components/testimonials.tsx: an unset id is a
 * missing section rather than a broken frame, so the landing page is deployable before the demo is
 * recorded and gains it without a code change.
 *
 * `loading="lazy"` matters more here than anywhere else on the page -- this is the one third party
 * the landing page frames, and it sits above the fold's fold on mobile. The host is allowed in the
 * CSP's frame-src; see next.config.ts.
 */
export function ProductDemo({ copy }: { copy: Dictionary['landing']['demo'] }) {
  if (!SUPADEMO_DEMO_ID) return null

  return (
    <section className="space-y-10">
      <header className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{copy.eyebrow}</p>
        <h2 className="font-display text-2xl font-bold tracking-tight">{copy.heading}</h2>
        <p className="max-w-2xl pt-1 text-sm text-muted-foreground">{copy.body}</p>
      </header>
      <div className="aspect-[16/10] w-full overflow-hidden rounded-lg border bg-card shadow-md">
        <iframe
          src={`${SUPADEMO_EMBED_ORIGIN}/embed/${SUPADEMO_DEMO_ID}?embed_v=2`}
          title={copy.frameTitle}
          loading="lazy"
          allow="clipboard-write"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    </section>
  )
}
