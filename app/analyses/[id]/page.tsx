import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AnalysisDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Analysis</h1>
      <Card>
        <CardHeader>
          <CardTitle>Hypotheses</CardTitle>
          <CardDescription>Analysis {id} -- hypothesis breakdown coming soon.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The ranked hypothesis cards will render here once the analysis pipeline is wired up.
        </CardContent>
      </Card>
    </div>
  )
}
