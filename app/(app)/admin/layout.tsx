import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/current-user'
import { isAdmin } from '@/lib/auth-policy'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!isAdmin(user)) notFound()

  return <>{children}</>
}
