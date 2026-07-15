import { WaitlistForm } from '@/components/waitlist-form'

export function WaitlistWall({ embedKey, hiddenCount }: { embedKey: string; hiddenCount: number }) {
  return (
    <div className="rounded-lg border border-purple/40 bg-purple/10 p-6 text-center">
      <p className="panel-label text-[0.65rem] text-purple">See more</p>
      <h2 className="mt-2 text-balance font-display text-xl font-bold tracking-tight">
        {hiddenCount} more high-impact {hiddenCount === 1 ? 'test is' : 'tests are'} ready
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Join the waitlist to unlock the full teardown, the recommended copy for every section, and
        live A/B testing on your page.
      </p>
      <div className="mx-auto mt-5 max-w-sm">
        <WaitlistForm embedKey={embedKey} />
      </div>
    </div>
  )
}
