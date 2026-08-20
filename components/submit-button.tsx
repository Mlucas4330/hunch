'use client'

import { Loader2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'
import { Button, type ButtonProps } from '@/components/ui/button'

/**
 * A submit control that shows the round trip it started.
 *
 * Server action forms had no pending state anywhere: a sign in, a sign out or a language switch left
 * the button looking untouched for as long as the request took, which is the click that reads as
 * ignored. The spinner is added next to the label rather than replacing it, so no surface needs a
 * second string per button.
 */
export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
}

/**
 * Dims and disables a whole form while its action runs, for controls that are not a single Button --
 * `useFormStatus` reports the form, not which of its buttons was pressed.
 */
export function PendingFieldset({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()

  return (
    <fieldset
      disabled={pending}
      aria-busy={pending}
      className="flex items-center gap-1 transition-opacity disabled:opacity-50"
    >
      {children}
    </fieldset>
  )
}
