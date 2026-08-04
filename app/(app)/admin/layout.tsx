import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/current-user'
import { isAdmin } from '@/lib/auth-policy'

// Middleware only guarantees a session, so every signed-in user reaches /admin without this. Gating
// at the layout means a page added under this segment is operator-only by default rather than by
// remembering to repeat the check.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!isAdmin(user?.email)) notFound()

  return <>{children}</>
}
