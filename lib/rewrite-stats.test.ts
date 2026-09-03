import { test } from 'node:test'
import assert from 'node:assert/strict'
import { claimsGeneralTruth, rewriteStats } from './rewrite-stats'

// The two real rewrites this measurement was built to name. Both were stored, ranked and shown to a
// reader as recommended replacements. See docs/ai-pipeline.md.
test('a reordered line is a permutation, whatever it looks like', () => {
  const stats = rewriteStats(
    'Sem cadastro, sem cartão, sem instalar nada. Só a sua URL.',
    'Só a sua URL. Sem cadastro, sem cartão, sem instalar nada.'
  )

  assert.equal(stats.permutation, true)
  assert.equal(stats.newWords, 0)
  assert.equal(stats.reuseRatio, 1)
})

test('emoji and punctuation are not words, so reordering badges is still a permutation', () => {
  const stats = rewriteStats(
    '🔒 Criptografia em trânsito e repouso🔑 Seus dados são só seus⚖️ Em conformidade com a LGPD',
    '⚖️ Em conformidade com a LGPD 🔒 Criptografia em trânsito e repouso 🔑 Seus dados são só seus'
  )

  assert.equal(stats.permutation, true)
})

// The claim is narrow on purpose. A rewrite keeps the product's own nouns, and high reuse is the
// normal case rather than the failure -- a quarter of real rewrites sit above 70%.
test('a rewrite that keeps the product noun and adds an idea is not a permutation', () => {
  const stats = rewriteStats(
    'Um crédito, uma análise completa.',
    'A nota é gratuita. O crédito compra as correções e a copy já escrita.'
  )

  assert.equal(stats.permutation, false)
  assert.ok(stats.newWords > 0)
  assert.ok(stats.reuseRatio > 0, 'it did reuse words, and that is fine')
})

test('one added word is enough to stop being a permutation', () => {
  const stats = rewriteStats('Ver minha nota agora', 'Ver minha nota agora, grátis')

  assert.equal(stats.permutation, false)
  assert.equal(stats.newWords, 1)
})

test('case and punctuation are not a difference', () => {
  const stats = rewriteStats('Comece grátis, sem cartão!', 'COMECE GRATIS SEM CARTAO')

  // "grátis" and "gratis" are different words, and that is correct: nothing here strips accents,
  // because pt-BR copy that loses them is a real defect rather than a formatting variant.
  assert.equal(stats.newWords, 2)
})

test('an empty replacement reuses nothing and is not a permutation', () => {
  const stats = rewriteStats('Ver minha nota', '')

  assert.equal(stats.permutation, false)
  assert.equal(stats.reuseRatio, 0)
  assert.equal(stats.words, 0)
})

test('the word ceiling is the element length plus the budget, not a fixed number', () => {
  // Four words in, so the budget is max(4 + 3, ceil(4 * 1.5)) = 7.
  assert.equal(rewriteStats('a b c d', 'e f g h i j k').overWordBudget, false)
  assert.equal(rewriteStats('a b c d', 'e f g h i j k l').overWordBudget, true)
})

test('a bracket in the replacement is a placeholder the founder still has to fill', () => {
  assert.equal(rewriteStats('Trusted by teams', 'Trusted by [number] teams').hasPlaceholder, true)
  assert.equal(rewriteStats('Trusted by teams', 'Trusted by 40 teams').hasPlaceholder, false)
})

// Measures a floor, never a total: it recognises the phrasings that turned up, and nothing is
// rejected on it.
test('a rationale that argues from what generally works is flagged', () => {
  assert.equal(
    claimsGeneralTruth(
      'CTAs orientados ao resultado convertem melhor do que CTAs orientados ao preço.'
    ),
    true
  )
  assert.equal(
    claimsGeneralTruth('O headline é o elemento de maior impacto em qualquer landing page.'),
    true
  )
})

test('a rationale that argues from this page is not flagged', () => {
  assert.equal(
    claimsGeneralTruth(
      'A linha atual termina no problema sem nomear a solução, então o visitante precisa inferir o que o produto faz.'
    ),
    false
  )
})
