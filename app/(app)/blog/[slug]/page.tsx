import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { BlogArticle } from '@/components/blog-article'
import { BlogCta } from '@/components/blog-cta'
import { BLOG_PATH, BLOG_POST_DATE } from '@/lib/constants'
import { BLOG_SLUG, type BlogSlug } from '@/lib/enums'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

type Params = { params: Promise<{ slug: string }> }

function isBlogSlug(value: string): value is BlogSlug {
  return (BLOG_SLUG as readonly string[]).includes(value)
}

export function generateStaticParams() {
  return BLOG_SLUG.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params
  if (!isBlogSlug(slug)) return {}

  const { blog } = await getDictionary()
  const post = blog.posts[slug]

  return pageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `${BLOG_PATH}/${slug}`,
    index: true
  })
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params
  if (!isBlogSlug(slug)) notFound()

  const locale = await getLocale()
  const { blog } = dictionaryFor(locale)
  const others = BLOG_SLUG.filter((other) => other !== slug)

  return (
    <div className="animate-fade-up space-y-12 pb-12">
      <Link
        href={BLOG_PATH}
        className="panel-label flex items-center gap-1.5 text-[0.7rem] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3" aria-hidden />
        {blog.backToIndex}
      </Link>

      <BlogArticle
        post={blog.posts[slug]}
        date={new Date(BLOG_POST_DATE[slug])}
        locale={locale}
      />

      <div className="reveal mx-auto max-w-2xl space-y-4 border-t pt-8">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{blog.postsLabel}</p>
        <ul className="space-y-2">
          {others.map((other) => (
            <li key={other}>
              <Link
                href={`${BLOG_PATH}/${other}`}
                className="font-display text-base font-semibold tracking-tight text-muted-foreground transition-colors hover:text-foreground"
              >
                {blog.posts[other].title}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <BlogCta />
    </div>
  )
}
