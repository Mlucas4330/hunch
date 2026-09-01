'use client'

import { useActionState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/submit-button'
import { useI18n } from '@/components/i18n-provider'
import { fireConfetti } from '@/components/confetti'
import { grantCreditsAction, type GrantState } from '@/lib/actions/credits'
import { ADMIN_GRANT_MAX } from '@/lib/constants'
import { cn } from '@/lib/utils'

/**
 * The form behind the operator screen.
 *
 * It carries no authorization of its own and is not supposed to: the action it posts to re-checks the
 * role on the server, because a server action is a public endpoint and a form is only a convenient
 * way to reach it. Hiding this component would hide the button, never the endpoint.
 */
export function GrantCreditsForm({ defaultEmail }: { defaultEmail: string }) {
  const { dictionary } = useI18n()
  const copy = dictionary.admin.credits
  const [state, action] = useActionState<GrantState, FormData>(grantCreditsAction, null)

  // The action returns a fresh object per submit, so two grants in a row burst twice -- which is the
  // point: the confirmation is a small green line, and the operator's eye is on the form, not on it.
  useEffect(() => {
    if (state?.ok) void fireConfetti()
  }, [state])

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <label className="block space-y-1">
          <span className="panel-label text-micro text-muted-foreground">{copy.emailLabel}</span>
          <Input
            name="email"
            type="email"
            required
            defaultValue={defaultEmail}
            placeholder={copy.emailPlaceholder}
            className="font-mono"
          />
        </label>

        <label className="block space-y-1">
          <span className="panel-label text-micro text-muted-foreground">
            {copy.creditsLabel}
          </span>
          <Input
            name="credits"
            type="number"
            required
            min={1}
            max={ADMIN_GRANT_MAX}
            defaultValue={1}
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
            {copy.result[state.message as keyof typeof copy.result] ?? copy.result.failed}
          </p>
        )}
      </div>
    </form>
  )
}
