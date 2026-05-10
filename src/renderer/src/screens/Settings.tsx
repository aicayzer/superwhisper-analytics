import { Segmented } from '@renderer/components/Segmented'
import { cn } from '@renderer/lib/cn'
import { formatNumber } from '@renderer/lib/format'
import { useConfigStore } from '@renderer/state/configStore'
import { useDataStore } from '@renderer/state/dataStore'
import { useThemeStore, type ThemePref } from '@renderer/state/themeStore'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

const GITHUB_URL = 'https://github.com/aicayzer/superwhisper-analytics'

const APPEARANCE_OPTIONS: ReadonlyArray<{ value: ThemePref; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' }
]

/**
 * Settings page. Three sections, no boxed cards — sectioned by spacing
 * and headings only. Order:
 *   1. Recordings folder — path display, live status (count + last
 *      indexed), change/reset, reindex.
 *   2. Appearance — three-way Light / System / Dark toggle.
 *   3. About — name, version, GitHub link, licence.
 */
export function Settings(): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 py-2">
      <RecordingsSection />
      <AppearanceSection />
      <AboutSection />
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  )
}

function RecordingsSection(): React.JSX.Element {
  const path = useConfigStore((s) => s.path)
  const isValid = useConfigStore((s) => s.isValid)
  const defaultPath = useConfigStore((s) => s.defaultPath)
  const setPath = useConfigStore((s) => s.setPath)
  const count = useDataStore((s) => s.count)
  const indexedAt = useDataStore((s) => s.indexedAt)
  const loading = useDataStore((s) => s.loading)
  const reindexing = useDataStore((s) => s.reindexing)
  const reindex = useDataStore((s) => s.reindex)

  async function choose(): Promise<void> {
    const chosen = await window.api.dialog.pickFolder()
    if (chosen) await setPath(chosen)
  }

  async function reset(): Promise<void> {
    if (defaultPath) await setPath(defaultPath)
  }

  const canReset = defaultPath !== null && defaultPath !== path
  const busy = loading || reindexing

  return (
    <section>
      <SectionHeading>Recordings folder</SectionHeading>
      <div className="space-y-3">
        <p
          className="break-all rounded-md bg-foreground/[0.04] px-3 py-2 font-mono text-[12px] leading-relaxed text-muted-foreground"
          title={path ?? 'No folder selected'}
        >
          {path ?? 'No folder selected'}
        </p>
        <div className="flex items-center gap-2">
          <span
            className={cn('h-1.5 w-1.5 rounded-full', isValid ? 'bg-emerald-500' : 'bg-red-500')}
            aria-hidden
          />
          <StatusText
            isValid={isValid}
            count={count}
            indexedAt={indexedAt}
            loading={loading}
            reindexing={reindexing}
          />
          <div className="flex-1" />
          <button type="button" onClick={reset} disabled={!canReset} className={CHROME_BUTTON}>
            Reset to default
          </button>
          <button type="button" onClick={choose} className={CHROME_BUTTON}>
            Choose folder…
          </button>
          <button
            type="button"
            onClick={() => void reindex()}
            disabled={!isValid || busy}
            title={isValid ? 'Rescan the recordings folder' : 'Pick a valid folder first'}
            className={CHROME_BUTTON}
          >
            <RefreshCw className={cn('h-3 w-3', reindexing && 'animate-spin')} strokeWidth={1.8} />
            {reindexing ? 'Reindexing…' : 'Reindex'}
          </button>
        </div>
      </div>
    </section>
  )
}

/** Status copy live-updates so 'last indexed 12s ago' becomes '13s ago' etc. */
function StatusText({
  isValid,
  count,
  indexedAt,
  loading,
  reindexing
}: {
  isValid: boolean
  count: number
  indexedAt: string | null
  loading: boolean
  reindexing: boolean
}): React.JSX.Element {
  // Tick every 10s while we have a fresh indexedAt — the relative-time
  // string drifts slowly, so this is plenty.
  const [, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!indexedAt) return undefined
    const t = window.setInterval(() => setNow(Date.now()), 10_000)
    return () => window.clearInterval(t)
  }, [indexedAt])

  let text: string
  if (!isValid) {
    text = 'Path not found'
  } else if (loading) {
    text = 'Scanning…'
  } else if (reindexing) {
    text = 'Reindexing…'
  } else if (indexedAt) {
    text = `${formatNumber(count)} recording${count === 1 ? '' : 's'} · last indexed ${relativeTime(indexedAt)}`
  } else {
    text = 'Path valid'
  }
  return <span className="text-[12.5px] text-muted-foreground">{text}</span>
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (isNaN(t)) return ''
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (diffSec < 30) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffD = Math.floor(diffHr / 24)
  return `${diffD}d ago`
}

/**
 * Shared chrome-button styling for the Settings action row. h-7 to match
 * IconButton/RangePill, ghost-bordered floating surface, hover lift.
 */
const CHROME_BUTTON =
  'inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-floating px-3 text-[12px] text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-floating'

function AppearanceSection(): React.JSX.Element {
  const pref = useThemeStore((s) => s.pref)
  const setPref = useThemeStore((s) => s.setPref)

  return (
    <section>
      <SectionHeading>Appearance</SectionHeading>
      <Segmented value={pref} onChange={setPref} options={APPEARANCE_OPTIONS} ariaLabel="Theme" />
    </section>
  )
}

function AboutSection(): React.JSX.Element {
  function openGithub(): void {
    void window.api.openExternal(GITHUB_URL)
  }

  return (
    <section>
      <SectionHeading>About</SectionHeading>
      <div className="space-y-1.5 text-[13px]">
        <div className="text-foreground">
          SuperWhisper Analytics <span className="text-muted-foreground">v{__APP_VERSION__}</span>
        </div>
        <button
          type="button"
          onClick={openGithub}
          className="inline-flex items-center gap-1.5 text-accent-blue hover:underline"
        >
          View on GitHub
          <ExternalLink className="h-3 w-3" strokeWidth={1.8} />
        </button>
        <p className="text-[12.5px] text-muted-foreground">MIT licensed.</p>
      </div>
    </section>
  )
}
