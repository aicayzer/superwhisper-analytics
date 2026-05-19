import { cn } from '@renderer/lib/cn'
import { relativeTime } from '@renderer/lib/format'
import { useMymeStore } from '@renderer/state/mymeStore'
import { CircleAlert, CloudUpload, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CHROME_BUTTON_PRIMARY } from './parts/chromeButton'

/**
 * Sticky footer on the Sync tab. Left side shows "Synced Xm ago" (or
 * the last error). Right side is the single primary Sync button.
 *
 * Single button by design — the split-button Claude Design proposed
 * (Sync / Dry run / Re-sync everything) over-engineers a control most
 * users press once. Dry-run is a developer affordance that can land
 * later if it earns its place.
 */
export function SyncActionBar(): React.JSX.Element {
  const status = useMymeStore((s) => s.status)
  const syncNow = useMymeStore((s) => s.syncNow)
  const [, setNow] = useState(() => Date.now())

  // Tick once a minute so the relative time drifts.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const syncing = status?.kind === 'syncing'
  const lastSyncedAt = status?.kind === 'connected' ? status.lastSyncedAt : null
  const lastError = status?.kind === 'connected' ? status.lastError : null
  const disabled = !status || status.kind === 'disconnected' || syncing

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-foreground/[0.025] px-4 py-2.5'
      )}
    >
      <div className="min-w-0 flex-1">
        {lastError ? (
          <span
            className="inline-flex items-baseline gap-2 truncate text-[12.5px] text-accent-orange"
            title={lastError}
          >
            <CircleAlert className="h-3 w-3 shrink-0" strokeWidth={1.8} />
            <span className="truncate">Last sync failed — {lastError}</span>
          </span>
        ) : syncing ? (
          <span className="inline-flex items-baseline gap-2 text-[12.5px] text-muted-foreground">
            <Loader2 className="h-3 w-3 shrink-0 animate-spin" strokeWidth={1.8} />
            Syncing…
          </span>
        ) : lastSyncedAt ? (
          <span className="text-[12.5px] text-muted-foreground">
            Synced{' '}
            <strong className="font-medium text-foreground">{relativeTime(lastSyncedAt)}</strong>
          </span>
        ) : (
          <span className="text-[12.5px] text-muted-foreground">Not synced yet</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => void syncNow()}
        disabled={disabled}
        className={CHROME_BUTTON_PRIMARY}
      >
        {!syncing && <CloudUpload className="h-3.5 w-3.5" strokeWidth={1.7} />}
        {syncing ? 'Syncing…' : lastError ? 'Retry sync' : 'Sync'}
      </button>
    </div>
  )
}
