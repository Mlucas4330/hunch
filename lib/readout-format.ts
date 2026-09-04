import { BYTES_PER_MEGABYTE, MS_PER_SECOND } from '@/lib/constants'
import { formatDecimal, formatNumber, t } from '@/lib/i18n/format'
import type { Dictionary } from '@/lib/i18n'
import type { Locale, ReadoutUnit } from '@/lib/enums'
import type { MeasuredFinding } from '@/lib/readout'

/**
 * Turning a measured number into the string a reader sees, in one place.
 *
 * It lived inside `components/measured-readout.tsx` while the screen was the only thing that showed
 * a number. The lead sequence mails one too, from the server, and a second copy of this is a second
 * place where megabytes could start rounding differently from the report they link to.
 *
 * **It formats and says nothing.** The sentence around the number is
 * `dictionary.readout.findings[id]`, exactly as before, and no wording lives here. See
 * docs/readout.md.
 */

export type ReadoutCopy = Dictionary['readout']

export function readoutUnit(
  value: number,
  unit: ReadoutUnit,
  copy: ReadoutCopy,
  locale: Locale
): string {
  switch (unit) {
    case 'presence':
      return value === 1 ? copy.presence.yes : copy.presence.no
    case 'seconds':
      return t(copy.units.seconds, { value: formatDecimal(value / MS_PER_SECOND, locale, 1) })
    case 'megabytes':
      return t(copy.units.megabytes, {
        value: formatDecimal(value / BYTES_PER_MEGABYTE, locale, 1)
      })
    default:
      return formatNumber(value, locale)
  }
}

/**
 * **The `at least` qualifier belongs to the measured value and to nothing else.** It is there
 * because SCRAPE_ALLOWED_RESOURCE_TYPES blocks media, so the bytes counted are a floor. Keeping it
 * out of `readoutUnit` is what stops a delta reading "+at least 0.3 MB" and a threshold reading "at
 * least 2 MB" as if our own boundary were approximate. See docs/invariants.md.
 */
export function readoutValue(
  finding: MeasuredFinding,
  copy: ReadoutCopy,
  locale: Locale
): string {
  const rendered = readoutUnit(finding.value, finding.unit, copy, locale)

  return finding.unit === 'megabytes' ? `${copy.atLeast} ${rendered}` : rendered
}
