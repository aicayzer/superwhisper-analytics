import { cn } from '@renderer/lib/cn'

interface PickTileProps {
  picked: boolean
  /** Plain-English title. */
  label: string
  /** Optional small secondary line — used for the canonical ref string. */
  subtitle?: string
  onClick: () => void
  className?: string
}

/**
 * Compact tile used by the destination + field-source pickers. Two
 * lines: plain-English label, optional muted subtitle. Selection is
 * conveyed by a dark-grey border + subtle tinted background — no radio
 * icon, no preview value, no type tag. Designed to sit in a 2-column
 * grid so a list of 10+ options reads at a glance instead of as a
 * scrolling stack of tall rows.
 */
export function PickTile({
  picked,
  label,
  subtitle,
  onClick,
  className
}: PickTileProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={picked}
      className={cn(
        'flex min-w-0 flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors',
        picked
          ? 'border-foreground/40 bg-foreground/[0.04]'
          : 'border-border bg-card hover:bg-foreground/[0.04]',
        className
      )}
    >
      <span className="block w-full truncate text-[12.5px] font-medium text-foreground">
        {label}
      </span>
      {subtitle && (
        <span className="block w-full truncate text-[11px] text-muted-foreground">{subtitle}</span>
      )}
    </button>
  )
}
