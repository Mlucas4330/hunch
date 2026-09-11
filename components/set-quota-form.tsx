'use client'

import { useActionState, useState } from 'react'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/submit-button'
import { useI18n } from '@/components/i18n-provider'
import { setQuotaAction, type QuotaState } from '@/lib/actions/accounts'
import { ADMIN_QUOTA_MAX, DEFAULT_MONTHLY_QUOTA, PLAN } from '@/lib/constants'
import { PLAN_TIER } from '@/lib/enums'
import { formatNumber } from '@/lib/i18n/format'
import { cn } from '@/lib/utils'

/**
 * The form behind the operator screen. It carries no authorization of its own: the action re-checks
 * the role on the server.
 *
 * The tier buttons write the quota that tier was sold with, from the same PLAN the landing page
 * prints, so a 6 typed where 60 was meant is one click instead of a habit. The field still takes any
 * number: what an account is owed is an agreement, not an enum.
 */
export function SetQuotaForm() {
  const { dictionary, locale } = useI18n()
  const copy = dictionary.admin.accounts
  const plans = dictionary.landing.pricing.plans
  const [quota, setQuota] = useState(String(DEFAULT_MONTHLY_QUOTA))
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
            value={quota}
            onChange={(event) => setQuota(event.target.value)}
            className="font-mono"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={copy.presetsAria}>
        {PLAN_TIER.map((tier) => (
          <button
            key={tier}
            type="button"
            onClick={() => setQuota(String(PLAN[tier].quota))}
            className="panel-label rounded-full border px-3 py-1 text-micro text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            {plans[tier].name} {formatNumber(PLAN[tier].quota, locale)}
          </button>
        ))}
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
