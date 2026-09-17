'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/components/i18n-provider'
import {
  BILLING_SUBSCRIBE_PATH,
  MERCADOPAGO_BRICK_COLOR_TOKENS,
  MERCADOPAGO_BRICK_CONTAINER,
  MERCADOPAGO_BRICK_RADIUS_TOKEN,
  MERCADOPAGO_BRICK_RADIUS_VARIABLES,
  MERCADOPAGO_LOCALE,
  MERCADOPAGO_SDK_URL
} from '@/lib/constants'
import type { PlanTier } from '@/lib/enums'

type BrickController = { unmount: () => void }

type BricksBuilder = {
  create: (
    brick: string,
    container: string,
    settings: Record<string, unknown>
  ) => Promise<BrickController>
}

type MercadoPagoSdk = new (
  publicKey: string,
  options: { locale: string }
) => { bricks: () => BricksBuilder }

declare global {
  interface Window {
    MercadoPago?: MercadoPagoSdk
  }
}

/**
 * Our tokens, in a form the provider's script can use. It derives shades from what it is given, and
 * our tokens are `oklch()`, so each one is painted on a pixel and read back as `rgb()`.
 */
function brickVariables() {
  const styles = getComputedStyle(document.documentElement)
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  const variables: Record<string, string> = {}

  for (const [variable, token] of Object.entries(MERCADOPAGO_BRICK_COLOR_TOKENS)) {
    const value = styles.getPropertyValue(token).trim()
    if (!context || !value) continue
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = value
    context.fillRect(0, 0, 1, 1)
    const [red, green, blue] = context.getImageData(0, 0, 1, 1).data
    variables[variable] = `rgb(${red}, ${green}, ${blue})`
  }

  const radius = styles.getPropertyValue(MERCADOPAGO_BRICK_RADIUS_TOKEN).trim()
  if (radius) for (const variable of MERCADOPAGO_BRICK_RADIUS_VARIABLES) variables[variable] = radius

  return variables
}

/**
 * The card form for one tier, rendered in our own page by Mercado Pago's script.
 *
 * **The card never reaches this server.** The form tokenizes it in the browser and hands back a
 * single-use token, which is the only thing submitted. The amount shown here is what the form
 * displays; what is charged comes from `PLAN` on the server, so a token submitted against another
 * tier still buys the tier the route was told about. See docs/security.md.
 *
 * The subscription comes back authorised, so there is no waiting and no redirect: the quota is on
 * the account by the time this refreshes the page.
 */
export function SubscribeCard({
  tier,
  amount,
  payerEmail,
  onCancel
}: {
  tier: PlanTier
  amount: number
  /** Whose subscription this is. The route reads it from the session; this only saves the typing. */
  payerEmail: string
  onCancel: () => void
}) {
  const { dictionary, locale } = useI18n()
  const copy = dictionary.landing.pricing
  const router = useRouter()

  const [loaded, setLoaded] = useState(false)
  const [ready, setReady] = useState(false)
  const [failure, setFailure] = useState<'card_refused' | 'unavailable' | null>(null)
  const [done, setDone] = useState(false)
  const controller = useRef<BrickController | null>(null)

  // **`onLoad` fires once per src for the whole page, not once per mount.** `next/script` keeps a
  // module level cache and returns early for anything that asks for a script it already loaded, so
  // the second time this form is opened nothing would call back and the reader would sit on the
  // loading line forever. The question asked here is whether the SDK is present, not whether it just
  // arrived.
  useEffect(() => {
    if (window.MercadoPago) setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded || !window.MercadoPago || controller.current) return

    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
    if (!publicKey) {
      setFailure('unavailable')
      return
    }

    const bricks = new window.MercadoPago(publicKey, {
      locale: MERCADOPAGO_LOCALE[locale]
    }).bricks()

    let cancelled = false

    bricks
      .create('cardPayment', MERCADOPAGO_BRICK_CONTAINER, {
        // The address is already known, so the form does not ask for it again.
        initialization: { amount, payer: { email: payerEmail } },
        customization: {
          // **No instalments.** This is a monthly subscription, not a purchase to spread over a
          // year, and the form otherwise refuses to submit until one is chosen. Pinning both ends at
          // one removes the choice rather than hiding a field that still has to be answered.
          paymentMethods: { minInstallments: 1, maxInstallments: 1 },
          visual: {
            // **Read off `<html>`, which the server stamped before anything painted.** The form is
            // the provider's own markup in our page, and a white panel in the middle of a dark one
            // is the moment a checkout stops looking like part of the site. See lib/theme.ts.
            style: {
              theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
              customVariables: brickVariables()
            },
            texts: { formSubmit: copy.cardSubmit }
          }
        },
        callbacks: {
          onReady: () => setReady(true),
          onError: (error: unknown) => {
            console.error('mercadopago brick', error)
            setFailure('unavailable')
          },
          // **The card brick hands its data straight to the callback.** The payment brick is the
          // one that wraps it in `{ formData }`, and taking the wrong shape here leaves a card that
          // tokenizes and a request that is never sent.
          onSubmit: async (cardForm: { token?: string }) => {
            setFailure(null)

            const response = await fetch(BILLING_SUBSCRIBE_PATH, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tier, cardToken: cardForm?.token })
            })

            if (!response.ok) {
              setFailure(response.status === 402 ? 'card_refused' : 'unavailable')
              throw new Error('subscription_failed')
            }

            // The quota is already on the row, so what the screen needs is to read it again. The
            // note stays up because a refresh redraws the page around it and a form that simply
            // vanishes leaves the reader unsure whether they just paid.
            setDone(true)
            router.refresh()
          }
        }
      })
      .then((created) => {
        if (cancelled) created.unmount()
        else controller.current = created
      })
      .catch((error: unknown) => {
        console.error('mercadopago brick create', error)
        setFailure('unavailable')
      })

    return () => {
      cancelled = true
      controller.current?.unmount()
      controller.current = null
    }
  }, [loaded, locale, amount, tier, payerEmail, copy.cardSubmit, router])

  if (done) {
    return (
      <p className="text-sm font-medium" role="status" data-testid="subscribe-done">
        {copy.subscribed}
      </p>
    )
  }

  return (
    <div className="space-y-3" data-testid="subscribe-card">
      <Script
        src={MERCADOPAGO_SDK_URL}
        onLoad={() => setLoaded(true)}
        onError={() => setFailure('unavailable')}
      />

      <div id={MERCADOPAGO_BRICK_CONTAINER} />

      {!ready && !failure && <p className="text-sm text-muted-foreground">{copy.cardLoading}</p>}

      {failure && (
        <p role="status" aria-live="polite" className="text-sm text-destructive">
          {failure === 'card_refused' ? copy.cardRefused : copy.subscribeFailed}
        </p>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        {dictionary.common.cancel}
      </button>
    </div>
  )
}
