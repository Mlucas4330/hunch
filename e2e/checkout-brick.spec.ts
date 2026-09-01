import { expect, test } from '@playwright/test'
import {
  CONFETTI_BURST_DELAY_MS,
  MERCADOPAGO_BRICK_CONTAINER,
  MERCADOPAGO_SDK_URL
} from '../lib/constants'

// The SDK, stubbed at its own URL: the suite must not depend on Mercado Pago's CDN, on a real public
// key, or on what their form renders. What is being covered is this side of the boundary -- that the
// Brick gets created every time the dialog opens -- so the stub only has to be a constructor with a
// bricks() builder that fills the container and calls back.
const SDK_STUB = `
  window.MercadoPago = function () {
    return {
      bricks: function () {
        return {
          create: function (brick, container, settings) {
            var el = document.getElementById(container)
            el.innerHTML = '<div data-testid="stub-brick">stub</div>'
            window.__submitBrick = settings.callbacks.onSubmit
            settings.callbacks.onReady()
            return Promise.resolve({ unmount: function () { el.innerHTML = '' } })
          }
        }
      }
    }
  }
`

// **The second open is the one that regressed.** next/script fires onLoad once per src for the whole
// page, so a Brick that waits for it renders nothing on every mount after the first and the reader
// sits on 'Loading the payment form...' until a full reload. See components/mercadopago-brick.tsx.
test.describe('the payment brick', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(MERCADOPAGO_SDK_URL, (route) =>
      route.fulfill({ contentType: 'application/javascript', body: SDK_STUB })
    )
    await page.goto('/')
  })

  test('mounts again when the dialog is closed and reopened', async ({ page }) => {
    const buy = page.getByTestId('credit-packs').getByRole('button', { name: 'Buy' }).first()

    await buy.click()
    await expect(page.getByTestId('stub-brick')).toBeVisible()
    await expect(page.getByText('Loading the payment form...')).toHaveCount(0)

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(
      await page.evaluate(
        (id) => document.getElementById(id)?.childElementCount ?? null,
        MERCADOPAGO_BRICK_CONTAINER
      )
    ).toBeNull()

    await buy.click()
    await expect(page.getByTestId('stub-brick')).toBeVisible()
    await expect(page.getByText('Loading the payment form...')).toHaveCount(0)
  })

  test('says so when the SDK never arrives, rather than loading forever', async ({ page }) => {
    await page.unroute(MERCADOPAGO_SDK_URL)
    await page.route(MERCADOPAGO_SDK_URL, (route) => route.abort())
    await page.reload()

    await page.getByTestId('credit-packs').getByRole('button', { name: 'Buy' }).first().click()

    await expect(
      page.getByText('The payment form could not be loaded. Try again in a moment.')
    ).toBeVisible()
    await expect(page.getByText('Loading the payment form...')).toHaveCount(0)
  })

  // **The confetti is a claim, so it is tested like one.** It says a payment went through, and a Pix
  // or a boleto comes back pending with the money not yet moved -- see components/confetti.tsx. The
  // library appends its own canvas to the body and takes it away when the burst is over, so its
  // presence is what the assertion has to be about.
  for (const { status, bursts } of [
    { status: 'approved', bursts: true },
    { status: 'pending', bursts: false }
  ]) {
    test(`${status} ${bursts ? 'bursts' : 'does not burst'}`, async ({ page }) => {
      await page.route('**/api/billing/mercadopago', (route) =>
        route.fulfill({ json: { status, qrCode: null, qrCodeBase64: null } })
      )

      await page.getByTestId('credit-packs').getByRole('button', { name: 'Buy' }).first().click()
      await expect(page.getByTestId('stub-brick')).toBeVisible()

      const before = await page.locator('canvas').count()
      await page.evaluate(() => window.__submitBrick({ formData: {} }))
      await expect(page.getByTestId('mercadopago-outcome')).toBeVisible()

      if (bursts) await expect.poll(() => page.locator('canvas').count()).toBeGreaterThan(before)
      else {
        await page.waitForTimeout(CONFETTI_BURST_DELAY_MS * 4)
        expect(await page.locator('canvas').count()).toBe(before)
      }
    })
  }
})

declare global {
  interface Window {
    __submitBrick: (payload: { formData: Record<string, unknown> }) => Promise<void>
  }
}
