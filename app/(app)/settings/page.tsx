import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/current-user'
import { brandFor } from '@/lib/report'
import { BrandSettingsForm } from '@/components/brand-settings-form'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CONTACT_PATH } from '@/lib/constants'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.settings, path: '/settings', index: false })
}

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/signin')

  const locale = await getLocale()
  const t = dictionaryFor(locale)
  const brand = brandFor(user)

  return (
    <div className="animate-fade-up space-y-6">
      <div className="space-y-1">
        <p className="panel-label text-[0.7rem] text-muted-foreground">{t.settings.eyebrow}</p>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight">{t.settings.title}</h1>
          <InfoHint label={t.settings.hintLabel}>
            <RichText>{t.settings.hint}</RichText>
          </InfoHint>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {brand.whiteLabel ? (
            <BrandSettingsForm brand={brand} />
          ) : (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">{t.settings.lockedTitle}</CardTitle>
                <CardDescription>{t.settings.lockedBody}</CardDescription>
              </CardHeader>
              <Button asChild size="sm">
                <Link href={CONTACT_PATH}>{t.settings.lockedCta}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
