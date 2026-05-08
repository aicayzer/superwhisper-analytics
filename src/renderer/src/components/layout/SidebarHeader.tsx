import { PanelLeft } from 'lucide-react'
import { useLayoutStore } from '@renderer/state/layoutStore'
import { PanelToggle } from './PanelToggle'

/**
 * Sits at the top of the Sidebar. Brand text + sidebar collapse.
 *
 * The pl-[88px] reserves room for the native macOS traffic lights inside
 * the floating sidebar, so the toggle aligns with their vertical centre.
 *
 * The space behind the toggle is also a drag region (covers the area
 * where native traffic lights sit).
 */
export function SidebarHeader(): React.JSX.Element {
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar)
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)

  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-2 pl-[88px] pr-2 [-webkit-app-region:drag]">
      <span className="select-none truncate text-[13px] font-semibold tracking-tight text-foreground">
        SuperWhisper
      </span>
      <PanelToggle
        icon={PanelLeft}
        active={sidebarOpen}
        onClick={toggleSidebar}
        label="Hide sidebar"
      />
    </div>
  )
}
