import { useLayoutStore } from '@renderer/state/layoutStore'
import { Outlet, useLocation } from 'react-router-dom'
import { CommandPalette } from '../command-palette/CommandPalette'
import { Sidebar } from './Sidebar'
import { TopStrip } from './TopStrip'
import { Window } from './Window'

const SIDEBAR_GAP = 8 // gap to the right of the sidebar
const CONTENT_GUTTER = 24 // generous breathing on both sides of page content
const TOP_STRIP_H = 48 // px (h-12)

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
 * Root of the app. Layers:
 *   • Window     — full-screen, --window backdrop colour
 *   • TopStrip   — full-width, h-12, drag region, page title + controls
 *   • Sidebar    — floats below TopStrip on the left, gap-2 on three sides
 *   • Outlet     — page content fills the rest of the window
 *
 * Sidebar floats *below* TopStrip so the toggle on the left of the topbar
 * is always reachable, regardless of sidebar state. Generous gutters on
 * both sides of the content area keep things from feeling cramped.
 */
export function RootLayout(): React.JSX.Element {
  const sidebarOpen = useLayoutStore((s) => s.sidebarOpen)
  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth)
  const location = useLocation()

  const leftPad =
    (sidebarOpen ? sidebarWidth + SIDEBAR_GAP /* sidebar's own left-2 */ + SIDEBAR_GAP : 0) +
    CONTENT_GUTTER
  const onTranscripts =
    location.pathname === '/transcripts' || location.pathname === '/transcripts/'
  const title = titleFor(location.pathname)

  return (
    <Window>
      <TopStrip title={title} showSearch={onTranscripts} />
      <Sidebar />
      <main
        className="absolute inset-0 overflow-y-auto bg-background transition-[padding] duration-200 ease-out"
        style={{
          paddingTop: TOP_STRIP_H,
          paddingLeft: leftPad,
          paddingRight: CONTENT_GUTTER
        }}
      >
        <Outlet />
      </main>
      <CommandPalette />
    </Window>
  )
}
