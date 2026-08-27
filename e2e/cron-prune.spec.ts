import { test, expect } from '@playwright/test'
import { E2E_CRON_SECRET } from '../playwright.config'

// A rota do cron nao tinha teste nenhum, e o modo como ela quebrou em producao foi exatamente este:
// um 401. Duas vezes, por motivos diferentes -- um startCommand em exec form que mandava os catorze
// caracteres literais de $CRON_SECRET, e um CRON_SECRET ausente no servico. Nos dois casos o log diz
// "401", que se parece com um segredo errado e nao com o bug que era. Ver docs/deployment.md.
test.describe('the prune cron', () => {
  const route = '/api/cron/prune-screenshots'

  test('refuses a call with no secret, and one with the wrong secret', async ({ request }) => {
    expect((await request.get(route)).status()).toBe(401)

    const wrong = await request.get(route, { headers: { authorization: 'Bearer nope' } })
    expect(wrong.status()).toBe(401)

    // O caso que quebrou em producao: o shell nao interpola e o header carrega os catorze caracteres
    // literais. Recusado como qualquer outro segredo errado, que e o que importa -- o log diz 401 e a
    // causa e outra, mas a rota nao abre.
    const literal = await request.get(route, {
      headers: { authorization: 'Bearer $CRON_SECRET' }
    })
    expect(literal.status()).toBe(401)
  })

  // `authorizeCron` remove um prefixo `Bearer ` quando ele existe e nao exige que exista, entao o
  // segredo cru tambem autoriza. Verificado em vez de assumido: e o segredo que autoriza, nao a
  // forma do header, e recusar aqui nao fecharia nada que ja nao esteja fechado.
  test('takes the secret with or without the Bearer prefix', async ({ request }) => {
    const raw = await request.get(route, { headers: { authorization: E2E_CRON_SECRET } })
    expect(raw.ok()).toBeTruthy()
  })

  test('answers an authorized call with a count', async ({ request }) => {
    const res = await request.get(route, {
      headers: { authorization: `Bearer ${E2E_CRON_SECRET}` }
    })

    expect(res.ok()).toBeTruthy()
    // Zero e a resposta normal aqui: a suite nao renderiza previews, entao nao ha arquivo com idade
    // para expirar. O que se verifica e que a rota autoriza e conclui, nao quanto ela apagou.
    expect(await res.json()).toEqual({ pruned: expect.any(Number) })
  })
})
