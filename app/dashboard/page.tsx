import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your analyses</h1>
        <Button>New analysis</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No analyses yet</CardTitle>
          <CardDescription>
            Paste a landing page URL to generate your first set of A/B test hypotheses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button>Analyze your first landing page</Button>
        </CardContent>
      </Card>
    </div>
  )
}
