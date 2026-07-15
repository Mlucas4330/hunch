import Link from 'next/link'
import { auth } from '@/auth'
import { AccountMenu } from '@/components/account-menu'
import { NavLinks } from '@/components/nav-links'
import { Wordmark } from '@/components/wordmark'
import { Button } from '@/components/ui/button'

export async function Navbar() {
  const session = await auth()

  return (
    <header className="sticky top-0 z-40 border-b bg-paper/80 backdrop-blur print:hidden">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="Hunch home">
          <Wordmark />
        </Link>

        <div className="flex items-center gap-5">
          {session?.user ? (
            <>
              <NavLinks />
              <AccountMenu user={session.user} />
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
