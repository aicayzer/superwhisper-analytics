import type { LucideIcon } from 'lucide-react'
import { cn } from '@renderer/lib/cn'

interface PanelToggleProps {
  icon: LucideIcon
  active: boolean
  onClick: () => void
  label: string
}

/**
 * Generic toggle button for any layout panel. Used today only for the
 * sidebar collapse — right-panel toggles live inside `PanelMenu`.
 *
 * Visual state is hover-only by design. We don't mark "active" when the
 * panel is open because it makes the button look perpetually selected.
 * `active` is still used for the aria-pressed value so screen readers
 * know whether the panel is currently visible.
 */
export function PanelToggle({
  icon: Icon,
  active,
  onClick,
  label
}: PanelToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'rounded p-1 text-fg-muted transition-colors [-webkit-app-region:no-drag]',
        'hover:bg-fg/5 hover:text-fg'
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
    </button>
  )
}
