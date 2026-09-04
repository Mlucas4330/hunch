import { test as setup, expect } from '@playwright/test'
import { grantCredits } from '@/lib/credits'
import { pinEnglish } from './locale'
import { E2E_CREDITS } from '../playwright.config'

const authFile = 'e2e/.auth/admin.json'

// Not `stripe`. The ledger records who said a payment happened, and saying Stripe did when the suite
// did would put a lie in the one table whose whole job is being auditable. A distinct provider also
// keeps the `(provider, provider_ref)` idempotency key clear of any real payment's.
const E2E_PROVIDER = 'e2e'

setup('authenticate as admin', async ({ page }) => {
  // Covers the warm-up below: the per-test default is sized for a compiled app, and this step exists
  // precisely to absorb the compile.
  setup.setTimeout(180_000)

  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to run e2e tests')
  }

  // Before the first navigation, so the state this saves carries it and every signed in test
  // inherits English without asking. See e2e/locale.ts.
  await pinEnglish(page.context())

  await page.goto('/auth/signin')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button:has-text("Sign in as admin")')

  await page.waitForURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Your pages' })).toBeVisible()

  await page.context().storageState({ path: authFile })

  // Buys the run its credits, through the one function allowed to move a balance, never by updating
  // `users.credits` directly, which would leave the ledger disagreeing with the column and skip the
  // guard the real path depends on. See docs/invariants.md. The ref is per run, so a second run
  // grants again instead of being swallowed as a duplicate delivery.
  await grantCredits({
    email,
    credits: E2E_CREDITS,
    provider: E2E_PROVIDER,
    providerRef: `run-${Date.now()}`
  })

  // `next dev` compiles a route the first time it is hit, and creating an analysis crosses three of
  // them. That cost landed on whichever test ran first, which then blew the per-test timeout while
  // every later test passed -- a failure that looked like a bug in the feature under test and moved
  // whenever the suite was reordered. Paying it here, once, outside any test's timeout.
  await page.fill('input[name="url"]', `https://example.com/?t=${Date.now()}-warmup`)
  await page.getByRole('button', { name: 'Analyze' }).click()
  await page.waitForURL(/\/r\/[0-9a-f-]+$/, { timeout: 120_000 })
})
