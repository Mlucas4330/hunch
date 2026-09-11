import { test, expect } from '@playwright/test'
import { pinEnglish } from './locale'

const OUT = 'C:/Users/lucas/AppData/Local/Temp/claude/d--projetos-lp-ab/f0eab914-342e-4253-91a0-3affc6f3466e/scratchpad'

test('visual check of the landing page', async ({ browser }) => {
  for (const locale of ['en', 'pt-BR']) {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    if (locale === 'en') await pinEnglish(context)
    const page = await context.newPage()

    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.screenshot({ path: `${OUT}/landing-${locale}-1280-fold.png` })
    await page.screenshot({ path: `${OUT}/landing-${locale}-1280.png`, fullPage: true })

    await page.setViewportSize({ width: 360, height: 780 })
    console.log(
      `OVERFLOW360 ${locale}`,
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    )
    await page.screenshot({ path: `${OUT}/landing-${locale}-360.png`, fullPage: true })

    await context.close()
  }
})
