import Link from 'next/link'
import { auth } from '@/auth'
import { PlanBadge } from '@/components/plan-badge'
import { Button } from '@/components/ui/button'

export async function Navbar() {
  const session = await auth()

  return (
    <header className="border-b">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold">
          LP A/B
        </Link>

        <div className="flex items-center gap-4">
          {session?.user ? (
            <>
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
                Dashboard
              </Link>
              <Link href="/billing" className="text-sm text-muted-foreground hover:text-foreground">
                Billing
              </Link>
              <PlanBadge plan={session.user.plan} />
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/auth/signin">Sign in</Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  )
}
