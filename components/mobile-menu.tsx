'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'

export function MobileMenu({ label, children }: { label: string; children: ReactNode }) {
  const pathname = usePathname()
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.open = false
  }, [pathname])

  return (
    <details ref={ref} className="relative md:hidden" data-testid="mobile-menu">
      <summary
        aria-label={label}
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-sm border transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden"
      >
        <Menu aria-hidden className="h-4 w-4" />
      </summary>

      <div className="absolute right-0 z-10 mt-2 w-[min(16rem,calc(100vw-2rem))] space-y-3 rounded-md border bg-card p-3 shadow-sm">
        {children}
      </div>
    </details>
  )
}
