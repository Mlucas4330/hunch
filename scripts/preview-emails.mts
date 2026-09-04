/**
 * Sends one of every mail this product writes to a single address, so they can be read in a real
 * client instead of guessed at from the dictionary.
 *
 * The sequence mails are built by `lib/lead-sequence.ts` itself, so what arrives is what a lead
 * would get. The day-0 mail and the payment reminder are assembled here from the same dictionary
 * keys and the same template their routes use, because those live inside route modules and a route
 * may only export handlers.
 *
 * Usage: npm run preview:emails -- you@example.com [pt-BR|en]
 */
process.env.NEXT_PUBLIC_APP_URL ??= 'https://hunch.solutions'

import { randomUUID } from 'node:crypto'
import { sendEmail } from '../lib/email.ts'
import { renderEmail } from '../lib/email-template.ts'
import { message, unsubscribeUrl, type Candidate } from '../lib/lead-sequence.ts'
import { dictionaryFor } from '../lib/i18n/index.ts'
import { t } from '../lib/i18n/format.ts'
import { siteOrigin } from '../lib/app-url.ts'
import { displayHost } from '../lib/host.ts'
import { CREDITS_ANCHOR, DEFAULT_LOCALE, LEAD_SEQUENCE } from '../lib/constants.ts'
import type { Locale } from '../lib/enums.ts'

const to = process.argv[2]
const locale = (process.argv[3] as Locale) ?? DEFAULT_LOCALE

if (!to) {
  console.error('Usage: npm run preview:emails -- you@example.com [pt-BR|en]')
  process.exit(1)
}

const URL_SAMPLE = 'https://exemplo.com.br/planos'
const EMBED_KEY = randomUUID()
const TOKEN = randomUUID()

const dictionary = dictionaryFor(locale)
const host = displayHost(URL_SAMPLE)
const report = `${siteOrigin()}/r/${EMBED_KEY}`
const leave = { label: dictionary.watch.sequence.unsubscribe, href: unsubscribeUrl(TOKEN) }

const lead: Candidate = {
  id: randomUUID(),
  email: to,
  stage: 0,
  unsubscribedAt: null,
  consentedAt: new Date(),
  lastEmailedAt: null,
  createdAt: new Date(),
  locale,
  analysisId: randomUUID(),
  url: URL_SAMPLE,
  embedKey: EMBED_KEY
}

function dayZero() {
  const copy = dictionary.watch.email

  return {
    to,
    unsubscribeUrl: leave.href,
    subject: copy.subject,
    ...renderEmail({
      heading: copy.heading,
      body: [t(copy.body, { host })],
      action: { label: copy.cta, href: report },
      note: copy.keep,
      footer: copy.footer,
      unsubscribe: leave
    })
  }
}

function reminder() {
  const copy = dictionary.credits.reminder

  return {
    to,
    subject: copy.subject,
    ...renderEmail({
      heading: copy.heading,
      body: [copy.body],
      action: { label: copy.cta, href: `${siteOrigin()}${CREDITS_ANCHOR}` },
      footer: copy.footer
    })
  }
}

// A counted line in the shape `findingSentence` emits: the label the screen uses, then the value.
// Written out rather than measured, because this script scrapes nothing.
const FINDING = 'Tempo até o maior elemento aparecer: 4,2 s'

const mails = [
  ['dia 0, o link do relatório', dayZero()],
  ['dia 2, a medição', message(lead, LEAD_SEQUENCE[0], TOKEN, FINDING)],
  ['dia 7, a oferta', message(lead, LEAD_SEQUENCE[1], TOKEN)],
  ['pagamento pendente', reminder()]
] as const

for (const [label, mail] of mails) {
  const sent = await sendEmail(mail)
  console.log(`${sent ? 'enviado' : 'FALHOU '}  ${label}  ${mail.subject}`)
}
