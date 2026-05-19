import { useConfigStore } from '@renderer/state/configStore'
import { useDataStore } from '@renderer/state/dataStore'
import { cn } from '@renderer/lib/cn'
import { relativeTime } from '@renderer/lib/format'
import { Folder, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SettingsCard } from './SettingsCard'
import { PathBar } from './parts/PathBar'

/**
 * General → Recordings folder.
 *
 *   Header   — title, subtitle, and the Reindex button in the top-right.
 *              The button doubles as the "last indexed" status surface:
 *              its label reads "Indexed Xm" / "Indexed just now" and a
 *              refresh icon sits to the right.
 *   Body     — path bar + one small stats line beneath. Stats render as
 *              "12k recordings · 279 hours of audio" with the numbers in
 *              foreground colour and the units in muted-foreground, so
 *              the eye picks up the figures first.
 *
 * No 18px chunky numbers, no duplicated indexed timestamp, no action
 * button floating beneath the stats.
 */
export function RecordingsFolderCard(): React.JSX.Element {
  const path = useConfigStore((s) => s.path)
  const isValid = useConfigStore((s) => s.isValid)
  const isInsideHome = useConfigStore((s) => s.isInsideHome)
  const setPath = useConfigStore((s) => s.setPath)
  const demoMode = useConfigStore((s) => s.demoMode)
  const setDemoMode = useConfigStore((s) => s.setDemoMode)
  const count = useDataStore((s) => s.count)
  const indexedAt = useDataStore((s) => s.indexedAt)
  const loading = useDataStore((s) => s.loading)
  const reindexing = useDataStore((s) => s.reindexing)
  const error = useDataStore((s) => s.error)
  const scanErrors = useDataStore((s) => s.scanErrors)
  const reindex = useDataStore((s) => s.reindex)
  const totalDurationSec = useDataStore((s) => s.aggregates.overview.totalDurationSec)

  // Tick once a minute so the "5m" string drifts naturally.
  const [, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  async function choose(): Promise<void> {
    const chosen = await window.api.dialog.pickFolder()
    if (!chosen) return
    // Order matters: persist the path first, THEN flip demo off. The
    // reverse briefly lands us in (!demoMode && !path) which fires the
    // welcome modal and produces a flash.
    await setPath(chosen)
    if (demoMode) await setDemoMode(false)
  }

  const busy = loading || reindexing
  const hours = formatNearestHours(totalDurationSec)
  const recordings = formatNearestK(count)
  const indexedRight = (() => {
    if (loading) return 'Scanning…'
    if (reindexing) return 'Reindexing…'
    if (!indexedAt) return 'Not yet indexed'
    return `Indexed ${relativeTime(indexedAt)}`
  })()

  const headerExtra = (
    <button
      type="button"
      onClick={() => void reindex()}
      disabled={!isValid || busy}
      title={isValid ? 'Reindex recordings' : 'Pick a valid folder first'}
      aria-label="Reindex recordings"
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors',
        'hover:bg-foreground/5 hover:text-foreground',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground'
      )}
    >
      <RefreshCw className={cn('h-3.5 w-3.5', reindexing && 'animate-spin')} strokeWidth={1.8} />
    </button>
  )

  return (
    <SettingsCard
      icon={Folder}
      title="Recordings folder"
      subtitle="Where SuperWhisper saves your transcripts."
      headerExtra={headerExtra}
    >
      <div className="space-y-1.5">
        <PathBar path={path} onChoose={() => void choose()} chooseLabel="Change folder" />
        <div className="flex items-center justify-between gap-3 px-1 text-[12px] text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">{recordings}</span> recordings ·{' '}
            <span className="font-medium text-foreground">{hours}</span> of audio
          </p>
          <p className="shrink-0">{indexedRight}</p>
        </div>
        {error && (
          <p className="pt-1 text-[12px] text-accent-orange" role="alert">
            {error}
          </p>
        )}
        {!error && scanErrors > 0 && (
          <p className="pt-1 text-[12px] text-accent-orange" role="status">
            {scanErrors} recording{scanErrors === 1 ? '' : 's'} failed to parse
          </p>
        )}
        {!error && path && !isInsideHome && (
          <p className="pt-1 text-[12px] text-accent-orange" role="status">
            Path outside home directory
          </p>
        )}
      </div>
    </SettingsCard>
  )
}

/**
 * Round count to the nearest thousand / million with zero decimals.
 * 4321 → "4k", 12671 → "13k", 1_240_000 → "1M".
 */
function formatNearestK(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`
  return `${Math.round(n / 1_000_000)}M`
}

/** Round seconds to the nearest whole hour with the "hours" suffix. */
function formatNearestHours(seconds: number): string {
  const h = Math.round(seconds / 3600)
  return h === 1 ? '1 hour' : `${h} hours`
}
