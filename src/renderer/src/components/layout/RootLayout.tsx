import { useLayoutStore } from '@renderer/state/layoutStore'
import { Outlet, useLocation } from 'react-router-dom'
import { CommandPalette } from '../command-palette/CommandPalette'
import { MainHeader } from './MainHeader'
import { Sidebar } from './Sidebar'
import { Window } from './Window'

const SIDEBAR_GAP = 8
const CONTENT_GUTTER = 24
const HEADER_TOP = 8 // sidebar + header both at top-2
const HEADER_H = 36

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
 * Root of the app. Layers (z-order):
 *   • Window     — full-screen, --window backdrop
 *   • main       — fills the right-of-sidebar area; scroll happens here
 *   • Sidebar    — floats at top-2 left-2 bottom-2, hosts traffic lights and toggle
 *   • MainHeader — overlays the top of the main area; hosts breadcrumb + range
 *
 * The header and sidebar both start at top-2 and are 36px tall, so the
 * traffic lights (Electron-native at y=18) sit visually inside whichever
 * surface is to their right (sidebar when open, header when closed).
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
      <Sidebar />
      <MainHeader title={title} showSearch={onTranscripts} />
      <main
        className="absolute inset-0 overflow-y-auto bg-background transition-[padding] duration-200 ease-out"
        style={{
          paddingTop: HEADER_TOP + HEADER_H + 8, // header bottom + 8px gap to content
          paddingLeft: leftPad,
          paddingRight: CONTENT_GUTTER,
          paddingBottom: 16
        }}
      >
        <Outlet />
      </main>
      <CommandPalette />
    </Window>
  )
}
