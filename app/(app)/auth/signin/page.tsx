import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'
import { signIn } from '@/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Wordmark } from '@/components/wordmark'
import { getDictionary } from '@/lib/i18n'
import { credentialsLoginAllowed, safeCallbackUrl } from '@/lib/auth-policy'
import { CALLBACK_URL_PARAM } from '@/lib/constants'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.signin, path: '/auth/signin', index: false })
}

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; [CALLBACK_URL_PARAM]?: string }>
}) {
  const params = await searchParams
  const t = await getDictionary()
  const error = params.error
  // Middleware puts the page the visitor was trying to reach here, so sign-in returns them to it
  // instead of always to the dashboard. Validated because it reaches `redirectTo` -- see
  // safeCallbackUrl.
  const callbackUrl = safeCallbackUrl(params[CALLBACK_URL_PARAM])
  // Read from exactly the condition the provider itself checks, so the form is never offered
  // when it cannot work.
  const showCredentialsForm = credentialsLoginAllowed()

  return (
    <div className="flex justify-center py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Wordmark />
          <CardTitle className="font-display tracking-tight">{t.signIn.title}</CardTitle>
          <CardDescription>{t.signIn.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: callbackUrl })
            }}
          >
            <Button type="submit" className="w-full">
              {t.signIn.google}
            </Button>
          </form>

          {/* Local/e2e only -- the credentials provider itself refuses in production. */}
          {showCredentialsForm && (
            <>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>{t.common.or}</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <form
                action={async (formData: FormData) => {
                  'use server'
                  try {
                    await signIn('credentials', {
                      email: formData.get('email'),
                      password: formData.get('password'),
                      redirectTo: callbackUrl
                    })
                  } catch (err) {
                    // The callbackUrl rides along, so a mistyped password does not cost the deep
                    // link the visitor arrived with.
                    if (err instanceof AuthError) {
                      const retry = new URLSearchParams({
                        error: 'credentials',
                        [CALLBACK_URL_PARAM]: callbackUrl
                      })
                      redirect(`/auth/signin?${retry}`)
                    }
                    throw err
                  }
                }}
                className="space-y-3"
              >
                <Input
                  name="email"
                  type="email"
                  placeholder={t.signIn.adminEmail}
                  required
                  autoComplete="email"
                />
                <Input
                  name="password"
                  type="password"
                  placeholder={t.signIn.password}
                  required
                  autoComplete="current-password"
                />
                {error && <p className="text-sm text-destructive">{t.signIn.invalidCredentials}</p>}
                <Button type="submit" variant="outline" className="w-full">
                  {t.signIn.adminSubmit}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
