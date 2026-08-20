import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getDictionary } from '@/lib/i18n'
import { t as fill } from '@/lib/i18n/format'

/**
 * The balance, above the form that spends it.
 *
 * **Read from the row on every render, never from the session.** A JWT lives
 * `SESSION_MAX_AGE_SECONDS`, so a balance carried in one is stale the instant something is bought or
 * spent — and a stale balance is either free credit or credit that looks vanished. Same reasoning
 * that keeps `role` out of the token. See docs/invariants.md.
 */
export async function CreditBalance({ credits }: { credits: number }) {
  const t = await getDictionary()
  const copy = t.credits

  const label =
    credits === 0 ? copy.balanceNone : credits === 1 ? copy.balanceOne : fill(copy.balance, { count: credits })

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
      data-testid="credit-balance"
    >
      <p className="text-sm">{label}</p>
      <Button asChild size="sm" variant={credits === 0 ? 'default' : 'outline'}>
        <Link href="/#credits">{copy.buy}</Link>
      </Button>
    </div>
  )
}
