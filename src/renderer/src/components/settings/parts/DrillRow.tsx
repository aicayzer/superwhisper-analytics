import { cn } from '@renderer/lib/cn'
import { ChevronRight, type LucideIcon } from 'lucide-react'

interface DrillRowProps {
  /** Title — usually inline JSX so callers can drop in mono code spans. */
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Optional small icon-in-square to the left of the title. */
  leadingIcon?: LucideIcon
  /** Drop the chevron — used by destructive / "Add a field" rows that
   *  don't push to a sub-view. */
  noChevron?: boolean
  /** Render in accent-blue tone (e.g. "Create new type…"). */
  accent?: boolean
  /** Top border is drawn unless `first` is true. Lets a group stack rows
   *  with internal dividers without painting a leading line. */
  first?: boolean
  onClick?: () => void
  className?: string
}

/**
 * Tappable list-row used inside `Group`. The interaction surface is the
 * whole row; the chevron is decorative. Hover state matches the rest of
 * the app (`hover:bg-foreground/5`).
 */
export function DrillRow({
  title,
  subtitle,
  leadingIcon: Icon,
  noChevron,
  accent,
  first,
  onClick,
  className
}: DrillRowProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.04]',
        !first && 'border-t border-border',
        className
      )}
    >
      {Icon && (
        <span
          className={cn(
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
            accent ? 'text-accent-blue' : 'bg-foreground/[0.05] text-foreground'
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-[13px] font-medium',
            accent ? 'text-accent-blue' : 'text-foreground'
          )}
        >
          {title}
        </span>
        {subtitle && (
          <span className="mt-0.5 block truncate text-[12px] leading-snug text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
      {!noChevron && !accent && (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" strokeWidth={1.7} />
      )}
    </button>
  )
}
