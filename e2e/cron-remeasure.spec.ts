import { test, expect } from '@playwright/test'
import { E2E_CRON_SECRET } from '../playwright.config'

// O mesmo contorno de `cron-prune`, pelo mesmo motivo: o jeito como uma rota de cron quebra em
// producao e um 401, e o log nao distingue um segredo errado de um shell que nao interpolou. Ver
// docs/deployment.md.
test.describe('the remeasure cron', () => {
  const route = '/api/cron/remeasure'

  test('refuses a call with no secret, and one with the wrong secret', async ({ request }) => {
    expect((await request.get(route)).status()).toBe(401)

    const wrong = await request.get(route, { headers: { authorization: 'Bearer nope' } })
    expect(wrong.status()).toBe(401)

    const literal = await request.get(route, {
      headers: { authorization: 'Bearer $CRON_SECRET' }
    })
    expect(literal.status()).toBe(401)
  })

  test('answers an authorized call with what it swept and what it queued', async ({ request }) => {
    const res = await request.get(route, {
      headers: { authorization: `Bearer ${E2E_CRON_SECRET}` }
    })

    expect(res.ok()).toBeTruthy()

    // Zero e a resposta normal: a suite nao assina nada, e **o filtro e a assinatura**. Uma analise
    // paga sem assinatura ativa nunca entra na varredura, que e o controle de custo inteiro -- uma
    // varredura que rodasse para todo mundo e tempo de browser que ninguem pediu.
    expect(await res.json()).toEqual({ due: 0, queued: 0 })
  })
})
