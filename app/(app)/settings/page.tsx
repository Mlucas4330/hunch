import { redirect } from 'next/navigation'
import { BrandSettingsForm } from '@/components/brand-settings-form'
import { InfoHint } from '@/components/info-hint'
import { RichText } from '@/components/rich-text'
import { Card, CardContent } from '@/components/ui/card'
import { brandFor } from '@/lib/brand'
import { getCurrentUser } from '@/lib/current-user'
import { SETTINGS_PATH, SIGNIN_PATH } from '@/lib/constants'
import { dictionaryFor, getDictionary, getLocale } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata() {
  const { metadata } = await getDictionary()
  return pageMetadata({ ...metadata.pages.settings, path: SETTINGS_PATH, index: false })
}

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect(SIGNIN_PATH)

  const t = dictionaryFor(await getLocale())

  return (
    <div className="animate-fade-up space-y-6">
      <div className="space-y-1">
        <p className="panel-label text-micro text-muted-foreground">{t.settings.eyebrow}</p>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight">{t.settings.title}</h1>
          <InfoHint label={t.settings.hintLabel}>
            <RichText>{t.settings.hint}</RichText>
          </InfoHint>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <BrandSettingsForm brand={brandFor(user)} />
        </CardContent>
      </Card>
    </div>
  )
}
