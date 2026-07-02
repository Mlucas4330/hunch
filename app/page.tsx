import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { analyses } from '@/db/schema'
import { getCurrentUser } from '@/lib/current-user'
import { UrlInputForm } from '@/components/url-input-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  const rows = user
    ? await db
        .select()
        .from(analyses)
        .where(eq(analyses.userId, user.id))
        .orderBy(desc(analyses.createdAt))
    : []

  return (
    <div className="animate-fade-up space-y-6">
      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">Dashboard</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">Your analyses</h1>
        <p className="text-sm text-muted-foreground">
          Paste a landing page URL to generate ranked A/B test hypotheses.
        </p>
      </div>

      <UrlInputForm />

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
        <div className="space-y-3" data-testid="analysis-history">
          {rows.map((analysis) => (
            <Link key={analysis.id} href={`/analyses/${analysis.id}`} className="block">
              <Card className="transition-all hover:-translate-y-0.5 hover:border-foreground/20">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <span className="truncate font-mono text-sm">{analysis.url}</span>
                  <span className="panel-label shrink-0 text-[0.65rem] text-muted-foreground">
                    {analysis.createdAt.toLocaleDateString()}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
