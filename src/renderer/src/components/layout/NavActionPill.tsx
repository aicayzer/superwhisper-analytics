import { cn } from '@renderer/lib/cn'
import type { LucideIcon } from 'lucide-react'

interface NavActionPillProps {
  onClick: () => void
  /** Icon component (lucide). Renders at h-3.5 w-3.5 on the leading edge. */
  icon?: LucideIcon
  label: string
  ariaLabel?: string
  title?: string
}

/**
 * Single-item action pill that sits in the navbar's top-right slot on
 * routes where the date-range pill is hidden (currently just the
 * transcript-detail page, which uses this for "Copy transcript").
 *
 * Visually styled to match an item from the RangePill / Segmented
 * control: same height (h-7), border, surface colour and corner
 * radius. Treated as a single-selected element — it never looks like
 * the "unselected" track that wraps multiple items.
 */
export function NavActionPill({
  onClick,
  icon: Icon,
  label,
  ariaLabel,
  title
}: NavActionPillProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      title={title ?? label}
      className={cn(
        // Text + icon stay muted to match the "Custom" segment in the
        // RangePill — unselected/idle state. Hover bumps to foreground.
        'inline-flex h-7 items-center gap-1.5 rounded-[8px] border border-border bg-foreground/[0.03] px-2.5 text-[11.5px] font-medium text-muted-foreground transition-colors',
        'hover:bg-foreground/[0.05] hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40',
        '[-webkit-app-region:no-drag]'
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />}
      <span>{label}</span>
    </button>
  )
}
