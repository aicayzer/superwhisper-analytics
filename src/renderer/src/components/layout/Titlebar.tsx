import type { ReactNode } from 'react'
import { cn } from '@renderer/lib/cn'

interface TitlebarProps {
  children?: ReactNode
  className?: string
}

/**
 * Drag region at the top of MainPane. The native macOS traffic lights are
 * positioned by the main process (trafficLightPosition: { x: 18, y: 18 }) —
 * the pl-[88px] reserves room for them inside this titlebar. h-12 keeps the
 * vertical centre aligned with the traffic lights' centre.
 *
 * Anything interactive inside this region needs `[-webkit-app-region:no-drag]`
 * so clicks aren't swallowed by the drag handler.
 */
export function Titlebar({ children, className }: TitlebarProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex h-12 shrink-0 items-center gap-2 pl-[88px] pr-3',
        '[-webkit-app-region:drag]',
        className
      )}
    >
      {children}
    </div>
  )
}
