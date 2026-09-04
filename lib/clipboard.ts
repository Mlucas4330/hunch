/**
 * Writes text to the clipboard, and answers whether it landed.
 *
 * **Two paths, because the first one is not always there.** `navigator.clipboard` is undefined
 * outside a secure context and throws when the permission is refused, so the `execCommand` fallback
 * is what makes this work in an embedded webview and on a plain http origin. Answering `false`
 * rather than throwing is what lets a caller show the reader a way to copy by hand.
 *
 * Shared by every surface that copies: the report link and the fix prompt. It lived inside
 * `components/copy-report-link.tsx` while there was one caller.
 */
export async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
  }

  try {
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(field)
    return ok
  } catch {
    return false
  }
}
