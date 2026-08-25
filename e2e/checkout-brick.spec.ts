import { expect, test } from '@playwright/test'
import { MERCADOPAGO_BRICK_CONTAINER, MERCADOPAGO_SDK_URL } from '../lib/constants'

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
})
