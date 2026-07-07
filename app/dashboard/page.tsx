import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { UrlInputForm } from '@/components/url-input-form'
import { AnalysisHistory } from '@/components/analysis-history'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  const rows = user
    ? await db
        .select()
        .from(analyses)
        .where(eq(analyses.userId, user.id))
        .orderBy(desc(analyses.createdAt))
    : []

  const plan = user?.plan ?? 'free'
  const defaultBrief = rows.find((row) => row.brief)?.brief ?? ''

  return (
    <div className="animate-fade-up space-y-6">
      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">Dashboard</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">Your analyses</h1>
        <p className="text-sm text-muted-foreground">
          Paste a landing page URL to generate ranked A/B test hypotheses.
        </p>
      </div>

      <UrlInputForm plan={plan} defaultBrief={defaultBrief} />

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-display tracking-tight">No analyses yet</CardTitle>
            <CardDescription>
              Paste a landing page URL above to run your first analysis.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <AnalysisHistory
          analyses={rows.map((analysis) => ({
            id: analysis.id,
            url: analysis.url,
            date: analysis.createdAt.toLocaleDateString()
          }))}
        />
      )}
    </div>
  )
}
