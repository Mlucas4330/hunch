import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'
import { signIn } from '@/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Wordmark } from '@/components/wordmark'

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex justify-center py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Wordmark />
          <CardTitle className="font-display tracking-tight">Sign in</CardTitle>
          <CardDescription>Continue with your Google account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: '/dashboard' })
            }}
          >
            <Button type="submit" className="w-full">
              Continue with Google
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form
            action={async (formData: FormData) => {
              'use server'
              try {
                await signIn('credentials', {
                  email: formData.get('email'),
                  password: formData.get('password'),
                  redirectTo: '/dashboard'
                })
              } catch (err) {
                if (err instanceof AuthError) redirect('/auth/signin?error=credentials')
                throw err
              }
            }}
            className="space-y-3"
          >
            <Input name="email" type="email" placeholder="Admin email" required autoComplete="email" />
            <Input name="password" type="password" placeholder="Password" required autoComplete="current-password" />
            {error && <p className="text-sm text-destructive">Invalid credentials</p>}
            <Button type="submit" variant="outline" className="w-full">
              Sign in as admin
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
