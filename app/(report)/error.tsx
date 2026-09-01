'use client'

import { useEffect } from 'react'
import { ErrorScreen } from '@/components/error-screen'
import { useI18n } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'

/**
 * The report group's error boundary. Same shape as the app group's, and it exists separately for the
 * reason that group's layout exists separately: the report's chrome follows the session, so a
 * signed-out reader who hits this gets the bare screen rather than a navbar that offers them nothing.
 *
 * This is the boundary that matters most. `/r/<embedKey>` is the URL the product asks people to share,
 * so it is the one most often opened by somebody with no account, no context and no second attempt in
 * them.
 */
export default function ReportError({ error, reset }: { error: Error; reset: () => void }) {
  const { dictionary } = useI18n()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <ErrorScreen
      title={dictionary.errors.crashed.title}
      body={dictionary.errors.crashed.body}
      action={<Button onClick={reset}>{dictionary.errors.crashed.retry}</Button>}
    />
  )
}
