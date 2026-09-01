import type { ReactNode } from 'react'

/**
 * The shell both accident screens share: a 404 and a crashed render.
 *
 * They are one component because they are one layout with different words, and because the two of
 * them are the surfaces least likely to be looked at again after they are written. Two copies would
 * be two designs within a month.
 *
 * It takes strings rather than reading a dictionary: `not-found.tsx` is a server component and can
 * await one, while `error.tsx` must be a client component and reads the provider. Passing the words
 * in is what lets both use this.
 */
export function ErrorScreen({
  title,
  body,
  action
}: {
  title: string
  body: string
  action: ReactNode
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="max-w-lg text-balance font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
      <div className="mt-2">{action}</div>
    </div>
  )
}
