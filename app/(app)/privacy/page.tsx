import { PRIVACY_PATH, PRIVACY_UPDATED } from '@/lib/constants'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { formatDate, t as fill } from '@/lib/i18n/format'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.privacy, path: PRIVACY_PATH, index: true })
}

/**
 * The privacy policy, rendered from the dictionary like every other page of copy.
 *
 * **Every claim here is one the code can be checked against**, which is the only reason a policy is
 * worth reading: the retention it names is `SCREENSHOT_RETENTION_DAYS`, the cookies it lists are the
 * session and `GCLID_COOKIE`, and the sentence about nothing being loaded from an ad network is the
 * decision in docs/ads.md. A line that stops being true is a line to change here, not to soften.
 *
 * The date comes from `PRIVACY_UPDATED` rather than from the sentence, so the copy cannot disagree
 * with the file about when it last changed.
 */
export default async function PrivacyPage() {
  const locale = await getLocale()
  const { privacy } = dictionaryFor(locale)

  return (
    <div className="animate-fade-up space-y-10 pb-12">
      <header className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{privacy.eyebrow}</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">{privacy.heading}</h1>
        <p className="font-mono text-xs text-muted-foreground">
          {fill(privacy.updated, { date: formatDate(new Date(PRIVACY_UPDATED), locale) })}
        </p>
        <p className="max-w-2xl pt-3 text-sm text-muted-foreground">{privacy.intro}</p>
      </header>

      <div className="max-w-2xl space-y-8">
        {privacy.sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="font-display text-lg font-semibold tracking-tight">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-sm text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
