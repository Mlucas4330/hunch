'use client'

import { useActionState } from 'react'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/submit-button'
import { useI18n } from '@/components/i18n-provider'
import { setQuotaAction, type QuotaState } from '@/lib/actions/accounts'
import { ADMIN_QUOTA_MAX } from '@/lib/constants'
import { cn } from '@/lib/utils'

/**
 * The form behind the operator screen. It carries no authorization of its own: the action re-checks
 * the role on the server.
 */
export function SetQuotaForm() {
  const { dictionary } = useI18n()
  const copy = dictionary.admin.accounts
  const [state, action] = useActionState<QuotaState, FormData>(setQuotaAction, null)

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <label className="block space-y-1">
          <span className="panel-label text-micro text-muted-foreground">{copy.emailLabel}</span>
          <Input
            name="email"
            type="email"
            required
            placeholder={copy.emailPlaceholder}
            className="font-mono"
          />
        </label>

        <label className="block space-y-1">
          <span className="panel-label text-micro text-muted-foreground">{copy.quotaLabel}</span>
          <Input
            name="quota"
            type="number"
            required
            min={0}
            max={ADMIN_QUOTA_MAX}
            defaultValue={0}
            className="font-mono"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>{copy.submit}</SubmitButton>
        {state && (
          <p
            role="status"
            aria-live="polite"
            className={cn('text-sm', state.ok ? 'text-green' : 'text-destructive')}
          >
            {copy.result[state.message]}
          </p>
        )}
      </div>
    </form>
  )
}
