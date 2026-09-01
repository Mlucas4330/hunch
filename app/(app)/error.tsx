'use client'

import { useEffect } from 'react'
import { ErrorScreen } from '@/components/error-screen'
import { useI18n } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'

/**
 * The app group's error boundary.
 *
 * One per route group rather than one at the root, and that is what buys the chrome: a boundary
 * inside a group is rendered as that group's layout's child, so the navbar, the footer and the i18n
 * provider are all still there and the reader keeps a way out. A root `error.tsx` would replace them
 * and have no dictionary to read.
 *
 * `reset()` re-renders the segment. It is offered because a failed data fetch is often transient and
 * a reload is what the reader would do anyway; it is not promised to work, which is why the copy says
 * "try again" rather than claiming the problem is fixed.
 */
export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  const { dictionary } = useI18n()

  // The boundary swallows the error, so without this it never reaches the console or any collector.
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
