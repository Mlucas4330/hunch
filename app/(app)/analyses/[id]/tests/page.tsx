import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { TestList } from '@/components/test-list'
import { Button } from '@/components/ui/button'
import { getDictionary } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { metadata } = await getDictionary()
  return pageMetadata({
    ...metadata.pages.analysisTests,
    path: `/analyses/${id}/tests`,
    index: false
  })
}

export default async function AnalysisTestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) notFound()

  const analysis = await db.query.analyses.findFirst({
    where: and(eq(analyses.id, id), eq(analyses.userId, user.id)),
    with: {
      hypotheses: { with: { variants: { orderBy: (v, { asc }) => asc(v.position) } } }
    }
  })

  if (!analysis) notFound()

  const t = await getDictionary()
  const testable = analysis.hypotheses.filter((hypothesis) => hypothesis.target === 'auto')

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">{t.analysis.backToDashboard}</Link>
        </Button>
        <p className="truncate font-mono text-sm text-muted-foreground">{analysis.url}</p>
      </div>

      <TestList
        analysisId={analysis.id}
        embedKey={analysis.embedKey}
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
        hypotheses={testable}
      />
    </div>
  )
}
