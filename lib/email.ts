import { EMAIL_API_ORIGIN } from '@/lib/constants'
import { log } from '@/lib/log'

/**
 * Sending mail, over Resend's HTTP API.
 *
 * **Called over `fetch` rather than through the official SDK**, for the same reason
 * lib/mercadopago.ts is: the one thing needed from it is a single POST, and a dependency that ships
 * a whole client for that is a dependency to keep updated for no gain.
 *
 * **It never throws and never rejects.** Every caller so far is a route that has already done the
 * thing that mattered -- the lead row is written before this is called -- so a provider outage must
 * cost the message and never the work. It answers a boolean for callers that want to know, and logs
 * either way.
 */

type Message = {
  to: string
  subject: string
  html: string
  text: string
}

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

export async function sendEmail(message: Message): Promise<boolean> {
  // Absent credentials are a deploy that cannot send, not an error at the call site. Local dev runs
  // without them all the time, and a form that failed because nobody set an API key would be a form
  // that fails on every machine but production.
  if (!emailEnabled()) {
    log.warn('email.skipped', { to: message.to, subject: message.subject })
    return false
  }

  try {
    const response = await fetch(`${EMAIL_API_ORIGIN}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text
      })
    })

    if (!response.ok) {
      log.error('email.failed', undefined, {
        to: message.to,
        subject: message.subject,
        status: response.status
      })
      return false
    }

    log.info('email.sent', { to: message.to, subject: message.subject })
    return true
  } catch (error) {
    log.error('email.failed', error, { to: message.to, subject: message.subject })
    return false
  }
}
