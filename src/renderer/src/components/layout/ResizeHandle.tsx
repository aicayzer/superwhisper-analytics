import type { PointerEvent as ReactPointerEvent } from 'react'
import { cn } from '@renderer/lib/cn'

interface ResizeHandleProps {
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
  /** Which edge of the parent this handle sits on. */
  edge: 'left' | 'right'
  className?: string
}

/**
 * A thin column-resize hit area on a panel's edge. Visual feedback on hover.
 * The drag math lives in `useResize`.
 */
export function ResizeHandle({
  onPointerDown,
  edge,
  className
}: ResizeHandleProps): React.JSX.Element {
  return (
    <div
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation="vertical"
      className={cn(
        'absolute top-0 bottom-0 z-10 w-1.5 cursor-col-resize',
        edge === 'right' ? '-right-0.5' : '-left-0.5',
        '[-webkit-app-region:no-drag]',
        // Visual feedback only on hover so the handle stays invisible at rest.
        'after:absolute after:inset-y-2 after:left-1/2 after:w-px after:-translate-x-1/2',
        'after:rounded-full after:bg-fg/0 hover:after:bg-fg/20 after:transition-colors',
        className
      )}
    />
  )
}
