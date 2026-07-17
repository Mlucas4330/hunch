import Link from 'next/link'
import { auth } from '@/auth'
import { Button } from '@/components/ui/button'

export default async function HomePage() {
  const session = await auth()
  const ctaHref = session?.user ? '/dashboard' : '/auth/signin'

  return (
    <section className="animate-fade-up mx-auto flex max-w-2xl flex-col items-center gap-6 py-20 text-center">
      <span className="panel-label text-[0.7rem] text-muted-foreground">Hunch</span>
      <h1 className="text-balance font-display text-4xl font-bold tracking-tight sm:text-5xl">
        Find it. Test it. Prove what converts.
      </h1>
      <p className="text-balance text-lg text-muted-foreground">
        Paste a landing page URL and get a ranked list of A/B test hypotheses - each with a
        rationale, an impact and effort score, and finished variant copy to ship.
      </p>
      <Button asChild size="lg">
        <Link href={ctaHref}>Analyze your landing page</Link>
      </Button>
    </section>
  )
}
