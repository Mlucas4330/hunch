import { Menu } from 'lucide-react'
import { Dropdown } from '@/components/ui/dropdown'
import type { ReactNode } from 'react'

export function MobileMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Dropdown
      label={label}
      testId="mobile-menu"
      className="relative md:hidden"
      summaryClassName="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-sm border transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden"
      summary={<Menu aria-hidden className="h-4 w-4" />}
      panelClassName="absolute right-0 z-10 mt-2 w-[min(16rem,calc(100vw-2rem))] space-y-3 rounded-md border bg-card p-3 shadow-elev-3"
    >
      {children}
    </Dropdown>
  )
}
