import type { DefaultSession } from 'next-auth'
import type { SubscriptionPlan } from '@/lib/enums'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      plan: SubscriptionPlan
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    plan?: SubscriptionPlan
  }
}
