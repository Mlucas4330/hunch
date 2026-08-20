import { RichText } from '@/components/rich-text'
import { formatDate } from '@/lib/i18n/format'
import type { Locale } from '@/lib/enums'
import type { Dictionary } from '@/lib/i18n/dictionaries/en'

type Post = Dictionary['blog']['posts'][keyof Dictionary['blog']['posts']]

export function BlogArticle({
  post,
  date,
  locale
}: {
  post: Post
  date: Date
  locale: Locale
}) {
  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-4">
        <p className="panel-label text-[0.7rem] text-muted-foreground">
          {formatDate(date, locale)}
        </p>
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="text-base text-muted-foreground">{post.lead}</p>
      </header>

      <div className="space-y-10 border-t pt-8">
        {post.sections.map((section) => (
          <section key={section.heading} className="reveal space-y-4">
            <h2 className="font-display text-xl font-semibold tracking-tight">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                <RichText>{paragraph}</RichText>
              </p>
            ))}
            {section.bullets.length > 0 && (
              <ul className="space-y-2 border-l pl-5">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="text-sm leading-relaxed text-muted-foreground">
                    <RichText>{bullet}</RichText>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  )
}
