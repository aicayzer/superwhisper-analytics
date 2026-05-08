import type { ReactNode } from 'react'

interface WindowProps {
  children: ReactNode
}

/**
 * Outer shell. Fills the entire viewport with the window background colour.
 * Floating overlays (sidebar, right panels) are absolute-positioned children
 * inside this — they sit ON TOP of MainPane, never beside it.
 */
export function Window({ children }: WindowProps): React.JSX.Element {
  return <div className="relative h-screen w-screen overflow-hidden bg-window">{children}</div>
}
