import Link from 'next/link'
import { CREDITS_ANCHOR } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { getDictionary } from '@/lib/i18n'
import { t as fill } from '@/lib/i18n/format'

/**
 * The balance, inside the account menu.
 *
 * **Read from the row on every render, never from the session.** A JWT lives
 * `SESSION_MAX_AGE_SECONDS`, so a balance carried in one is stale the instant something is bought or
 * spent, and a stale balance is either free credit or credit that looks vanished. Same reasoning
 * that keeps `role` out of the token. See docs/invariants.md.
 *
 * `variant` is about the box around it, never about what it says. `card` draws its own border, for a
 * page that has no card of its own; `menu` draws none, because the account panel already is one and
 * a second border there read as a box inside a box.
 */
export async function CreditBalance({
  credits,
  variant = 'card'
}: {
  credits: number
  variant?: 'card' | 'menu'
}) {
  const t = await getDictionary()
  const copy = t.credits

  const label =
    credits === 0 ? copy.balanceNone : credits === 1 ? copy.balanceOne : fill(copy.balance, { count: credits })

  // Distinct per variant because the nav renders the menu one on every screen, including the admin
  // screen that renders the card one: a shared id would be two matches for one selector.
  const testId = variant === 'card' ? 'credit-balance' : 'credit-balance-menu'

  return (
    <div
      className={variant === 'card' ? 'space-y-2 rounded-lg border bg-card px-4 py-3' : 'space-y-2'}
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">{label}</p>
        <Button asChild size="sm" variant={credits === 0 ? 'default' : 'outline'}>
          <Link href={CREDITS_ANCHOR}>{copy.buy}</Link>
        </Button>
      </div>

      {/* **An empty balance is not a dead end, and this is the only place that says so.** A reader
          seeing "You have no credits" next to a Buy button reasonably concludes they cannot do
          anything, when in fact the whole measured readout is still theirs -- see
          docs/invariants.md. Said only at zero, because at one credit it is noise. */}
      {credits === 0 && <p className="text-xs text-muted-foreground">{copy.freeHalf}</p>}
    </div>
  )
}
