import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/current-user'
import { POST_SIGNIN_REDIRECT, SIGNIN_PATH } from '@/lib/constants'

// There is no public landing page: the product is used by agencies with an account an operator set
// up. See docs/product.md.
export default async function HomePage() {
  const user = await getCurrentUser()
  redirect(user ? POST_SIGNIN_REDIRECT : SIGNIN_PATH)
}
