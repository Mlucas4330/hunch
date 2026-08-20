'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { useI18n } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import {
  MERCADOPAGO_APPROVED,
  MERCADOPAGO_BRICK_CONTAINER,
  MERCADOPAGO_LOCALE,
  MERCADOPAGO_SDK_URL
} from '@/lib/constants'
import type { CreditPackId } from '@/lib/constants'

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

type Outcome = {
  status: string
  qrCode: string | null
  qrCodeBase64: string | null
}

/**
 * The Payment Brick for one credit pack: card, Pix and boleto in the page, with no redirect.
 *
 * **The amount here is what the form displays, not what is charged.** The Brick submits it from the
 * browser, so the route overwrites it from `CREDIT_PACKS` before creating anything -- see
 * app/api/billing/mercadopago/route.ts.
 *
 * Pix and boleto settle after the reader has left the form, so nothing here reports a balance. The
 * credit lands when the webhook is delivered, and the copy says exactly that rather than implying
 * the payment is done.
 */
export function MercadoPagoBrick({ pack, amount }: { pack: CreditPackId; amount: number }) {
  const { dictionary, locale } = useI18n()
  const copy = dictionary.credits.mercadopago
  const [ready, setReady] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [failed, setFailed] = useState(false)
  const controller = useRef<BrickController | null>(null)

  useEffect(() => {
    if (!loaded || !window.MercadoPago || controller.current) return

    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
    if (!publicKey) return

    const bricks = new window.MercadoPago(publicKey, {
      locale: MERCADOPAGO_LOCALE[locale]
    }).bricks()

    let cancelled = false

    bricks
      .create('payment', MERCADOPAGO_BRICK_CONTAINER, {
        initialization: { amount },
        customization: {
          paymentMethods: { creditCard: 'all', debitCard: 'all', bankTransfer: 'all', ticket: 'all' }
        },
        callbacks: {
          onReady: () => setReady(true),
          onError: () => setFailed(true),
          onSubmit: async ({ formData }: { formData: Record<string, unknown> }) => {
            setFailed(false)

            const res = await fetch('/api/billing/mercadopago', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pack, payment: formData })
            })

            if (!res.ok) {
              setFailed(true)
              throw new Error('payment_failed')
            }

            setOutcome((await res.json()) as Outcome)
          }
        }
      })
      .then((created) => {
        if (cancelled) created.unmount()
        else controller.current = created
      })
      .catch(() => setFailed(true))

    return () => {
      cancelled = true
      controller.current?.unmount()
      controller.current = null
    }
  }, [loaded, locale, amount, pack])

  if (outcome) {
    return (
      <div className="space-y-3 text-sm" data-testid="mercadopago-outcome">
        <p className="font-medium">
          {outcome.status === MERCADOPAGO_APPROVED ? copy.approved : copy.pending}
        </p>

        {outcome.qrCodeBase64 && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            alt={copy.qrAlt}
            className="size-48 rounded-sm border border-border"
            src={`data:image/png;base64,${outcome.qrCodeBase64}`}
          />
        )}

        {outcome.qrCode && (
          <p className="break-all font-mono text-xs text-muted-foreground">{outcome.qrCode}</p>
        )}

        <p className="text-muted-foreground">{copy.creditsArrive}</p>

        <Button onClick={() => window.location.reload()} variant="outline">
          {copy.refresh}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Script src={MERCADOPAGO_SDK_URL} onLoad={() => setLoaded(true)} />
      <div id={MERCADOPAGO_BRICK_CONTAINER} />
      {!ready && !failed && <p className="text-sm text-muted-foreground">{copy.loading}</p>}
      {failed && <p className="text-sm text-coral">{copy.failed}</p>}
    </div>
  )
}
