import { CONTACT_EMAIL, EMAIL_API_ORIGIN } from '@/lib/constants'
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
  /**
   * The unsubscribe link, for the mails that carry one.
   *
   * **Given here it becomes a header, not only a line in the body.** Gmail and Yahoo ask bulk
   * senders for `List-Unsubscribe`, and a mail without it is likelier to land in spam than in the
   * inbox. The header also puts the unsubscribe button next to the sender's name, where somebody
   * annoyed enough to leave finds it before they find the spam button, which is the outcome that
   * actually protects the domain.
   *
   * `One-Click` means the mail client POSTs this URL itself, so the route answers POST as well as
   * GET. See docs/api.md.
   */
  unsubscribeUrl?: string
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
        // A reply is the one thing every message here invites and none of them handles: the sequence
        // writes to somebody who is not a customer yet, and the reply-to is where that answer lands.
        // It is `CONTACT_EMAIL` rather than `EMAIL_FROM` because the sender address is a deploy
        // setting and the mailbox a reader is promised is the one in the privacy policy.
        reply_to: CONTACT_EMAIL,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.unsubscribeUrl
          ? {
              headers: {
                'List-Unsubscribe': `<${message.unsubscribeUrl}>`,
                'List-Unsubscribe-Post': 'List=One-Click'
              }
            }
          : {})
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
