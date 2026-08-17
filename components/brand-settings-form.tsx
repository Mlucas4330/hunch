'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/components/i18n-provider'
import { t as fill } from '@/lib/i18n/format'
import {
  BRAND_LOGO_DISPLAY_HEIGHT,
  BRAND_LOGO_DISPLAY_MAX_WIDTH,
  BRAND_LOGO_MAX_BYTES,
  BRAND_NAME_MAX_LENGTH
} from '@/lib/constants'
import type { ReportBrand } from '@/lib/report'

const KB = 1024

type Status = 'idle' | 'saving' | 'saved' | 'error'

export function BrandSettingsForm({ brand }: { brand: ReportBrand }) {
  const { dictionary } = useI18n()
  const t = dictionary.settings
  const router = useRouter()

  const [name, setName] = useState(brand.name ?? '')
  const [accent, setAccent] = useState(brand.accent ?? '')
  const [logoUrl, setLogoUrl] = useState(brand.logoUrl)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const maxKb = BRAND_LOGO_MAX_BYTES / KB

  function messageFor(error: string | undefined): string {
    if (error === 'logo_too_large') return fill(t.errorLogoTooLarge, { kb: maxKb })
    if (error === 'unsupported_logo') return t.errorUnsupportedLogo
    if (error === 'invalid_accent') return t.errorInvalidAccent

    return t.error
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('saving')
    setMessage(null)

    const form = new FormData(event.currentTarget)

    try {
      const res = await fetch('/api/brand', { method: 'POST', body: form })
      const body = await res.json().catch(() => null)

      if (!res.ok) {
        setStatus('error')
        setMessage(messageFor(body?.error))
        return
      }

      setLogoUrl(body.brandLogoUrl ?? null)
      setStatus('saved')
      router.refresh()
    } catch {
      setStatus('error')
      setMessage(t.error)
    }
  }

  return (
    <form onSubmit={save} className="space-y-6" data-testid="brand-settings">
      <div className="space-y-2">
        <label htmlFor="brand-name" className="panel-label text-[0.65rem] text-muted-foreground">
          {t.nameLabel}
        </label>
        <Input
          id="brand-name"
          name="name"
          value={name}
          maxLength={BRAND_NAME_MAX_LENGTH}
          placeholder={t.namePlaceholder}
          onChange={(event) => setName(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">{t.nameHint}</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="brand-logo" className="panel-label text-[0.65rem] text-muted-foreground">
          {t.logoLabel}
        </label>

        {logoUrl && (
          <div className="flex items-center gap-3">
            <Image
              src={logoUrl}
              alt={name}
              height={BRAND_LOGO_DISPLAY_HEIGHT}
              width={BRAND_LOGO_DISPLAY_MAX_WIDTH}
              className="h-8 w-auto object-contain object-left"
              unoptimized
            />
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" name="removeLogo" value="1" />
              {t.logoRemove}
            </label>
          </div>
        )}

        <Input id="brand-logo" name="logo" type="file" accept="image/png,image/jpeg" />
        <p className="text-xs text-muted-foreground">{fill(t.logoHint, { kb: maxKb })}</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="brand-accent" className="panel-label text-[0.65rem] text-muted-foreground">
          {t.accentLabel}
        </label>
        <Input
          id="brand-accent"
          name="accent"
          value={accent}
          placeholder="#2C6BED"
          onChange={(event) => setAccent(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">{t.accentHint}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={status === 'saving'} data-testid="save-brand">
          {status === 'saving' ? t.saving : t.save}
        </Button>
        {status === 'saved' && <p className="text-sm text-muted-foreground">{t.saved}</p>}
        {message && <p className="text-sm text-coral">{message}</p>}
      </div>
    </form>
  )
}
