import { getDictionary } from '@/lib/i18n'

/**
 * What somebody sees after clicking out of the sequence.
 *
 * **It renders the same thing whether the token matched or not.** The route has already done the
 * work and knows the answer; saying it here would tell a stranger holding a guessed token whether it
 * was real, which is the only fact this surface could leak. Nobody who actually clicked their own
 * link is helped by the distinction.
 */
export default async function UnsubscribePage() {
  const { watch } = await getDictionary()

  return (
    <div className="animate-fade-up space-y-3 py-16">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        {watch.sequence.goneHeading}
      </h1>
      <p className="max-w-xl text-sm text-muted-foreground">{watch.sequence.goneBody}</p>
    </div>
  )
}
