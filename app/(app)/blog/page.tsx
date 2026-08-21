import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BlogCta } from '@/components/blog-cta'
import { Card, CardContent } from '@/components/ui/card'
import { BLOG_PATH, BLOG_POST_DATE } from '@/lib/constants'
import { BLOG_SLUG } from '@/lib/enums'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { formatDate } from '@/lib/i18n/format'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.blog, path: BLOG_PATH, index: true })
}

export default async function BlogIndexPage() {
  const locale = await getLocale()
  const { blog } = dictionaryFor(locale)

  return (
    <div className="animate-fade-up space-y-16 pb-12">
      <header className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{blog.index.eyebrow}</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">{blog.index.heading}</h1>
        <p className="max-w-2xl pt-1 text-sm text-muted-foreground">{blog.index.intro}</p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {BLOG_SLUG.map((slug) => {
          const post = blog.posts[slug]
          return (
            <Card key={slug} className="relative flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <p className="panel-label text-[0.6rem] text-muted-foreground">
                  {formatDate(new Date(BLOG_POST_DATE[slug]), locale)}
                </p>
                <h2 className="font-display text-lg font-semibold leading-snug tracking-tight">
                  <Link href={`${BLOG_PATH}/${slug}`} className="after:absolute after:inset-0">
                    {post.title}
                  </Link>
                </h2>
                <p className="text-sm text-muted-foreground">{post.excerpt}</p>
                <span className="panel-label mt-auto flex items-center gap-1.5 pt-2 text-[0.6rem] text-muted-foreground">
                  {blog.readMore}
                  <ArrowRight className="size-3" aria-hidden />
                </span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <BlogCta />
    </div>
  )
}
