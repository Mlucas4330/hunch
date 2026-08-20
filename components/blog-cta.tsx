import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/current-user'
import { POST_SIGNIN_REDIRECT } from '@/lib/constants'
import { getDictionary } from '@/lib/i18n'

export async function BlogCta() {
  const user = await getCurrentUser()
  const { blog } = await getDictionary()

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
        <div className="space-y-2">
          <h2 className="max-w-lg font-display text-2xl font-bold tracking-tight">
            {blog.cta.heading}
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">{blog.cta.body}</p>
        </div>
        <Button asChild size="lg">
          <Link href={user ? POST_SIGNIN_REDIRECT : '/auth/signin'}>{blog.cta.button}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
