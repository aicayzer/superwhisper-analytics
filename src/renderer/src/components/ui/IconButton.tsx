import { cn } from '@renderer/lib/cn'
import { Slot } from 'radix-ui'
import * as React from 'react'

/**
 * Shared 28×28 ghost icon button. Used everywhere an icon-only action
 * appears in the chrome — sidebar header, navbar, transcript actions.
 *
 * Behaviour:
 *   • h-7 w-7 (28×28) — same height as the RangePill so chrome rows
 *     line up flush.
 *   • Ghost styling: muted grey by default, subtle hover wash.
 *   • [-webkit-app-region:no-drag] so clicks work inside the draggable
 *     header strip.
 *   • `asChild` forwards styling onto a child element (e.g. wrap a
 *     `<Link>` for back-arrow nav while keeping consistent visuals).
 *
 * Pass any custom className to extend or override (e.g. the active
 * NavLink state in the sidebar footer).
 */
type IconButtonProps = React.ComponentProps<'button'> & {
  asChild?: boolean
}

function IconButton({
  className,
  asChild = false,
  type,
  ...props
}: IconButtonProps): React.JSX.Element {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      // Only set `type` for actual <button> elements — Slot may render an <a>.
      {...(asChild ? {} : { type: type ?? 'button' })}
      data-slot="icon-button"
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
        'text-muted-foreground transition-colors',
        'hover:bg-foreground/5 hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40',
        'disabled:pointer-events-none disabled:opacity-30',
        '[-webkit-app-region:no-drag]',
        className
      )}
      {...props}
    />
  )
}

export { IconButton }
