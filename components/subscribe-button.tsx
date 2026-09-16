'use client'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/components/i18n-provider'

/**
 * What opens a tier's card form. It holds nothing: which tier is open lives in the price list, so
 * that opening one closes the others.
 */
export function SubscribeButton({ onOpen }: { onOpen: () => void }) {
  const { dictionary } = useI18n()

  return (
    <Button onClick={onOpen} variant="outline">
      {dictionary.landing.pricing.subscribe}
    </Button>
  )
}

/**
 * Whether a signed-out reader can subscribe at all.
 *
 * The landing shows the price list to people with no account, and the route needs a session to know
 * whose subscription it is. Rather than let somebody fill in a card and only then be told to sign
 * in, the button says so first.
 */
export function SignInToSubscribe({ href }: { href: string }) {
  const { dictionary } = useI18n()

  return (
    <Button asChild variant="outline">
      <a href={href}>{dictionary.landing.pricing.subscribeSignedOut}</a>
    </Button>
  )
}
