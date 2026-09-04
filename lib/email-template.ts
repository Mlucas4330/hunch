import { CONTACT_EMAIL, EMAIL_THEME } from '@/lib/constants'

/**
 * The one layout every mail this product sends is poured into.
 *
 * **Tables and inline styles, which look like 2005 and are simply what works.** Outlook renders
 * through Word, Gmail strips most of a `<style>` block and resolves no CSS variable, and flexbox is
 * unreliable across the rest. So the structure is a table, every rule is an inline `style`, and the
 * colours come from `EMAIL_THEME` because `oklch()` reaches almost nothing.
 *
 * **One template, four mails.** The day-0 link, the two sequence mails and the payment reminder all
 * render through here, so a change to the frame is one change rather than four, and none of them can
 * drift into looking like a different sender. Only the words differ, and they come from the
 * dictionary in the reader's own locale.
 *
 * Everything interpolated is escaped here, so callers pass plain text and never have to remember:
 * one of these strings is a hostname off a URL a stranger submitted.
 */

/**
 * A paragraph, or the one measured line a mail sometimes quotes.
 *
 * They share an array rather than living in two fields because the quote belongs where the copy put
 * it: the sentence before it introduces the number and the sentence after it explains where the
 * number came from. Split into `paragraphs` and `quote`, the quote lands at the end and the prose
 * around it stops making sense.
 */
export type EmailBlock = string | { quote: string }

export type EmailContent = {
  /** The line at the top of the card. Not the subject, though they usually agree. */
  heading: string
  body: EmailBlock[]
  action?: { label: string; href: string }
  /** The quiet line under the button, for a mail that has something to add after the ask. */
  note?: string
  /** Why this person is being written to. Always present in mail nobody explicitly requested. */
  footer?: string
  unsubscribe?: { label: string; href: string }
}

export function renderEmail(content: EmailContent): { html: string; text: string } {
  return { html: html(content), text: text(content) }
}

function text({ heading, body, action, note, footer, unsubscribe }: EmailContent) {
  return [
    heading,
    '',
    ...body.flatMap((block) => [typeof block === 'string' ? block : block.quote, '']),
    ...(action ? [action.href, ''] : []),
    ...(note ? [note, ''] : []),
    ...(footer ? [footer] : []),
    ...(unsubscribe ? [`${unsubscribe.label}: ${unsubscribe.href}`] : [])
  ]
    .join('\n')
    .trim()
}

function html({ heading, body: blocks, action, note, footer, unsubscribe }: EmailContent) {
  const { ink, paper, panel, rule, muted } = EMAIL_THEME

  // The stack ends in `sans-serif` because a client that knows none of these still has to render
  // something, and the system faces are named first so the mail matches the machine it is read on.
  const font =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

  const body = blocks
    .map((block) =>
      typeof block === 'string'
        ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${muted};">${escape(block)}</p>`
        : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="border-left:3px solid ${ink};padding:4px 0 4px 16px;font-size:16px;line-height:1.5;color:${ink};font-weight:600;">${escape(block.quote)}</td></tr></table>`
    )
    .join('')

  // A padded anchor rather than a `<button>` or a styled div: it is the one shape every client
  // renders as something tappable, and it degrades to a plain link where the styles are stripped.
  const button = action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="background-color:${ink};border-radius:6px;"><a href="${escape(action.href)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:${panel};text-decoration:none;">${escape(action.label)}</a></td></tr></table>`
    : ''

  const aside = note
    ? `<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${muted};">${escape(note)}</p>`
    : ''

  const sign = [
    footer ? `<p style="margin:0 0 6px;">${escape(footer)}</p>` : '',
    `<p style="margin:0 0 6px;">Hunch &middot; <a href="mailto:${CONTACT_EMAIL}" style="color:${muted};">${CONTACT_EMAIL}</a></p>`,
    unsubscribe
      ? `<p style="margin:0;"><a href="${escape(unsubscribe.href)}" style="color:${muted};">${escape(unsubscribe.label)}</a></p>`
      : ''
  ].join('')

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${paper};margin:0;padding:32px 12px;font-family:${font};">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:${panel};border:1px solid ${rule};border-radius:10px;">
        <tr>
          <td style="padding:28px 32px 0;">
            <p style="margin:0 0 24px;font-size:15px;font-weight:700;letter-spacing:-0.01em;color:${ink};">Hunch</p>
            <h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;font-weight:700;letter-spacing:-0.02em;color:${ink};">${escape(heading)}</h1>
            ${body}${button}${aside}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="border-top:1px solid ${rule};padding-top:16px;font-size:12px;line-height:1.6;color:${muted};">${sign}</td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

// Every value that reaches the markup passes through here, hostnames off submitted URLs included.
function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
