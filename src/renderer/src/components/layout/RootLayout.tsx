import { useLayoutStore } from '@renderer/state/layoutStore'
import { chartBreadcrumb } from '@renderer/screens/chartRegistry'
import { Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { CommandPalette } from '../command-palette/CommandPalette'
import { MainHeader, type Breadcrumb } from './MainHeader'
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
  const [params] = useSearchParams()

  const leftPad =
    (sidebarOpen ? sidebarWidth + SIDEBAR_GAP /* sidebar's own left-2 */ + SIDEBAR_GAP : 0) +
    CONTENT_GUTTER
  const onTranscripts =
    location.pathname === '/transcripts' || location.pathname === '/transcripts/'

  // /chart/:slug renders a breadcrumb instead of a plain title; backTo
  // points at the screen the chart was launched from when supplied.
  const chartMatch = location.pathname.match(/^\/chart\/([^/]+)/)
  const chartCrumb = chartMatch ? chartBreadcrumb(chartMatch[1]) : null
  const fromParam = params.get('from')
  const backTo = chartCrumb
    ? fromParam
      ? decodeURIComponent(fromParam)
      : chartCrumb.sectionPath
    : undefined
  const title: string | Breadcrumb[] = chartCrumb
    ? [{ label: chartCrumb.section, to: chartCrumb.sectionPath }, { label: chartCrumb.title }]
    : titleFor(location.pathname)

  return (
    <Window>
      <Sidebar />
      <MainHeader title={title} showSearch={onTranscripts} backTo={backTo} />
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
