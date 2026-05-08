import { useLayoutStore } from '@renderer/state/layoutStore'
import { Outlet, useLocation } from 'react-router-dom'
import { CommandPalette } from '../command-palette/CommandPalette'
import { Sidebar } from './Sidebar'
import { Titlebar } from './Titlebar'
import { Topbar } from './Topbar'
import { Window } from './Window'

const PANEL_GAP = 8
const CONTENT_BREATHING = 8

const TITLES: Record<string, string> = {
  '/': 'Overview',
  '/transcripts': 'Transcripts',
  '/usage': 'Usage',
  '/language': 'Language',
  '/settings': 'Settings'
}

function titleFor(pathname: string): string {
  if (pathname.startsWith('/transcripts/')) return 'Transcripts'
  return TITLES[pathname] ?? 'SuperWhisper'
}

/**
 * Root of the app. Renders the floating window with sidebar overlay,
 * titlebar (drag region + traffic-light reserve), topbar, then the
 * route's outlet. Layout store drives sidebar width + open state.
 */
export function RootLayout(): React.JSX.Element {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth)
  const location = useLocation()

  const leftPad = (sidebarOpen ? sidebarWidth + PANEL_GAP : 0) + CONTENT_BREATHING
  const onTranscripts =
    location.pathname.startsWith('/transcripts') && !location.pathname.includes('/transcripts/')
  const title = titleFor(location.pathname)

  return (
    <Window>
      <main className="absolute inset-0 flex flex-col overflow-hidden bg-floating">
        <Titlebar />
        <Topbar title={title} showSearch={onTranscripts} />
        <div
          className="relative flex-1 overflow-y-auto transition-[padding] duration-200 ease-out"
          style={{ paddingLeft: leftPad, paddingRight: CONTENT_BREATHING }}
        >
          <Outlet />
        </div>
      </main>
      <Sidebar />
      <CommandPalette />
    </Window>
  )
}
