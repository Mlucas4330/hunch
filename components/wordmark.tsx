export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="flex h-3.5 items-end gap-0.5">
        <span className="h-1/3 w-0.75 rounded-[1px] bg-foreground" />
        <span className="h-2/3 w-0.75 rounded-[1px] bg-foreground" />
        <span className="h-full w-0.75 rounded-[1px] bg-foreground" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight text-foreground">Hunch</span>
    </span>
  )
}
