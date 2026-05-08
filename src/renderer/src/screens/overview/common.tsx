import { cn } from '@renderer/lib/cn'

/** Lightweight badge for a recording mode — used across all overview variants. */
export function ModeBadge({
  mode,
  className
}: {
  mode: string
  className?: string
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground',
        className
      )}
    >
      {mode}
    </span>
  )
}
