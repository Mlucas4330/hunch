import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { UrlInputForm } from '@/components/url-input-form'
import { AnalysisHistory } from '@/components/analysis-history'
import { InfoHint } from '@/components/info-hint'
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

  const defaultBrief = rows.find((row) => row.brief)?.brief ?? ''

  return (
    <div className="animate-fade-up space-y-6">
      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">Dashboard</p>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight">Your analyses</h1>
          <InfoHint label="How analysis works">
            Paste your live landing page URL. Hunch scans the copy, studies competitors, and generates
            ranked A/B test ideas. Add <strong>business details</strong> so the copy comes back finished
            instead of with [placeholders]. Paste competitor URLs (<strong>Competitor mode</strong>) to
            ground the ideas, or leave it blank to find competitors automatically.
          </InfoHint>
        </div>
        <p className="text-sm text-muted-foreground">
          Paste a landing page URL to generate ranked A/B test hypotheses.
        </p>
      </div>

      <UrlInputForm defaultBrief={defaultBrief} />

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
