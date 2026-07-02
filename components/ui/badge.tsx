import * as React from 'react'
import { cn } from '@/lib/utils'

function Badge({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'panel-label inline-flex items-center rounded-sm border border-current/25 px-1.5 py-0.5 text-[0.65rem] font-medium',
        className
      )}
      {...props}
    />
  )
}

export { Badge }
