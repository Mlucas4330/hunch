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
  BRAND_LOGO_MAX_KB,
  BRAND_NAME_MAX_LENGTH
} from '@/lib/constants'
import type { ReportBrand } from '@/lib/brand'

type Status = 'idle' | 'saving' | 'saved' | 'error'

export function BrandSettingsForm({ brand }: { brand: ReportBrand }) {
  const { dictionary } = useI18n()
  const copy = dictionary.settings
  const router = useRouter()

  const [name, setName] = useState(brand.name ?? '')
  const [logoUrl, setLogoUrl] = useState(brand.logoUrl)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)

  function messageFor(error: string | undefined): string {
    if (error === 'logo_too_large') return fill(copy.errorLogoTooLarge, { kb: BRAND_LOGO_MAX_KB })
    if (error === 'unsupported_logo') return copy.errorUnsupportedLogo
    if (error === 'name_too_long') return fill(copy.errorNameTooLong, { max: BRAND_NAME_MAX_LENGTH })
    if (error === 'brand_storage_unavailable') return copy.errorStorage
    return copy.error
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setStatus('saving')
    setMessage(null)

    try {
      const res = await fetch('/api/brand', { method: 'POST', body: new FormData(form) })
      const body = await res.json().catch(() => null)

      if (!res.ok) {
        setStatus('error')
        setMessage(messageFor(body?.error))
        return
      }

      setLogoUrl(body.brandLogoUrl ?? null)
      setStatus('saved')
      form.reset()
      setName(body.brandName ?? '')
      router.refresh()
    } catch {
      setStatus('error')
      setMessage(copy.error)
    }
  }

  return (
    <form onSubmit={save} className="space-y-6" data-testid="brand-settings">
      <div className="space-y-2">
        <label htmlFor="brand-name" className="panel-label text-micro text-muted-foreground">
          {copy.nameLabel}
        </label>
        <Input
          id="brand-name"
          name="name"
          value={name}
          maxLength={BRAND_NAME_MAX_LENGTH}
          placeholder={copy.namePlaceholder}
          onChange={(event) => setName(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">{copy.nameHint}</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="brand-logo" className="panel-label text-micro text-muted-foreground">
          {copy.logoLabel}
        </label>

        {logoUrl && (
          <div className="flex flex-wrap items-center gap-4 rounded-md border bg-muted/40 p-3">
            <Image
              src={logoUrl}
              alt={name}
              height={BRAND_LOGO_DISPLAY_HEIGHT}
              width={BRAND_LOGO_DISPLAY_MAX_WIDTH}
              className="h-8 w-auto object-contain object-left"
              unoptimized
            />
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" name="removeLogo" value="1" />
              {copy.logoRemove}
            </label>
          </div>
        )}

        <Input id="brand-logo" name="logo" type="file" accept="image/png,image/jpeg" />
        <p className="text-xs text-muted-foreground">{fill(copy.logoHint, { kb: BRAND_LOGO_MAX_KB })}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3" aria-live="polite">
        <Button type="submit" disabled={status === 'saving'} data-testid="save-brand">
          {status === 'saving' ? copy.saving : copy.save}
        </Button>
        {status === 'saved' && (
          <p className="text-sm text-muted-foreground" data-testid="brand-saved">
            {copy.saved}
          </p>
        )}
        {message && <p className="text-sm text-coral">{message}</p>}
      </div>
    </form>
  )
}
