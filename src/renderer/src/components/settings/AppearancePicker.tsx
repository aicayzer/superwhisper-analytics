import { cn } from '@renderer/lib/cn'
import { useThemeStore, type ThemePref } from '@renderer/state/themeStore'

/**
 * Three large preview cards (Light / System / Dark) — each a tiny mock
 * of the app showing the kind of contrast the theme produces. The active
 * card gets a blue ring to mirror the design.
 *
 * Previews are hand-drawn SVGs rather than real screenshots — fewer
 * assets to maintain, and they read clearly at the preview size.
 */
export function AppearancePicker(): React.JSX.Element {
  const pref = useThemeStore((s) => s.pref)
  const setPref = useThemeStore((s) => s.setPref)
  return (
    <div className="grid grid-cols-3 gap-3">
      <PreviewTile pref="light" active={pref === 'light'} onSelect={setPref} />
      <PreviewTile pref="system" active={pref === 'system'} onSelect={setPref} />
      <PreviewTile pref="dark" active={pref === 'dark'} onSelect={setPref} />
    </div>
  )
}

const LABELS: Record<ThemePref, string> = {
  light: 'Light',
  system: 'System',
  dark: 'Dark'
}

interface PreviewTileProps {
  pref: ThemePref
  active: boolean
  onSelect: (pref: ThemePref) => void
}

function PreviewTile({ pref, active, onSelect }: PreviewTileProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onSelect(pref)}
      aria-pressed={active}
      className={cn(
        'flex flex-col items-stretch overflow-hidden rounded-lg border bg-card text-left transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        active
          ? 'border-accent-blue ring-1 ring-accent-blue'
          : 'border-border hover:border-foreground/20'
      )}
    >
      <div className="border-b border-border bg-foreground/[0.02] p-3">
        <PreviewMock pref={pref} />
      </div>
      <div className="px-3 py-2 text-[12.5px] font-medium text-foreground">{LABELS[pref]}</div>
    </button>
  )
}

/**
 * Tiny app-screenshot mockup. Three rectangles — sidebar, header,
 * content — tinted to match the theme being previewed. Half-and-half
 * split for "System" so it visibly suggests "follows OS".
 */
function PreviewMock({ pref }: { pref: ThemePref }): React.JSX.Element {
  const palettes = {
    light: {
      bg: '#fafaf9',
      sidebar: '#f3f3f1',
      lineStrong: '#1f1f1f',
      lineMuted: '#bdbcb6'
    },
    dark: {
      bg: '#1c1c1c',
      sidebar: '#2a2a2a',
      lineStrong: '#fafafa',
      lineMuted: '#5d5d5b'
    }
  } as const
  if (pref === 'system') {
    return (
      <svg viewBox="0 0 100 56" className="block h-12 w-full" aria-hidden>
        <PreviewBody palette={palettes.light} side="left" />
        <PreviewBody palette={palettes.dark} side="right" />
      </svg>
    )
  }
  const palette = palettes[pref]
  return (
    <svg viewBox="0 0 100 56" className="block h-12 w-full" aria-hidden>
      <PreviewBody palette={palette} />
    </svg>
  )
}

function PreviewBody({
  palette,
  side = 'full'
}: {
  palette: { bg: string; sidebar: string; lineStrong: string; lineMuted: string }
  side?: 'left' | 'right' | 'full'
}): React.JSX.Element {
  const x = side === 'right' ? 50 : 0
  const w = side === 'full' ? 100 : 50
  const sidebarW = side === 'full' ? 18 : side === 'right' ? 0 : 14
  const sidebarX = side === 'right' ? 50 : 0
  const contentX = side === 'right' ? 54 : 22
  const wide = side === 'full'
  return (
    <g>
      <rect x={x} y={0} width={w} height={56} fill={palette.bg} />
      <rect x={sidebarX} y={0} width={sidebarW} height={56} fill={palette.sidebar} />
      <rect
        x={contentX}
        y={10}
        width={wide ? 32 : 14}
        height={3}
        rx={1}
        fill={palette.lineStrong}
      />
      <rect x={contentX} y={20} width={wide ? 48 : 28} height={2} rx={1} fill={palette.lineMuted} />
      <rect x={contentX} y={26} width={wide ? 40 : 22} height={2} rx={1} fill={palette.lineMuted} />
      <rect x={contentX} y={32} width={wide ? 44 : 24} height={2} rx={1} fill={palette.lineMuted} />
    </g>
  )
}
